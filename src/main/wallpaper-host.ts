import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { BrowserWindow } from "electron";
import type { AppLogger } from "./logger.js";

const execFileAsync = promisify(execFile);

export interface WallpaperAttachResult {
  attached: boolean;
  childHwnd: string;
  parentHwnd?: string;
  parentKind?: "WorkerW" | "Progman";
  error?: string;
}

export class WallpaperHost {
  constructor(private readonly logger: AppLogger) {}

  async attachToDesktop(window: BrowserWindow): Promise<WallpaperAttachResult> {
    if (process.platform !== "win32") {
      const result: WallpaperAttachResult = {
        attached: false,
        childHwnd: "0",
        error: `Desktop wallpaper host is not supported on ${process.platform}`
      };
      this.logger.warn("app", "wallpaper host attach skipped", result);
      return result;
    }

    const childHwnd = this.readNativeWindowHandle(window);
    const script = this.createAttachScript(childHwnd);

    try {
      const { stdout, stderr } = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
        {
          encoding: "utf8",
          timeout: 8000,
          windowsHide: true,
          maxBuffer: 1024 * 1024
        }
      );

      if (stderr.trim().length > 0) {
        this.logger.warn("app", "wallpaper host attach stderr", { stderr: stderr.trim() });
      }

      const parsed = JSON.parse(stdout.trim()) as WallpaperAttachResult;
      this.logger.info("app", "wallpaper host attach result", parsed);
      return parsed;
    } catch (error) {
      const result: WallpaperAttachResult = {
        attached: false,
        childHwnd: childHwnd.toString(),
        error: this.summarizeError(error)
      };
      this.logger.error("error", "wallpaper host attach failed", result);
      return result;
    }
  }

  private readNativeWindowHandle(window: BrowserWindow): bigint {
    const handle = window.getNativeWindowHandle();
    if (handle.byteLength >= 8) {
      return handle.readBigUInt64LE(0);
    }

    return BigInt(handle.readUInt32LE(0));
  }

  private summarizeError(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    const meaningfulLines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => !line.includes("[DllImport"))
      .filter((line) => !line.includes("public static"))
      .filter((line) => !line.includes("using System"))
      .filter((line) => !line.startsWith("$"))
      .slice(-6);

    return meaningfulLines.join(" | ").slice(0, 800) || raw.slice(0, 800);
  }

  private createAttachScript(childHwnd: bigint): string {
    return `
$ErrorActionPreference = 'Stop'
$ChildHwnd = [UInt64]${childHwnd.toString()}
Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class ProjectDUser32 {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern IntPtr FindWindowEx(IntPtr parent, IntPtr childAfter, string className, string windowName);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@

$progman = [ProjectDUser32]::FindWindow("Progman", $null)
if ($progman -eq [IntPtr]::Zero) {
  $progman = [ProjectDUser32]::FindWindow("Progman", "Program Manager")
}
if ($progman -eq [IntPtr]::Zero) {
  throw "Progman window was not found"
}

$messageResult = [IntPtr]::Zero
[ProjectDUser32]::SendMessageTimeout($progman, 0x052C, [IntPtr]::Zero, [IntPtr]::Zero, 0, 1000, [ref]$messageResult) | Out-Null
Start-Sleep -Milliseconds 250

$script:parent = [IntPtr]::Zero
$script:parentKind = "Progman"

$workerAfterProgman = [ProjectDUser32]::FindWindowEx([IntPtr]::Zero, $progman, "WorkerW", $null)
if ($workerAfterProgman -ne [IntPtr]::Zero) {
  $script:parent = $workerAfterProgman
  $script:parentKind = "WorkerW"
}

$callback = [ProjectDUser32+EnumWindowsProc]{
  param([IntPtr]$topWindow, [IntPtr]$lParam)
  if ($script:parentKind -eq "WorkerW") {
    return $false
  }
  $defView = [ProjectDUser32]::FindWindowEx($topWindow, [IntPtr]::Zero, "SHELLDLL_DefView", $null)
  if ($defView -ne [IntPtr]::Zero) {
    $worker = [ProjectDUser32]::FindWindowEx([IntPtr]::Zero, $topWindow, "WorkerW", $null)
    if ($worker -ne [IntPtr]::Zero) {
      $script:parent = $worker
      $script:parentKind = "WorkerW"
      return $false
    }
  }
  return $true
}

[ProjectDUser32]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null

if ($script:parent -eq [IntPtr]::Zero) {
  $script:parent = $progman
}

$child = [IntPtr]::new([Int64]$ChildHwnd)
$previous = [ProjectDUser32]::SetParent($child, $script:parent)
if ($previous -eq [IntPtr]::Zero -and [Runtime.InteropServices.Marshal]::GetLastWin32Error() -ne 0) {
  throw "SetParent failed with Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
}

[ProjectDUser32]::SetWindowPos($child, [IntPtr]::Zero, 0, 0, 0, 0, 0x0010 -bor 0x0001 -bor 0x0002 -bor 0x0040) | Out-Null

[pscustomobject]@{
  attached = $true
  childHwnd = $ChildHwnd.ToString()
  parentHwnd = $script:parent.ToInt64().ToString()
  parentKind = $script:parentKind
} | ConvertTo-Json -Compress
`;
  }
}

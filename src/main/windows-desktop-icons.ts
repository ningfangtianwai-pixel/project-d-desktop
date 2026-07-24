import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { buildWindowsTaskbarSyncScript } from "./windows-taskbar.js";

const execFileAsync = promisify(execFile);
const POWERSHELL_TIMEOUT_MS = 12_000;

export interface WindowsDesktopIconState {
  visible: boolean;
  iconCount: number;
  shellViewHandle: number;
  listViewHandle: number;
}

export async function setWindowsDesktopIconsVisible(visible: boolean): Promise<WindowsDesktopIconState> {
  if (process.platform !== "win32") {
    return { visible: true, iconCount: 0, shellViewHandle: 0, listViewHandle: 0 };
  }

  const { stdout } = await execFileAsync("powershell.exe", powershellArguments(buildDesktopIconSyncScript(visible)), {
    encoding: "utf8",
    windowsHide: true,
    timeout: POWERSHELL_TIMEOUT_MS,
    maxBuffer: 32 * 1024
  });
  const state = parseDesktopIconState(stdout);
  if (state.visible !== visible) {
    throw new Error(`Explorer desktop icon visibility did not change to ${visible ? "visible" : "hidden"}`);
  }
  return state;
}

export async function probeWindowsDesktopIcons(): Promise<WindowsDesktopIconState> {
  if (process.platform !== "win32") {
    return { visible: true, iconCount: 0, shellViewHandle: 0, listViewHandle: 0 };
  }
  const { stdout } = await execFileAsync("powershell.exe", powershellArguments(buildDesktopIconProbeScript()), {
    encoding: "utf8",
    windowsHide: true,
    timeout: POWERSHELL_TIMEOUT_MS,
    maxBuffer: 32 * 1024
  });
  return parseDesktopIconState(stdout);
}

export async function startDesktopIconRecoveryWatchdog(parentProcessId = process.pid): Promise<number> {
  if (process.platform !== "win32") return 0;
  const watchdogScript = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    `Wait-Process -Id ${Math.max(0, Math.floor(parentProcessId))} -ErrorAction SilentlyContinue`,
    "Start-Sleep -Milliseconds 500",
    buildDesktopIconSyncScript(true, 12),
    buildWindowsTaskbarSyncScript(true)
  ].join("\n");
  const child = spawn("powershell.exe", powershellArguments(watchdogScript), {
    windowsHide: true,
    detached: true,
    stdio: "ignore"
  });
  child.unref();
  const watchdogProcessId = child.pid ?? 0;
  if (!Number.isInteger(watchdogProcessId) || watchdogProcessId <= 0) {
    throw new Error("Desktop icon recovery watchdog did not start");
  }
  return watchdogProcessId;
}

export function createDesktopIconRecoveryBatch(): string {
  const encoded = encodePowerShell([
    buildDesktopIconSyncScript(true),
    buildWindowsTaskbarSyncScript(true)
  ].join("\n"));
  return [
    "@echo off",
    `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`,
    "if errorlevel 1 (",
    "  echo Project D desktop recovery failed.",
    "  pause",
    "  exit /b 1",
    ")",
    "echo Project D desktop recovery completed.",
    "pause"
  ].join("\r\n");
}

export function buildDesktopIconSyncScript(visible: boolean, attempts = 1): string {
  return buildDesktopIconScript(visible, attempts);
}

export function buildDesktopIconProbeScript(): string {
  return buildDesktopIconScript(null, 1);
}

function buildDesktopIconScript(visible: boolean | null, attempts: number): string {
  const desired = visible === null ? "$null" : visible ? "$true" : "$false";
  const boundedAttempts = Math.max(1, Math.min(12, Math.floor(attempts)));
  const registryUpdate = visible === null
    ? ""
    : `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name HideIcons -Type DWord -Value ${visible ? 0 : 1}`;
  return `
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class ProjectDDesktopIcons {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindow(string cls, string title);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string cls, string title);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll", CharSet=CharSet.Auto, SetLastError=true)] public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);
  public static IntPtr SendMessageSafe(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam) {
    IntPtr result;
    IntPtr succeeded = SendMessageTimeout(hWnd, msg, wParam, lParam, 0x0002, 1000, out result);
    if (succeeded == IntPtr.Zero) throw new InvalidOperationException("Explorer desktop window did not respond in time");
    return result;
  }
  public static IntPtr FindDesktopView() {
    IntPtr progman = FindWindow("Progman", null);
    IntPtr view = FindWindowEx(progman, IntPtr.Zero, "SHELLDLL_DefView", null);
    if (view != IntPtr.Zero) return view;
    IntPtr found = IntPtr.Zero;
    EnumWindows((top, param) => {
      IntPtr candidate = FindWindowEx(top, IntPtr.Zero, "SHELLDLL_DefView", null);
      if (candidate != IntPtr.Zero) { found = candidate; return false; }
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
"@
$desired = ${desired}
$state = $null
$lastError = ''
for ($attempt = 1; $attempt -le ${boundedAttempts}; $attempt++) {
  try {
    $view = [ProjectDDesktopIcons]::FindDesktopView()
    if ($view -eq [IntPtr]::Zero) { throw 'Explorer desktop view was not found' }
    $list = [ProjectDDesktopIcons]::FindWindowEx($view, [IntPtr]::Zero, 'SysListView32', 'FolderView')
    if ($list -eq [IntPtr]::Zero) { throw 'Explorer desktop icon list was not found' }
    $before = [ProjectDDesktopIcons]::IsWindowVisible($list)
    if ($null -ne $desired -and $before -ne $desired) {
      [void][ProjectDDesktopIcons]::SendMessageSafe($view, 0x0111, [IntPtr]0x7402, [IntPtr]::Zero)
      Start-Sleep -Milliseconds 250
    }
    ${registryUpdate}
    $after = [ProjectDDesktopIcons]::IsWindowVisible($list)
    $count = -1
    try {
      $count = [ProjectDDesktopIcons]::SendMessageSafe($list, 0x1004, [IntPtr]::Zero, [IntPtr]::Zero).ToInt64()
    } catch {
      if ($null -eq $desired) { throw }
    }
    $state = [pscustomobject]@{
      visible = $after
      iconCount = $count
      shellViewHandle = $view.ToInt64()
      listViewHandle = $list.ToInt64()
    }
    if ($null -eq $desired -or $after -eq $desired) { break }
    $lastError = "Explorer desktop icon visibility did not change to $desired"
  } catch {
    $lastError = $_.Exception.Message
  }
  if ($attempt -lt ${boundedAttempts}) { Start-Sleep -Seconds 1 }
}
if ($null -eq $state -or ($null -ne $desired -and $state.visible -ne $desired)) {
  throw "Desktop icon recovery watchdog exhausted retries: $lastError"
}
$state | ConvertTo-Json -Compress
`.trim();
}

function powershellArguments(script: string): string[] {
  return ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodePowerShell(script)];
}

function encodePowerShell(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

function parseDesktopIconState(output: string): WindowsDesktopIconState {
  const line = output.trim().split(/\r?\n/).filter(Boolean).at(-1);
  if (!line) throw new Error("Explorer desktop icon probe returned no state");
  const parsed = JSON.parse(line) as Partial<WindowsDesktopIconState>;
  if (typeof parsed.visible !== "boolean" || typeof parsed.iconCount !== "number") {
    throw new Error("Explorer desktop icon probe returned invalid state");
  }
  return {
    visible: parsed.visible,
    iconCount: parsed.iconCount,
    shellViewHandle: Number(parsed.shellViewHandle ?? 0),
    listViewHandle: Number(parsed.listViewHandle ?? 0)
  };
}

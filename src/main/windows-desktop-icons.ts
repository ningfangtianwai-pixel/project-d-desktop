import { execFile } from "node:child_process";
import { promisify } from "node:util";

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
    buildDesktopIconSyncScript(true)
  ].join("\n");
  const watchdogCommand = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encodePowerShell(watchdogScript)}`;
  const launcherScript = [
    "$ErrorActionPreference = 'Stop'",
    `$result = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '${watchdogCommand}' }`,
    "if ($result.ReturnValue -ne 0) { throw \"WMI process creation failed: $($result.ReturnValue)\" }",
    "[Console]::Write($result.ProcessId)"
  ].join("\n");
  const { stdout } = await execFileAsync("powershell.exe", powershellArguments(launcherScript), {
    encoding: "utf8",
    windowsHide: true,
    timeout: POWERSHELL_TIMEOUT_MS,
    maxBuffer: 16 * 1024
  });
  const watchdogProcessId = Number.parseInt(stdout.trim(), 10);
  if (!Number.isInteger(watchdogProcessId) || watchdogProcessId <= 0) {
    throw new Error("Desktop icon recovery watchdog did not start");
  }
  return watchdogProcessId;
}

export function createDesktopIconRecoveryBatch(): string {
  const encoded = encodePowerShell(buildDesktopIconSyncScript(true));
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

export function buildDesktopIconSyncScript(visible: boolean): string {
  return buildDesktopIconScript(visible);
}

export function buildDesktopIconProbeScript(): string {
  return buildDesktopIconScript(null);
}

function buildDesktopIconScript(visible: boolean | null): string {
  const desired = visible === null ? "$null" : visible ? "$true" : "$false";
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
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern IntPtr SendMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
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
$view = [ProjectDDesktopIcons]::FindDesktopView()
if ($view -eq [IntPtr]::Zero) { throw 'Explorer desktop view was not found' }
$list = [ProjectDDesktopIcons]::FindWindowEx($view, [IntPtr]::Zero, 'SysListView32', 'FolderView')
if ($list -eq [IntPtr]::Zero) { throw 'Explorer desktop icon list was not found' }
$before = [ProjectDDesktopIcons]::IsWindowVisible($list)
if ($null -ne $desired -and $before -ne $desired) {
  [void][ProjectDDesktopIcons]::SendMessage($view, 0x0111, [IntPtr]0x7402, [IntPtr]::Zero)
  Start-Sleep -Milliseconds 250
}
${registryUpdate}
$after = [ProjectDDesktopIcons]::IsWindowVisible($list)
$count = [ProjectDDesktopIcons]::SendMessage($list, 0x1004, [IntPtr]::Zero, [IntPtr]::Zero).ToInt64()
[pscustomobject]@{
  visible = $after
  iconCount = $count
  shellViewHandle = $view.ToInt64()
  listViewHandle = $list.ToInt64()
} | ConvertTo-Json -Compress
if ($null -ne $desired -and $after -ne $desired) { exit 5 }
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

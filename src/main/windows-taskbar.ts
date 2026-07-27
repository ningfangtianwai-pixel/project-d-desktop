import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const POWERSHELL_TIMEOUT_MS = 8_000;

export interface WindowsTaskbarState {
  visible: boolean;
  taskbarCount: number;
}

export async function setWindowsTaskbarVisible(visible: boolean): Promise<WindowsTaskbarState> {
  if (process.platform !== "win32") return { visible: true, taskbarCount: 0 };
  const { stdout } = await execFileAsync("powershell.exe", powershellArguments(buildWindowsTaskbarSyncScript(visible, 8)), {
    encoding: "utf8",
    windowsHide: true,
    timeout: POWERSHELL_TIMEOUT_MS,
    maxBuffer: 16 * 1024
  });
  const state = parseTaskbarState(stdout);
  if (state.visible !== visible) {
    throw new Error(`Windows taskbar visibility did not change to ${visible ? "visible" : "hidden"}`);
  }
  return state;
}

export async function probeWindowsTaskbar(): Promise<WindowsTaskbarState> {
  if (process.platform !== "win32") return { visible: true, taskbarCount: 0 };
  const { stdout } = await execFileAsync("powershell.exe", powershellArguments(buildWindowsTaskbarSyncScript(null)), {
    encoding: "utf8",
    windowsHide: true,
    timeout: POWERSHELL_TIMEOUT_MS,
    maxBuffer: 16 * 1024
  });
  return parseTaskbarState(stdout);
}

export function buildWindowsTaskbarSyncScript(visible: boolean | null, attempts = 1): string {
  const desired = visible === null ? "$null" : visible ? "$true" : "$false";
  const boundedAttempts = Math.max(1, Math.min(12, Math.floor(attempts)));
  return `
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class ProjectDTaskbar {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindow(string cls, string title);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder cls, int max);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int command);
  public static IntPtr[] FindTaskbars() {
    List<IntPtr> result = new List<IntPtr>();
    EnumWindows((window, state) => {
      var name = new System.Text.StringBuilder(128);
      GetClassName(window, name, name.Capacity);
      if (name.ToString() == "Shell_TrayWnd" || name.ToString() == "Shell_SecondaryTrayWnd") result.Add(window);
      return true;
    }, IntPtr.Zero);
    return result.ToArray();
  }
}
"@
$desired = ${desired}
$state = $null
$lastError = ''
for ($attempt = 1; $attempt -le ${boundedAttempts}; $attempt++) {
  try {
    $bars = [ProjectDTaskbar]::FindTaskbars()
    if ($bars.Count -eq 0) { throw 'Windows taskbar windows were not found' }
    if ($null -ne $desired) {
      $command = if ($desired) { 5 } else { 0 }
      foreach ($bar in $bars) { [void][ProjectDTaskbar]::ShowWindowAsync($bar, $command) }
      Start-Sleep -Milliseconds 250
    }
    $primary = [ProjectDTaskbar]::FindWindow('Shell_TrayWnd', $null)
    $isVisible = $primary -ne [IntPtr]::Zero -and [ProjectDTaskbar]::IsWindowVisible($primary)
    $state = [pscustomobject]@{ visible = $isVisible; taskbarCount = $bars.Count }
    if ($null -eq $desired -or $isVisible -eq $desired) { break }
    $lastError = "Windows taskbar visibility did not change to $desired"
  } catch {
    $lastError = $_.Exception.Message
  }
  if ($attempt -lt ${boundedAttempts}) { Start-Sleep -Milliseconds 500 }
}
if ($null -eq $state -or ($null -ne $desired -and $state.visible -ne $desired)) {
  throw "Windows taskbar recovery exhausted retries: $lastError"
}
$state | ConvertTo-Json -Compress
`.trim();
}

function powershellArguments(script: string): string[] {
  return ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")];
}

function parseTaskbarState(output: string): WindowsTaskbarState {
  const line = output.trim().split(/\r?\n/).filter(Boolean).at(-1);
  if (!line) throw new Error("Windows taskbar probe returned no state");
  const parsed = JSON.parse(line) as Partial<WindowsTaskbarState>;
  if (typeof parsed.visible !== "boolean" || typeof parsed.taskbarCount !== "number") {
    throw new Error("Windows taskbar probe returned invalid state");
  }
  return { visible: parsed.visible, taskbarCount: parsed.taskbarCount };
}

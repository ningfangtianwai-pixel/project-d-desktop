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
  const { stdout } = await execFileAsync("powershell.exe", powershellArguments(buildWindowsTaskbarSyncScript(visible)), {
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

export function buildWindowsTaskbarSyncScript(visible: boolean | null): string {
  const desired = visible === null ? "$null" : visible ? "$true" : "$false";
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
$bars = [ProjectDTaskbar]::FindTaskbars()
if ($bars.Count -eq 0) { throw 'Windows taskbar windows were not found' }
if ($null -ne $desired) {
  $command = if ($desired) { 5 } else { 0 }
  foreach ($bar in $bars) { [void][ProjectDTaskbar]::ShowWindowAsync($bar, $command) }
  Start-Sleep -Milliseconds 180
}
$primary = [ProjectDTaskbar]::FindWindow('Shell_TrayWnd', $null)
$isVisible = $primary -ne [IntPtr]::Zero -and [ProjectDTaskbar]::IsWindowVisible($primary)
[pscustomobject]@{ visible = $isVisible; taskbarCount = $bars.Count } | ConvertTo-Json -Compress
if ($null -ne $desired -and $isVisible -ne $desired) { exit 5 }
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

import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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

export interface DesktopIconRecoveryGuardOptions {
  isHiddenAllowed: () => boolean;
  probe: () => Promise<WindowsDesktopIconState>;
  restore: () => Promise<WindowsDesktopIconState | void>;
  onError?: (error: unknown) => void;
  intervalMs?: number;
}

/**
 * Repairs a desktop icon state that Project D does not own.  This covers
 * renderer failures and stale native state while the main process is still
 * alive; the detached watchdog covers the separate force-kill case.
 */
export class DesktopIconRecoveryGuard {
  private timer: NodeJS.Timeout | null = null;
  private checkInFlight = false;

  constructor(private readonly options: DesktopIconRecoveryGuardOptions) {}

  start(): void {
    if (this.timer) return;
    const intervalMs = Math.max(1_000, this.options.intervalMs ?? 2_000);
    this.timer = setInterval(() => void this.check(), intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.checkInFlight = false;
  }

  private async check(): Promise<void> {
    if (this.checkInFlight || this.options.isHiddenAllowed()) return;
    this.checkInFlight = true;
    try {
      const state = await this.options.probe();
      if (!state.visible && !this.options.isHiddenAllowed()) await this.options.restore();
    } catch (error) {
      this.options.onError?.(error);
    } finally {
      this.checkInFlight = false;
    }
  }
}

export async function setWindowsDesktopIconsVisible(visible: boolean): Promise<WindowsDesktopIconState> {
  if (process.platform !== "win32") {
    return { visible: true, iconCount: 0, shellViewHandle: 0, listViewHandle: 0 };
  }

  const { stdout } = await execFileAsync("powershell.exe", powershellArguments(buildDesktopIconSyncScript(visible, 12)), {
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
  const { stdout } = await execFileAsync("powershell.exe", powershellArguments(buildDesktopIconProbeScript(3)), {
    encoding: "utf8",
    windowsHide: true,
    timeout: POWERSHELL_TIMEOUT_MS,
    maxBuffer: 32 * 1024
  });
  return parseDesktopIconState(stdout);
}

export async function startDesktopIconRecoveryWatchdog(parentProcessId = process.pid): Promise<number> {
  if (process.platform !== "win32") return 0;
  const scriptPath = path.join(os.tmpdir(), `ProjectD-DesktopRecovery-${process.pid}-${Date.now()}.ps1`);
  const watchdogLogPath = path.join(os.tmpdir(), `ProjectD-DesktopRecovery-${process.pid}-${Date.now()}.log`);
  const watchdogScript = buildDesktopIconRecoveryWatchdogScript(parentProcessId, scriptPath, watchdogLogPath);
  fs.writeFileSync(scriptPath, watchdogScript, "utf8");
  const watchdogArguments = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath
  ];
  const watchdogCommandLine = [
    "powershell.exe",
    ...watchdogArguments.slice(0, -1),
    quoteWindowsCommandLineArgument(scriptPath)
  ].join(" ");
  const launcherScript = [
    "$ErrorActionPreference = 'Stop'",
    `$commandLine = '${watchdogCommandLine.replaceAll("'", "''")}'`,
    "$result = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $commandLine }",
    "if ($result.ReturnValue -ne 0 -or $result.ProcessId -le 0) { throw \"Windows failed to create the desktop recovery watchdog (code $($result.ReturnValue))\" }",
    "[pscustomobject]@{ processId = [int]$result.ProcessId } | ConvertTo-Json -Compress"
  ].join("\n");

  try {
    // `start` creates a new interactive process outside the Electron job
    // tree. A plain detached child can still be reclaimed when Electron is
    // force-killed, which is exactly the failure this watchdog prevents.
    const launcher = spawn("cmd.exe", ["/d", "/c", "start", "", "/b", "powershell.exe", ...watchdogArguments], {
      windowsHide: true,
      detached: true,
      stdio: "ignore"
    });
    launcher.unref();
    if (Number.isInteger(launcher.pid) && (launcher.pid ?? 0) > 0) return launcher.pid ?? 0;
  } catch {
    // Try WMI below when cmd/start is unavailable or blocked by policy.
  }

  try {
    const { stdout } = await execFileAsync("powershell.exe", powershellArguments(launcherScript), {
      encoding: "utf8",
      windowsHide: true,
      timeout: POWERSHELL_TIMEOUT_MS,
      maxBuffer: 16 * 1024
    });
    const line = stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
    const parsed = line ? JSON.parse(line) as { processId?: unknown } : {};
    const watchdogProcessId = Number(parsed.processId ?? 0);
    if (Number.isInteger(watchdogProcessId) && watchdogProcessId > 0) return watchdogProcessId;
    throw new Error("Windows returned an invalid desktop recovery watchdog process id");
  } catch (error) {
    // Keep activation usable on machines where CIM is unavailable. The file
    // based command line is intentionally shared with the WMI path so both
    // launchers avoid PowerShell's fragile long encoded-command boundary.
    const child = spawn("powershell.exe", watchdogArguments, {
      windowsHide: true,
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    const watchdogProcessId = child.pid ?? 0;
    if (Number.isInteger(watchdogProcessId) && watchdogProcessId > 0) return watchdogProcessId;
    throw new Error(`Desktop icon recovery watchdog did not start: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function buildDesktopIconRecoveryWatchdogScript(parentProcessId: number, cleanupPath?: string, logPath?: string): string {
  const safeParentProcessId = Math.max(0, Math.floor(parentProcessId));
  const cleanup = cleanupPath
    ? `try { Remove-Item -LiteralPath '${cleanupPath.replaceAll("'", "''")}' -Force -ErrorAction SilentlyContinue } catch {}`
    : "";
  const log = logPath ? logPath.replaceAll("'", "''") : "";
  return [
    "$ErrorActionPreference = 'SilentlyContinue'",
    logPath ? `$watchdogLogPath = '${log}'` : "$watchdogLogPath = $null",
    "function Write-WatchdogLog { param([string]$message) if ($watchdogLogPath) { try { Add-Content -LiteralPath $watchdogLogPath -Value ((Get-Date -Format o) + ' ' + $message) -Encoding UTF8 } catch {} } }",
    "Write-WatchdogLog 'started'",
    `$parentProcessId = ${safeParentProcessId}`,
    // Poll instead of Wait-Process so the watchdog also handles a parent that
    // is terminated before PowerShell has finished resolving its process id.
    "while (Get-Process -Id $parentProcessId -ErrorAction SilentlyContinue) { Start-Sleep -Milliseconds 500 }",
    "Write-WatchdogLog 'parent exited'",
    "Start-Sleep -Milliseconds 750",
    "$recoverySucceeded = $false",
    "try {",
    buildDesktopIconSyncScript(true, 12),
    buildWindowsTaskbarSyncScript(true),
    "$recoverySucceeded = $true",
    "Write-WatchdogLog 'desktop and taskbar restored'",
    "} catch {",
    "Write-WatchdogLog ('recovery failed: ' + $_.Exception.Message)",
    "} finally {",
    cleanup,
    "if ($recoverySucceeded -and $watchdogLogPath) { try { Remove-Item -LiteralPath $watchdogLogPath -Force -ErrorAction SilentlyContinue } catch {} }",
    "}",
    "if (-not $recoverySucceeded) { exit 1 }"
  ].join("\n");
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

export function buildDesktopIconProbeScript(attempts = 3): string {
  return buildDesktopIconScript(null, attempts);
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

function quoteWindowsCommandLineArgument(value: string): string {
  return `"${value.replaceAll('"', '\\"')}"`;
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

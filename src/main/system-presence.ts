import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface SystemPresenceState {
  externalFullscreen: boolean;
  onBattery: boolean;
  batteryLevel: number | null;
}

export type SystemPresenceProbe = () => Promise<SystemPresenceState>;

const FALLBACK_STATE: SystemPresenceState = {
  externalFullscreen: false,
  onBattery: false,
  batteryLevel: null
};

export class SystemPresenceMonitor {
  private cached: SystemPresenceState = FALLBACK_STATE;
  private expiresAt = 0;
  private pending: Promise<SystemPresenceState> | null = null;

  constructor(
    private readonly probe: SystemPresenceProbe = createWindowsPresenceProbe(),
    private readonly cacheMs = 5_000
  ) {}

  async getState(now = Date.now()): Promise<SystemPresenceState> {
    if (now < this.expiresAt) return this.cached;
    if (this.pending) return this.pending;

    this.pending = this.probe()
      .catch(() => FALLBACK_STATE)
      .then((state) => {
        this.cached = normalizeState(state);
        this.expiresAt = now + this.cacheMs;
        return this.cached;
      })
      .finally(() => {
        this.pending = null;
      });
    return this.pending;
  }
}

export function createWindowsPresenceProbe(excludedProcessId = process.pid): SystemPresenceProbe {
  if (process.platform !== "win32") return async () => FALLBACK_STATE;

  const script = buildProbeScript(excludedProcessId);
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  return async () => {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
      { encoding: "utf8", windowsHide: true, timeout: 2_500, maxBuffer: 16 * 1024 }
    );
    const parsed = JSON.parse(stdout.trim()) as Partial<SystemPresenceState>;
    return normalizeState(parsed);
  };
}

function normalizeState(input: Partial<SystemPresenceState>): SystemPresenceState {
  const level = typeof input.batteryLevel === "number" && Number.isFinite(input.batteryLevel)
    ? Math.max(0, Math.min(100, Math.round(input.batteryLevel)))
    : null;
  return {
    externalFullscreen: input.externalFullscreen === true,
    onBattery: input.onBattery === true,
    batteryLevel: level
  };
}

function buildProbeScript(excludedProcessId: number): string {
  return `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class ProjectDPresenceUser32 {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
}
"@
$fullScreen = $false
$hwnd = [ProjectDPresenceUser32]::GetForegroundWindow()
if ($hwnd -ne [IntPtr]::Zero -and -not [ProjectDPresenceUser32]::IsIconic($hwnd)) {
  $rect = New-Object ProjectDPresenceUser32+RECT
  $pidValue = [uint32]0
  [void][ProjectDPresenceUser32]::GetWindowThreadProcessId($hwnd, [ref]$pidValue)
  if ($pidValue -ne ${Math.max(0, Math.floor(excludedProcessId))}) {
    [void][ProjectDPresenceUser32]::GetWindowRect($hwnd, [ref]$rect)
    $bounds = [System.Windows.Forms.Screen]::FromHandle($hwnd).Bounds
    $fullScreen = [Math]::Abs($rect.Left - $bounds.Left) -le 2 -and [Math]::Abs($rect.Top - $bounds.Top) -le 2 -and [Math]::Abs($rect.Right - $bounds.Right) -le 2 -and [Math]::Abs($rect.Bottom - $bounds.Bottom) -le 2
  }
}
$battery = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
[pscustomobject]@{
  externalFullscreen = $fullScreen
  onBattery = if ($null -eq $battery) { $false } else { [int]$battery.BatteryStatus -eq 1 }
  batteryLevel = if ($null -eq $battery) { $null } else { [int]$battery.EstimatedChargeRemaining }
} | ConvertTo-Json -Compress
`;
}

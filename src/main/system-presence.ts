import { spawn } from "node:child_process";

export interface SystemPresenceState {
  externalFullscreen: boolean;
  onBattery: boolean;
  batteryLevel: number | null;
}

export type SystemPresenceProbe = (() => Promise<SystemPresenceState>) & { dispose?: () => void };

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

  dispose(): void {
    this.probe.dispose?.();
  }
}

export function createWindowsPresenceProbe(excludedProcessId = process.pid): SystemPresenceProbe {
  if (process.platform !== "win32") return async () => FALLBACK_STATE;

  const encoded = Buffer.from(buildProbeScript(excludedProcessId), "utf16le").toString("base64");
  let child: ReturnType<typeof spawn> | null = null;
  let latest: SystemPresenceState | null = null;
  let buffer = "";
  const waiters = new Set<(state: SystemPresenceState) => void>();

  const settle = (state: SystemPresenceState) => {
    latest = state;
    for (const resolve of waiters) resolve(state);
    waiters.clear();
  };

  const start = () => {
    if (child && child.exitCode === null) return;
    child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
      { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }
    );
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          settle(normalizeState(JSON.parse(line) as Partial<SystemPresenceState>));
        } catch {
          // Ignore malformed helper output and retain the last valid state.
        }
      }
    });
    child.once("error", () => settle(FALLBACK_STATE));
    child.once("exit", () => {
      child = null;
      settle(latest ?? FALLBACK_STATE);
    });
  };

  const probe: SystemPresenceProbe = async () => {
    start();
    if (latest) return latest;
    return new Promise<SystemPresenceState>((resolve) => {
      const timeout = setTimeout(() => {
        waiters.delete(done);
        resolve(FALLBACK_STATE);
      }, 3_000);
      const done = (state: SystemPresenceState) => {
        clearTimeout(timeout);
        resolve(state);
      };
      waiters.add(done);
    });
  };
  probe.dispose = () => {
    waiters.clear();
    child?.kill();
    child = null;
  };
  return probe;
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
while ($true) {
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
$power = [System.Windows.Forms.SystemInformation]::PowerStatus
[pscustomobject]@{
  externalFullscreen = $fullScreen
  onBattery = $power.PowerLineStatus -eq [System.Windows.Forms.PowerLineStatus]::Offline
  batteryLevel = if ($power.BatteryLifePercent -lt 0) { $null } else { [int][Math]::Round($power.BatteryLifePercent * 100) }
} | ConvertTo-Json -Compress
Start-Sleep -Milliseconds 1500
}
`;
}

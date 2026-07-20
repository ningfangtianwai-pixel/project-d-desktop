import type { ThermalState } from "../shared/runtime.js";
import type { PowerMonitor, Screen } from "electron";

interface TimerHandle {
  unref?: () => unknown;
}

type Schedule = (callback: () => void, delayMs: number) => TimerHandle;
type CancelScheduled = (timer: TimerHandle) => void;

export interface SystemEventManagerOptions {
  screen: Screen;
  powerMonitor: PowerMonitor;
  isDynamicWallpaperEnabled: () => boolean;
  ensureWallpaperWindows: () => void;
  requestRecovery: (reason: string) => void;
  suspendRecovery: (reason: string) => void;
  resumeRecovery: (reason: string) => void;
  updatePauseState: (patch: {
    suspended?: boolean;
    screenLocked?: boolean;
    onBattery?: boolean;
    thermalState?: ThermalState;
  }) => void;
  probeRenderers: (reason: string) => void | Promise<void>;
  schedule?: Schedule;
  cancelScheduled?: CancelScheduled;
}

export class SystemEventManager {
  private readonly screen: Screen;
  private readonly powerMonitor: PowerMonitor;
  private readonly options: SystemEventManagerOptions;
  private readonly schedule: Schedule;
  private readonly cancelScheduled: CancelScheduled;
  private readonly timers = new Set<TimerHandle>();
  private started = false;

  private readonly onDisplayAdded = (): void => this.handleDisplayChange("display-added");
  private readonly onDisplayRemoved = (): void => this.handleDisplayChange("display-removed");
  private readonly onDisplayMetricsChanged = (): void => this.handleDisplayChange("display-metrics-changed");
  private readonly onSuspend = (): void => {
    this.options.updatePauseState({ suspended: true });
    this.options.suspendRecovery("system-suspend");
  };
  private readonly onResume = (): void => {
    this.options.updatePauseState({ suspended: false });
    this.scheduleOwned(() => this.options.resumeRecovery("system-resume"), 800);
    this.requestRendererProbe("system-resume", 1_800);
  };
  private readonly onLockScreen = (): void => {
    this.options.updatePauseState({ screenLocked: true });
    this.options.suspendRecovery("screen-locked");
  };
  private readonly onUnlockScreen = (): void => {
    this.options.updatePauseState({ screenLocked: false });
    this.scheduleOwned(() => this.options.resumeRecovery("screen-unlocked"), 350);
    this.requestRendererProbe("screen-unlocked", 900);
  };
  private readonly onBattery = (): void => this.options.updatePauseState({ onBattery: true });
  private readonly onAc = (): void => this.options.updatePauseState({ onBattery: false });
  private readonly onThermalStateChange = (details: { state: ThermalState }): void => {
    this.options.updatePauseState({ thermalState: details.state });
  };

  constructor(options: SystemEventManagerOptions) {
    this.options = options;
    this.screen = options.screen;
    this.powerMonitor = options.powerMonitor;
    this.schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs));
    this.cancelScheduled = options.cancelScheduled ?? ((timer) => clearTimeout(timer as NodeJS.Timeout));
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.screen.on("display-added", this.onDisplayAdded);
    this.screen.on("display-removed", this.onDisplayRemoved);
    this.screen.on("display-metrics-changed", this.onDisplayMetricsChanged);
    this.powerMonitor.on("suspend", this.onSuspend);
    this.powerMonitor.on("resume", this.onResume);
    this.powerMonitor.on("lock-screen", this.onLockScreen);
    this.powerMonitor.on("unlock-screen", this.onUnlockScreen);
    this.powerMonitor.on("on-battery", this.onBattery);
    this.powerMonitor.on("on-ac", this.onAc);
    this.powerMonitor.on("thermal-state-change", this.onThermalStateChange);
  }

  dispose(): void {
    if (this.started) {
      this.screen.off("display-added", this.onDisplayAdded);
      this.screen.off("display-removed", this.onDisplayRemoved);
      this.screen.off("display-metrics-changed", this.onDisplayMetricsChanged);
      this.powerMonitor.off("suspend", this.onSuspend);
      this.powerMonitor.off("resume", this.onResume);
      this.powerMonitor.off("lock-screen", this.onLockScreen);
      this.powerMonitor.off("unlock-screen", this.onUnlockScreen);
      this.powerMonitor.off("on-battery", this.onBattery);
      this.powerMonitor.off("on-ac", this.onAc);
      this.powerMonitor.off("thermal-state-change", this.onThermalStateChange);
      this.started = false;
    }
    for (const timer of this.timers) this.cancelScheduled(timer);
    this.timers.clear();
  }

  private handleDisplayChange(reason: "display-added" | "display-removed" | "display-metrics-changed"): void {
    if (this.options.isDynamicWallpaperEnabled()) this.options.ensureWallpaperWindows();
    this.options.requestRecovery(reason);
    this.requestRendererProbe(reason, 650);
  }

  private requestRendererProbe(reason: string, delayMs: number): void {
    this.scheduleOwned(() => void this.options.probeRenderers(reason), delayMs);
  }

  private scheduleOwned(callback: () => void, delayMs: number): void {
    let timer: TimerHandle;
    timer = this.schedule(() => {
      this.timers.delete(timer);
      if (this.started) callback();
    }, delayMs);
    this.timers.add(timer);
    timer.unref?.();
  }
}

export interface DesktopRuntimeRecoveryActions {
  reconcileDisplayBounds: (reason: string) => void | Promise<void>;
  repairWallpaperHost: (reason: string) => void | Promise<void>;
  rescanDesktop: (reason: string) => void | Promise<void>;
  record: (state: {
    status: "suspended" | "running" | "ready" | "failed";
    reason: string;
    at: string;
    error?: string;
  }) => void;
}

export class DesktopRuntimeRecovery {
  private running = false;
  private suspended = false;
  private stopped = false;
  private queuedReason: string | null = null;
  private queuedRescan = false;

  constructor(private readonly actions: DesktopRuntimeRecoveryActions) {}

  suspend(reason = "system-suspend"): void {
    if (this.stopped) return;
    this.suspended = true;
    this.record({ status: "suspended", reason, at: new Date().toISOString() });
  }

  resume(reason = "system-resume"): void {
    if (this.stopped) return;
    this.suspended = false;
    this.request(reason, true);
  }

  request(reason: string, rescanDesktop = false): void {
    if (this.stopped) return;
    this.queuedReason = reason;
    this.queuedRescan ||= rescanDesktop;
    if (this.running || this.suspended) return;
    void this.drain();
  }

  stop(): void {
    this.stopped = true;
    this.queuedReason = null;
    this.queuedRescan = false;
  }

  private async drain(): Promise<void> {
    this.running = true;
    while (!this.stopped && !this.suspended && this.queuedReason) {
      const reason = this.queuedReason;
      const shouldRescan = this.queuedRescan;
      this.queuedReason = null;
      this.queuedRescan = false;
      this.record({ status: "running", reason, at: new Date().toISOString() });
      try {
        await this.actions.reconcileDisplayBounds(reason);
        await this.actions.repairWallpaperHost(reason);
        if (shouldRescan) await this.actions.rescanDesktop(reason);
        this.record({ status: "ready", reason, at: new Date().toISOString() });
      } catch (error) {
        this.record({
          status: "failed",
          reason,
          at: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    this.running = false;
  }

  private record(state: Parameters<DesktopRuntimeRecoveryActions["record"]>[0]): void {
    try {
      this.actions.record(state);
    } catch {
      // Diagnostics persistence must not break desktop recovery.
    }
  }
}

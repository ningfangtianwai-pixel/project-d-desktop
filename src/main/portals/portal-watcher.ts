import fs from "node:fs";

export interface PortalWatchTarget {
  id: string;
  path: string;
  isEnabled: boolean;
}

export interface PortalRefreshEvent {
  portalId: string;
  path: string;
  reason: "change" | "error";
  status: "ready" | "offline" | "permission-denied";
  errorCode?: string;
}

export interface PortalWatchHandle {
  close(): void;
}

export interface PortalWatchAdapter {
  watch(
    portalPath: string,
    callbacks: {
      onChange: (eventType: string, filename: string | Buffer | null) => void;
      onError: (error: unknown) => void;
    }
  ): PortalWatchHandle;
}

type TimerHandle = ReturnType<typeof setTimeout>;

export interface PortalWatcherTimer {
  now(): number;
  setTimeout(callback: () => void, delayMs: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}

export interface PortalWatcherOptions {
  debounceMs?: number;
  maxBatchDelayMs?: number;
  reconnectDelayMs?: number;
  adapter?: PortalWatchAdapter;
  timer?: PortalWatcherTimer;
}

interface WatchedPortal {
  target: PortalWatchTarget;
  handle: PortalWatchHandle;
  firstEventAt: number | null;
  debounceTimer: TimerHandle | null;
  maxBatchTimer: TimerHandle | null;
}

const DEFAULT_DEBOUNCE_MS = 500;
const DEFAULT_MAX_BATCH_DELAY_MS = 2_000;
const DEFAULT_RECONNECT_DELAY_MS = 5_000;

const nodeAdapter: PortalWatchAdapter = {
  watch(portalPath, callbacks) {
    const watcher = fs.watch(portalPath, { persistent: false }, callbacks.onChange);
    watcher.on("error", callbacks.onError);
    return watcher;
  }
};

const systemTimer: PortalWatcherTimer = {
  now: () => Date.now(),
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle)
};

function isIgnoredFilename(filename: string | Buffer | null): boolean {
  if (filename === null) return false;
  const name = (Buffer.isBuffer(filename) ? filename.toString() : filename).trim().toLowerCase();
  return name === ".ds_store" || name === "desktop.ini" || name.startsWith("~$");
}

function portalErrorStatus(error: unknown): Pick<PortalRefreshEvent, "status" | "errorCode"> {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : undefined;
  return {
    status: code === "EACCES" || code === "EPERM" ? "permission-denied" : "offline",
    ...(code ? { errorCode: code } : {})
  };
}

/**
 * Watches only explicitly approved portal roots. It batches notifications and leaves
 * all reading, indexing, and user-facing refresh work to the supplied callback.
 */
export class PortalWatcher {
  private readonly watched = new Map<string, WatchedPortal>();
  private readonly desired = new Map<string, PortalWatchTarget>();
  private readonly reconnectTimers = new Map<string, { handle: TimerHandle; path: string }>();
  private readonly debounceMs: number;
  private readonly maxBatchDelayMs: number;
  private readonly reconnectDelayMs: number;
  private readonly adapter: PortalWatchAdapter;
  private readonly timer: PortalWatcherTimer;

  constructor(
    private readonly onRefresh: (event: PortalRefreshEvent) => void,
    options: PortalWatcherOptions = {}
  ) {
    this.debounceMs = Math.max(0, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
    this.maxBatchDelayMs = Math.max(this.debounceMs, options.maxBatchDelayMs ?? DEFAULT_MAX_BATCH_DELAY_MS);
    this.reconnectDelayMs = Math.max(100, options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS);
    this.adapter = options.adapter ?? nodeAdapter;
    this.timer = options.timer ?? systemTimer;
  }

  updatePortals(portals: readonly PortalWatchTarget[]): void {
    const desired = new Map(
      portals
        .filter((portal) => portal.isEnabled)
        .map((portal) => [portal.id, { ...portal }])
    );
    this.desired.clear();
    for (const [portalId, target] of desired) this.desired.set(portalId, target);

    for (const [portalId, current] of this.watched) {
      const next = desired.get(portalId);
      if (!next || next.path !== current.target.path) {
        this.release(current);
        this.watched.delete(portalId);
      }
    }

    for (const [portalId, pending] of this.reconnectTimers) {
      const next = desired.get(portalId);
      if (!next || next.path !== pending.path) {
        this.timer.clearTimeout(pending.handle);
        this.reconnectTimers.delete(portalId);
      }
    }

    for (const portal of desired.values()) {
      if (!this.watched.has(portal.id) && !this.reconnectTimers.has(portal.id)) this.start(portal);
    }
  }

  stop(): void {
    for (const watched of this.watched.values()) this.release(watched);
    this.watched.clear();
    for (const pending of this.reconnectTimers.values()) this.timer.clearTimeout(pending.handle);
    this.reconnectTimers.clear();
    this.desired.clear();
  }

  private start(target: PortalWatchTarget): void {
    let watched: WatchedPortal | null = null;
    try {
      const handle = this.adapter.watch(target.path, {
        onChange: (_eventType, filename) => {
          if (!isIgnoredFilename(filename) && watched && this.isActive(watched)) this.scheduleRefresh(watched);
        },
        onError: (error) => {
          if (!watched || this.isActive(watched)) this.handleWatchError(target, watched, error);
        }
      });
      watched = { target, handle, firstEventAt: null, debounceTimer: null, maxBatchTimer: null };
      this.watched.set(target.id, watched);
    } catch (error) {
      this.handleWatchError(target, null, error);
    }
  }

  private handleWatchError(target: PortalWatchTarget, watched: WatchedPortal | null, error: unknown): void {
    if (watched && this.isActive(watched)) {
      this.release(watched);
      this.watched.delete(target.id);
    }
    this.reportError(target, error);
    this.scheduleReconnect(target);
  }

  private scheduleReconnect(target: PortalWatchTarget): void {
    if (this.reconnectTimers.has(target.id) || !this.desired.has(target.id)) return;
    const timer = this.timer.setTimeout(() => {
      this.reconnectTimers.delete(target.id);
      const desired = this.desired.get(target.id);
      if (desired && !this.watched.has(target.id)) this.start(desired);
    }, this.reconnectDelayMs);
    this.reconnectTimers.set(target.id, { handle: timer, path: target.path });
  }

  private scheduleRefresh(watched: WatchedPortal): void {
    const now = this.timer.now();
    if (watched.firstEventAt === null) {
      watched.firstEventAt = now;
      watched.maxBatchTimer = this.timer.setTimeout(() => this.flush(watched), this.maxBatchDelayMs);
    }

    if (watched.debounceTimer) this.timer.clearTimeout(watched.debounceTimer);
    const elapsed = now - watched.firstEventAt;
    const delay = Math.max(0, Math.min(this.debounceMs, this.maxBatchDelayMs - elapsed));
    watched.debounceTimer = this.timer.setTimeout(() => this.flush(watched), delay);
  }

  private flush(watched: WatchedPortal): void {
    if (!this.isActive(watched)) return;
    this.clearPendingTimers(watched);
    watched.firstEventAt = null;
    this.onRefresh({ portalId: watched.target.id, path: watched.target.path, reason: "change", status: "ready" });
  }

  private reportError(target: PortalWatchTarget, error: unknown): void {
    this.onRefresh({ portalId: target.id, path: target.path, reason: "error", ...portalErrorStatus(error) });
  }

  private release(watched: WatchedPortal): void {
    this.clearPendingTimers(watched);
    watched.handle.close();
  }

  private clearPendingTimers(watched: WatchedPortal): void {
    if (watched.debounceTimer !== null) this.timer.clearTimeout(watched.debounceTimer);
    if (watched.maxBatchTimer !== null) this.timer.clearTimeout(watched.maxBatchTimer);
    watched.debounceTimer = null;
    watched.maxBatchTimer = null;
  }

  private isActive(watched: WatchedPortal): boolean {
    return this.watched.get(watched.target.id) === watched;
  }
}

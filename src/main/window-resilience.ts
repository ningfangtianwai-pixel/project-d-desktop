import type { BrowserWindow } from "electron";

export type WindowRole = "main" | "settings" | "overlay" | "wallpaper" | "pet";
export type RendererRecoveryReason = "render-process-gone" | "did-fail-load" | "unresponsive" | "health-probe" | "preload-error";

export interface RendererRecoveryEvent {
  at: string;
  role: WindowRole;
  status: "healthy" | "suspect" | "recovering" | "recovered" | "failed" | "exhausted";
  reason: RendererRecoveryReason | "did-finish-load";
  attempt?: number;
  details?: Record<string, unknown>;
}

interface WindowRegistration {
  window: BrowserWindow;
  role: WindowRole;
  healthSelector: string;
  rejectUniformWhite?: boolean;
  recover?: (reason: RendererRecoveryReason) => void | Promise<void>;
  afterLoad?: () => void | Promise<void>;
}

interface SupervisorOptions {
  record?: (event: RendererRecoveryEvent) => void;
  onExhausted?: (event: RendererRecoveryEvent) => void | Promise<void>;
  isShuttingDown?: () => boolean;
  maxRecoveries?: number;
  recoveryWindowMs?: number;
  recoveryCooldownMs?: number;
  unresponsiveGraceMs?: number;
  probeTimeoutMs?: number;
  initialProbeDelayMs?: number;
  probeFailureThreshold?: number;
  now?: () => number;
}

interface RegisteredWindow extends WindowRegistration {
  closed: boolean;
  recoveryInFlight: boolean;
  lastRecoveryAt: number;
  unresponsiveTimer: ReturnType<typeof setTimeout> | null;
  initialProbeTimer: ReturnType<typeof setTimeout> | null;
  consecutiveProbeFailures: number;
}

export class WindowResilienceSupervisor {
  private readonly registrations = new Map<number, RegisteredWindow>();
  private readonly recoveryTimes = new Map<WindowRole, number[]>();
  private readonly exhaustedRoles = new Set<WindowRole>();
  private readonly record: (event: RendererRecoveryEvent) => void;
  private readonly onExhausted?: SupervisorOptions["onExhausted"];
  private readonly isShuttingDown: () => boolean;
  private readonly maxRecoveries: number;
  private readonly recoveryWindowMs: number;
  private readonly recoveryCooldownMs: number;
  private readonly unresponsiveGraceMs: number;
  private readonly probeTimeoutMs: number;
  private readonly initialProbeDelayMs: number;
  private readonly probeFailureThreshold: number;
  private readonly now: () => number;

  constructor(options: SupervisorOptions = {}) {
    this.record = options.record ?? (() => undefined);
    this.onExhausted = options.onExhausted;
    this.isShuttingDown = options.isShuttingDown ?? (() => false);
    this.maxRecoveries = options.maxRecoveries ?? 3;
    this.recoveryWindowMs = options.recoveryWindowMs ?? 60_000;
    this.recoveryCooldownMs = options.recoveryCooldownMs ?? 1_000;
    this.unresponsiveGraceMs = options.unresponsiveGraceMs ?? 1_500;
    this.probeTimeoutMs = options.probeTimeoutMs ?? 2_500;
    this.initialProbeDelayMs = options.initialProbeDelayMs ?? 900;
    this.probeFailureThreshold = options.probeFailureThreshold ?? 2;
    this.now = options.now ?? Date.now;
  }

  register(registration: WindowRegistration): void {
    const id = registration.window.webContents.id;
    this.dispose(id);
    const state: RegisteredWindow = {
      ...registration,
      closed: false,
      recoveryInFlight: false,
      lastRecoveryAt: Number.NEGATIVE_INFINITY,
      unresponsiveTimer: null,
      initialProbeTimer: null,
      consecutiveProbeFailures: 0
    };
    this.registrations.set(id, state);

    registration.window.webContents.on("render-process-gone", (_event, details) => {
      void this.recover(state, "render-process-gone", {
        reason: details.reason,
        exitCode: details.exitCode
      });
    });
    registration.window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame || errorCode === -3) return;
      void this.recover(state, "did-fail-load", { errorCode, errorDescription, validatedURL });
    });
    registration.window.webContents.on("preload-error", (_event, preloadPath, error) => {
      void this.recover(state, "preload-error", { preloadPath, message: error.message });
    });
    registration.window.webContents.on("did-finish-load", () => {
      void Promise.resolve(state.afterLoad?.()).catch((error: unknown) => {
        this.recordEvent(state.role, "failed", "did-finish-load", undefined, {
          message: error instanceof Error ? error.message : String(error)
        });
      });
      if (state.initialProbeTimer) clearTimeout(state.initialProbeTimer);
      state.initialProbeTimer = setTimeout(() => {
        state.initialProbeTimer = null;
        void this.probe(state, "did-finish-load");
      }, this.initialProbeDelayMs);
    });
    registration.window.on("unresponsive", () => {
      if (state.unresponsiveTimer) clearTimeout(state.unresponsiveTimer);
      state.unresponsiveTimer = setTimeout(() => {
        state.unresponsiveTimer = null;
        void this.recover(state, "unresponsive");
      }, this.unresponsiveGraceMs);
    });
    registration.window.on("responsive", () => {
      if (state.unresponsiveTimer) clearTimeout(state.unresponsiveTimer);
      state.unresponsiveTimer = null;
    });
    registration.window.once("closed", () => this.dispose(id));
  }

  async probeAll(trigger: string): Promise<void> {
    await Promise.all([...this.registrations.values()].map((state) => this.probe(state, trigger)));
  }

  disposeAll(): void {
    for (const id of this.registrations.keys()) this.dispose(id);
  }

  private async probe(state: RegisteredWindow, trigger: string): Promise<void> {
    if (!this.canUse(state)) return;
    if (state.window.webContents.isLoadingMainFrame()) return;
    const selector = JSON.stringify(state.healthSelector);
    const script = `(() => {
      if (document.readyState !== "complete") return { healthy: false, readyState: document.readyState };
      const root = document.querySelector(${selector});
      if (!root) return { healthy: false, readyState: document.readyState, rootFound: false };
      const bounds = root.getBoundingClientRect();
      return {
        healthy: bounds.width >= 48 && bounds.height >= 48,
        readyState: document.readyState,
        rootFound: true,
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
        childCount: root.childElementCount
      };
    })()`;
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const result = await Promise.race([
        state.window.webContents.executeJavaScript(script, true),
        new Promise<Record<string, unknown>>((resolve) => {
          timer = setTimeout(() => resolve({ healthy: false, timedOut: true }), this.probeTimeoutMs);
        })
      ]);
      const details = typeof result === "object" && result !== null
        ? result as Record<string, unknown>
        : { healthy: result === true };
      if (details.healthy !== true) {
        await this.handleProbeFailure(state, { trigger, ...details });
        return;
      }
      if (state.rejectUniformWhite) {
        try {
          const image = await state.window.webContents.capturePage();
          const size = image.getSize();
          if (isMostlyWhiteBitmap(image.toBitmap(), size.width, size.height)) {
            await this.handleProbeFailure(state, { trigger, ...details, visualState: "uniform-white" });
            return;
          }
        } catch (error) {
          this.markProbeHealthy(state);
          this.recordEvent(state.role, "suspect", "health-probe", undefined, {
            trigger,
            ...details,
            visualState: "capture-unavailable",
            message: error instanceof Error ? error.message : String(error)
          });
          return;
        }
      }
      this.markProbeHealthy(state);
      this.recordEvent(state.role, "healthy", "did-finish-load", undefined, { trigger, ...details });
    } catch (error) {
      await this.handleProbeFailure(state, {
        trigger,
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async handleProbeFailure(state: RegisteredWindow, details: Record<string, unknown>): Promise<void> {
    state.consecutiveProbeFailures += 1;
    if (state.consecutiveProbeFailures < this.probeFailureThreshold) {
      this.recordEvent(state.role, "suspect", "health-probe", state.consecutiveProbeFailures, details);
      return;
    }
    state.consecutiveProbeFailures = 0;
    await this.recover(state, "health-probe", details);
  }

  private markProbeHealthy(state: RegisteredWindow): void {
    state.consecutiveProbeFailures = 0;
    this.recoveryTimes.delete(state.role);
    this.exhaustedRoles.delete(state.role);
  }

  private async recover(
    state: RegisteredWindow,
    reason: RendererRecoveryReason,
    details?: Record<string, unknown>
  ): Promise<void> {
    if (!this.canUse(state) || state.recoveryInFlight) return;
    const currentTime = this.now();
    if (currentTime - state.lastRecoveryAt < this.recoveryCooldownMs) return;

    const recent = (this.recoveryTimes.get(state.role) ?? []).filter(
      (timestamp) => currentTime - timestamp <= this.recoveryWindowMs
    );
    if (recent.length >= this.maxRecoveries) {
      if (this.exhaustedRoles.has(state.role)) return;
      this.exhaustedRoles.add(state.role);
      const event = this.recordEvent(state.role, "exhausted", reason, recent.length, details);
      await this.onExhausted?.(event);
      return;
    }

    const attempt = recent.length + 1;
    recent.push(currentTime);
    this.recoveryTimes.set(state.role, recent);
    state.lastRecoveryAt = currentTime;
    state.recoveryInFlight = true;
    this.recordEvent(state.role, "recovering", reason, attempt, details);
    try {
      if (state.recover) await state.recover(reason);
      else state.window.webContents.reloadIgnoringCache();
      this.recordEvent(state.role, "recovered", reason, attempt);
    } catch (error) {
      this.recordEvent(state.role, "failed", reason, attempt, {
        ...details,
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      state.recoveryInFlight = false;
    }
  }

  private canUse(state: RegisteredWindow): boolean {
    return !this.isShuttingDown()
      && !state.closed
      && !state.window.isDestroyed()
      && !state.window.webContents.isDestroyed();
  }

  private dispose(id: number): void {
    const state = this.registrations.get(id);
    if (!state) return;
    state.closed = true;
    if (state.unresponsiveTimer) clearTimeout(state.unresponsiveTimer);
    if (state.initialProbeTimer) clearTimeout(state.initialProbeTimer);
    this.registrations.delete(id);
  }

  private recordEvent(
    role: WindowRole,
    status: RendererRecoveryEvent["status"],
    reason: RendererRecoveryEvent["reason"],
    attempt?: number,
    details?: Record<string, unknown>
  ): RendererRecoveryEvent {
    const event: RendererRecoveryEvent = {
      at: new Date(this.now()).toISOString(),
      role,
      status,
      reason,
      ...(attempt === undefined ? {} : { attempt }),
      ...(details ? { details } : {})
    };
    this.record(event);
    return event;
  }
}

export function isMostlyWhiteBitmap(bitmap: Buffer, width: number, height: number): boolean {
  if (width <= 0 || height <= 0 || bitmap.length < width * height * 4) return false;
  const stepX = Math.max(1, Math.floor(width / 24));
  const stepY = Math.max(1, Math.floor(height / 16));
  let sampled = 0;
  let white = 0;
  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const offset = (y * width + x) * 4;
      const blue = bitmap[offset] ?? 0;
      const green = bitmap[offset + 1] ?? 0;
      const red = bitmap[offset + 2] ?? 0;
      const alpha = bitmap[offset + 3] ?? 255;
      sampled += 1;
      if (red >= 246 && green >= 246 && blue >= 246 && alpha >= 240) white += 1;
    }
  }
  return sampled > 0 && white / sampled >= 0.985;
}

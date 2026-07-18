import type { WallpaperAttachResult } from "./wallpaper-host.js";

interface RetryWallpaperAttachOptions {
  attempts: number;
  attach: () => Promise<WallpaperAttachResult>;
  wait?: (milliseconds: number) => Promise<void>;
}

interface WallpaperHostSupervisorOptions {
  repair: (reason: string) => Promise<void>;
  fallbackIntervalMs?: number;
  onError?: (error: unknown, reason: string) => void;
}

interface ConfirmWallpaperFrameOptions {
  attempts?: number;
  waitForRendererReady: () => Promise<boolean>;
  present: () => void;
  verifyVisibleFrame: () => Promise<boolean>;
  onRenderReady?: (ready: boolean) => void;
  wait?: (milliseconds: number) => Promise<void>;
}

export interface WallpaperAttachmentPresentationState {
  settled: boolean;
  attached: boolean;
  renderReady: boolean;
}

interface WallpaperPresentationWindow {
  hide: () => void;
  showInactive: () => void;
}

export function presentWallpaperWindow(
  window: WallpaperPresentationWindow,
  state: WallpaperAttachmentPresentationState | null | undefined
): "shown" | "hidden" {
  if (state?.settled === true && state.attached === true && state.renderReady === true) {
    window.showInactive();
    return "shown";
  }
  window.hide();
  return "hidden";
}

export async function retryWallpaperAttach(options: RetryWallpaperAttachOptions): Promise<WallpaperAttachResult> {
  const attempts = Math.max(1, Math.round(options.attempts));
  const wait = options.wait ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  let result: WallpaperAttachResult = {
    attached: false,
    childHwnd: "0",
    error: "Wallpaper host attach was not attempted"
  };

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await options.attach();
    if (result.attached) {
      return result;
    }
    if (attempt < attempts) {
      await wait(attempt * 350);
    }
  }
  return result;
}

export async function confirmWallpaperFrame(options: ConfirmWallpaperFrameOptions): Promise<boolean> {
  const attempts = Math.max(1, Math.round(options.attempts ?? 2));
  const wait = options.wait ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const rendererReady = await options.waitForRendererReady();
    options.onRenderReady?.(rendererReady);
    if (rendererReady) {
      options.present();
      const visible = await options.verifyVisibleFrame();
      options.onRenderReady?.(visible);
      if (visible) return true;
    }
    if (attempt < attempts) await wait(200);
  }
  return false;
}

export class WallpaperAttachQueue {
  private tail: Promise<void> = Promise.resolve();

  run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation, operation);
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }
}

export class WallpaperHostSupervisor {
  private readonly fallbackIntervalMs: number;
  private interval: NodeJS.Timeout | null = null;
  private running = false;
  private started = false;
  private queuedReason: string | null = null;

  constructor(private readonly options: WallpaperHostSupervisorOptions) {
    this.fallbackIntervalMs = Math.max(30_000, options.fallbackIntervalMs ?? 90_000);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.interval = setInterval(() => this.request("fallback-timer"), this.fallbackIntervalMs);
    this.interval.unref?.();
  }

  stop(): void {
    this.started = false;
    this.queuedReason = null;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  request(reason: string): void {
    if (!this.started) return;
    if (this.running) {
      this.queuedReason = reason;
      return;
    }
    void this.run(reason);
  }

  private async run(reason: string): Promise<void> {
    this.running = true;
    try {
      await this.options.repair(reason);
    } catch (error) {
      this.options.onError?.(error, reason);
    } finally {
      this.running = false;
    }

    if (!this.started || !this.queuedReason) return;
    const queuedReason = this.queuedReason;
    this.queuedReason = null;
    await this.run(queuedReason);
  }
}

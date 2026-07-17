export interface WallpaperAsset {
  id: string;
  type: "image" | "video";
  src: string;
  posterSrc?: string;
}

export type WallpaperPlaybackState = "idle" | "loading" | "playing" | "paused" | "error" | "fallback";

export type WallpaperMediaEvent = "canplay" | "playing" | "pause" | "ended" | "error" | "stalled";

export interface WallpaperPlaybackSnapshot {
  state: WallpaperPlaybackState;
  current: WallpaperAsset | null;
  previous: WallpaperAsset | null;
  fallback: WallpaperAsset | null;
  lastEvent: WallpaperMediaEvent | null;
  error: string | null;
  runtimePaused: boolean;
}

export interface WallpaperSelectionResult {
  changed: boolean;
  stale: boolean;
  current: WallpaperAsset | null;
  previous: WallpaperAsset | null;
  error?: string;
}

export class WallpaperPlayer {
  private readonly loads = new Map<string, Promise<void>>();
  private readonly listeners = new Set<(snapshot: WallpaperPlaybackSnapshot) => void>();
  private requestSequence = 0;
  private currentAsset: WallpaperAsset | null = null;
  private previousAsset: WallpaperAsset | null = null;
  private fallbackAsset: WallpaperAsset | null = null;
  private playbackState: WallpaperPlaybackState = "idle";
  private lastMediaEvent: WallpaperMediaEvent | null = null;
  private playbackError: string | null = null;
  private runtimePaused = false;
  private playRequested = false;

  constructor(
    private readonly loadAsset: (asset: WallpaperAsset) => Promise<void>,
    private readonly maxPreloadedAssets = 6
  ) {}

  get current(): WallpaperAsset | null {
    return this.currentAsset;
  }

  get snapshot(): WallpaperPlaybackSnapshot {
    return {
      state: this.playbackState,
      current: this.currentAsset,
      previous: this.previousAsset,
      fallback: this.fallbackAsset,
      lastEvent: this.lastMediaEvent,
      error: this.playbackError,
      runtimePaused: this.runtimePaused
    };
  }

  subscribe(listener: (snapshot: WallpaperPlaybackSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  preload(asset: WallpaperAsset): Promise<void> {
    return this.ensureLoaded(asset);
  }

  async select(asset: WallpaperAsset): Promise<WallpaperSelectionResult> {
    if (this.currentAsset?.id === asset.id) {
      return { changed: false, stale: false, current: this.currentAsset, previous: null };
    }

    const requestId = ++this.requestSequence;
    this.fallbackAsset = null;
    this.playbackError = null;
    this.lastMediaEvent = null;
    this.playRequested = false;
    this.setState("loading");
    try {
      await this.ensureLoaded(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (requestId === this.requestSequence) {
        this.fail(asset, null, message);
      }
      return {
        changed: false,
        stale: requestId !== this.requestSequence,
        current: this.currentAsset,
        previous: null,
        error: message
      };
    }

    if (requestId !== this.requestSequence) {
      return { changed: false, stale: true, current: this.currentAsset, previous: null };
    }

    const previous = this.currentAsset;
    this.previousAsset = previous;
    this.currentAsset = asset;
    this.fallbackAsset = null;
    this.playbackError = null;
    this.lastMediaEvent = null;
    this.playRequested = false;
    this.setState(asset.type === "video" ? (this.runtimePaused ? "paused" : "loading") : (this.runtimePaused ? "paused" : "playing"));
    return { changed: true, stale: false, current: asset, previous };
  }

  pause(): void {
    if (this.runtimePaused) return;
    this.runtimePaused = true;
    if (this.playbackState !== "idle" && this.playbackState !== "error" && this.playbackState !== "fallback") {
      this.setState("paused");
    }
  }

  resume(): void {
    if (!this.runtimePaused) return;
    this.runtimePaused = false;
    if (!this.currentAsset || this.playbackState === "error" || this.playbackState === "fallback") return;
    this.playRequested = false;
    this.setState(this.currentAsset.type === "video" ? "loading" : "playing");
  }

  requestPlay(assetId: string): boolean {
    if (
      this.runtimePaused ||
      this.playRequested ||
      this.playbackState !== "loading" ||
      this.currentAsset?.id !== assetId ||
      this.currentAsset.type !== "video"
    ) {
      return false;
    }
    this.playRequested = true;
    return true;
  }

  handleMediaEvent(assetId: string, event: WallpaperMediaEvent, error?: string): void {
    if (this.currentAsset?.id !== assetId || this.currentAsset.type !== "video") return;
    if (this.playbackState === "error" || this.playbackState === "fallback") return;

    this.lastMediaEvent = event;
    if (event === "error" || event === "stalled") {
      this.fail(this.currentAsset, event, error ?? `Wallpaper video ${event}: ${assetId}`);
      return;
    }
    if (event === "playing") {
      this.setState(this.runtimePaused ? "paused" : "playing");
      return;
    }
    if (event === "pause") {
      this.setState("paused");
      return;
    }
    if (event === "ended") {
      this.setState(this.runtimePaused ? "paused" : "loading");
      return;
    }
    this.setState(this.runtimePaused ? "paused" : "loading");
  }

  private ensureLoaded(asset: WallpaperAsset): Promise<void> {
    const cached = this.loads.get(asset.id);
    if (cached) {
      this.loads.delete(asset.id);
      this.loads.set(asset.id, cached);
      return cached;
    }

    const pending = this.loadAsset(asset).catch((error) => {
      this.loads.delete(asset.id);
      throw error;
    });
    this.loads.set(asset.id, pending);
    this.evictExcess(asset.id);
    return pending;
  }

  private fail(asset: WallpaperAsset, event: WallpaperMediaEvent | null, message: string): void {
    this.lastMediaEvent = event;
    this.playbackError = message;
    this.playRequested = true;
    this.setState("error");

    const poster = asset.posterSrc
      ? { id: `${asset.id}:poster`, type: "image" as const, src: asset.posterSrc }
      : null;
    this.fallbackAsset = poster ?? (this.previousAsset?.type === "image" ? this.previousAsset : null);
    if (this.fallbackAsset || asset.type === "video") {
      this.setState("fallback");
    }
  }

  private setState(state: WallpaperPlaybackState): void {
    this.playbackState = state;
    const snapshot = this.snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }

  private evictExcess(protectedId: string): void {
    const limit = Math.max(2, Math.round(this.maxPreloadedAssets));
    while (this.loads.size > limit) {
      const candidate = this.loads.keys().next().value as string | undefined;
      if (!candidate) return;
      if (candidate === protectedId || candidate === this.currentAsset?.id) {
        const value = this.loads.get(candidate);
        this.loads.delete(candidate);
        if (value) this.loads.set(candidate, value);
        if ([...this.loads.keys()].every((id) => id === protectedId || id === this.currentAsset?.id)) return;
        continue;
      }
      this.loads.delete(candidate);
    }
  }
}

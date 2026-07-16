export interface WallpaperAsset {
  id: string;
  type: "image" | "video";
  src: string;
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
  private requestSequence = 0;
  private currentAsset: WallpaperAsset | null = null;

  constructor(private readonly loadAsset: (asset: WallpaperAsset) => Promise<void>) {}

  get current(): WallpaperAsset | null {
    return this.currentAsset;
  }

  preload(asset: WallpaperAsset): Promise<void> {
    return this.ensureLoaded(asset);
  }

  async select(asset: WallpaperAsset): Promise<WallpaperSelectionResult> {
    if (this.currentAsset?.id === asset.id) {
      return { changed: false, stale: false, current: this.currentAsset, previous: null };
    }

    const requestId = ++this.requestSequence;
    try {
      await this.ensureLoaded(asset);
    } catch (error) {
      return {
        changed: false,
        stale: requestId !== this.requestSequence,
        current: this.currentAsset,
        previous: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    if (requestId !== this.requestSequence) {
      return { changed: false, stale: true, current: this.currentAsset, previous: null };
    }

    const previous = this.currentAsset;
    this.currentAsset = asset;
    return { changed: true, stale: false, current: asset, previous };
  }

  private ensureLoaded(asset: WallpaperAsset): Promise<void> {
    const cached = this.loads.get(asset.id);
    if (cached) {
      return cached;
    }

    const pending = this.loadAsset(asset).catch((error) => {
      this.loads.delete(asset.id);
      throw error;
    });
    this.loads.set(asset.id, pending);
    return pending;
  }
}

export type WallpaperRenderProfile = "quality" | "balanced" | "battery-saver";

export interface WallpaperRenderScaleInput {
  cssWidth: number;
  cssHeight: number;
  devicePixelRatio: number;
  profile: WallpaperRenderProfile;
}

const PROFILE_LIMITS: Record<WallpaperRenderProfile, { maxScale: number; maxPixels: number }> = {
  quality: { maxScale: 2, maxPixels: 14_000_000 },
  balanced: { maxScale: 1.5, maxPixels: 8_000_000 },
  "battery-saver": { maxScale: 1, maxPixels: 4_200_000 }
};

export function wallpaperRenderScale(input: WallpaperRenderScaleInput): number {
  const width = Math.max(1, input.cssWidth);
  const height = Math.max(1, input.cssHeight);
  const dpr = Math.max(1, Math.min(4, input.devicePixelRatio || 1));
  const limits = PROFILE_LIMITS[input.profile];
  const pixelBudgetScale = Math.sqrt(limits.maxPixels / (width * height));
  return Math.max(0.75, Math.min(dpr, limits.maxScale, pixelBudgetScale));
}

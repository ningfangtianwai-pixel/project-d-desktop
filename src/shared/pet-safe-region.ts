import type { PetWindowBounds, WallpaperSafeRegion } from "./types.js";

export interface DesktopDisplayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function petBoundsInsideSafeRegion(
  petBounds: PetWindowBounds,
  displayBounds: DesktopDisplayBounds,
  safeRegion: WallpaperSafeRegion
): boolean {
  if (displayBounds.width <= 0 || displayBounds.height <= 0) return false;
  const centerX = petBounds.x + petBounds.width / 2;
  const centerY = petBounds.y + petBounds.height / 2;
  const left = displayBounds.x + displayBounds.width * clampUnit(safeRegion.left);
  const right = displayBounds.x + displayBounds.width * clampUnit(safeRegion.right);
  const top = displayBounds.y + displayBounds.height * clampUnit(safeRegion.top);
  const bottom = displayBounds.y + displayBounds.height * clampUnit(safeRegion.bottom);
  return centerX >= left && centerX <= right && centerY >= top && centerY <= bottom;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

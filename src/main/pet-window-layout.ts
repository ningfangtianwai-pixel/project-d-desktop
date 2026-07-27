import type { PetWindowBounds, WallpaperSafeRegion } from "../shared/types.js";

export interface PetDisplayWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function fitPetWindowToWorkArea(bounds: PetWindowBounds, workArea: PetDisplayWorkArea): PetWindowBounds {
  const shortestSide = Math.max(1, Math.min(workArea.width, workArea.height));
  const maximumSize = Math.max(180, Math.min(340, Math.floor(shortestSide * 0.38)));
  const minimumSize = Math.min(230, maximumSize);
  const width = clamp(Math.round(bounds.width), minimumSize, maximumSize);
  const height = clamp(Math.round(bounds.height), minimumSize, maximumSize);
  const x = clamp(Math.round(bounds.x), workArea.x, workArea.x + workArea.width - width);
  const y = clamp(Math.round(bounds.y), workArea.y, workArea.y + workArea.height - height);
  return { x, y, width, height };
}

export function defaultPetWindowForWorkArea(workArea: PetDisplayWorkArea, safeRegion?: WallpaperSafeRegion): PetWindowBounds {
  const requested = Math.min(250, Math.max(180, Math.floor(Math.min(workArea.width, workArea.height) * 0.32)));
  const region = safeRegion ?? { left: 0.08, top: 0.12, right: 0.92, bottom: 0.94, petAnchor: "right" as const };
  const safeLeft = workArea.x + Math.round(workArea.width * clampUnit(region.left));
  const safeRight = workArea.x + Math.round(workArea.width * clampUnit(region.right));
  const safeTop = workArea.y + Math.round(workArea.height * clampUnit(region.top));
  const safeBottom = workArea.y + Math.round(workArea.height * clampUnit(region.bottom));
  const anchorX = region.petAnchor === "left" ? safeLeft + 18 : safeRight - requested - 28;
  return fitPetWindowToWorkArea({
    x: anchorX,
    y: safeBottom - requested - 24,
    width: requested,
    height: requested
  }, {
    x: safeLeft,
    y: safeTop,
    width: Math.max(requested, safeRight - safeLeft),
    height: Math.max(requested, safeBottom - safeTop)
  });
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

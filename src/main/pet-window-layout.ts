import type { PetWindowBounds } from "../shared/types.js";

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

export function defaultPetWindowForWorkArea(workArea: PetDisplayWorkArea): PetWindowBounds {
  const requested = Math.min(250, Math.max(180, Math.floor(Math.min(workArea.width, workArea.height) * 0.32)));
  return fitPetWindowToWorkArea({
    x: workArea.x + workArea.width - requested - 28,
    y: workArea.y + workArea.height - requested - 24,
    width: requested,
    height: requested
  }, workArea);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

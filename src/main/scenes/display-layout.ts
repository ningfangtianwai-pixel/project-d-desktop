import type { DisplayWorkAreaSnapshot, SceneContainerRect } from "../../shared/types.js";

const MIN_LEFT = 12;
const MIN_TOP = 76;
const MIN_WIDTH = 180;
const MIN_HEIGHT = 120;

export interface RuntimeDisplay {
  displayId: string;
  scaleFactor: number;
  isPrimary: boolean;
  bounds: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
}

export function snapshotDisplays(sceneId: string, displays: RuntimeDisplay[]): DisplayWorkAreaSnapshot[] {
  return displays.map((display) => ({ ...display, sceneId }));
}

export function restoreContainerRect(
  saved: SceneContainerRect,
  savedDisplays: DisplayWorkAreaSnapshot[] = [],
  currentDisplays: RuntimeDisplay[] = []
): SceneContainerRect {
  if (currentDisplays.length === 0 || !saved.displayId || !saved.workAreaWidth || !saved.workAreaHeight) {
    return saved;
  }

  const savedDisplay = savedDisplays.find((display) => display.displayId === saved.displayId);
  const matchingDisplay = currentDisplays.find((display) => display.displayId === saved.displayId);
  const targetDisplay = (matchingDisplay?.isPrimary ? matchingDisplay : undefined)
    ?? currentDisplays.find((display) => display.isPrimary)
    ?? currentDisplays[0];
  const savedWidth = Math.max(1, saved.workAreaWidth ?? savedDisplay?.workArea.width ?? targetDisplay.workArea.width);
  const savedHeight = Math.max(1, saved.workAreaHeight ?? savedDisplay?.workArea.height ?? targetDisplay.workArea.height);
  const widthRatio = targetDisplay.workArea.width / savedWidth;
  const heightRatio = targetDisplay.workArea.height / savedHeight;
  const width = clamp(Math.round(saved.width * widthRatio), MIN_WIDTH, Math.max(MIN_WIDTH, targetDisplay.workArea.width - MIN_LEFT * 2));
  const height = clamp(Math.round(saved.height * heightRatio), MIN_HEIGHT, Math.max(MIN_HEIGHT, targetDisplay.workArea.height - MIN_TOP - MIN_LEFT));
  const positionX = clamp(
    Math.round(saved.positionX * widthRatio),
    MIN_LEFT,
    Math.max(MIN_LEFT, targetDisplay.workArea.width - width - MIN_LEFT)
  );
  const positionY = clamp(
    Math.round(saved.positionY * heightRatio),
    MIN_TOP,
    Math.max(MIN_TOP, targetDisplay.workArea.height - height - MIN_LEFT)
  );

  return {
    ...saved,
    displayId: targetDisplay.displayId,
    scaleFactor: targetDisplay.scaleFactor,
    workAreaWidth: targetDisplay.workArea.width,
    workAreaHeight: targetDisplay.workArea.height,
    positionX,
    positionY,
    width,
    height
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

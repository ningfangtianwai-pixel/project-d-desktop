const assert = require("node:assert/strict");
const test = require("node:test");

const { defaultPetWindowForWorkArea, fitPetWindowToWorkArea } = require("../dist/main/pet-window-layout.js");
const { petBoundsInsideSafeRegion } = require("../dist/shared/pet-safe-region.js");
const { wallpaperSafeRegion } = require("../dist/shared/wallpaper-library.js");

test("pet remains visible on a small external display", () => {
  const area = { x: 1920, y: 0, width: 1280, height: 680 };
  const fitted = fitPetWindowToWorkArea({ x: 3100, y: 600, width: 340, height: 340 }, area);
  assert.ok(fitted.width <= Math.floor(680 * 0.38));
  assert.ok(fitted.x >= area.x && fitted.x + fitted.width <= area.x + area.width);
  assert.ok(fitted.y >= area.y && fitted.y + fitted.height <= area.y + area.height);
});

test("pet defaults inside a portrait monitor with a negative desktop origin", () => {
  const area = { x: -1080, y: -400, width: 1080, height: 1920 };
  const fitted = defaultPetWindowForWorkArea(area);
  assert.ok(fitted.x >= area.x && fitted.x + fitted.width <= 0);
  assert.ok(fitted.y >= area.y && fitted.y + fitted.height <= 1520);
});

test("pet default anchor follows the selected wallpaper safe region", () => {
  const area = { x: 0, y: 0, width: 1920, height: 1080 };
  const left = defaultPetWindowForWorkArea(area, wallpaperSafeRegion("anime-lakeside-station"));
  const right = defaultPetWindowForWorkArea(area, wallpaperSafeRegion("anime-seaside-town"));
  assert.ok(left.x < area.width / 2, `expected left anchor, got ${left.x}`);
  assert.ok(right.x > area.width / 2, `expected right anchor, got ${right.x}`);
  assert.ok(left.y >= 0 && right.y >= 0);
});

test("pet safe-region consent check distinguishes a subject obstruction", () => {
  const display = { x: 0, y: 0, width: 1920, height: 1080 };
  const region = { left: 0.08, top: 0.12, right: 0.44, bottom: 0.94, petAnchor: "left" };
  assert.equal(petBoundsInsideSafeRegion({ x: 80, y: 760, width: 220, height: 220 }, display, region), true);
  assert.equal(petBoundsInsideSafeRegion({ x: 1320, y: 760, width: 220, height: 220 }, display, region), false);
});

const assert = require("node:assert/strict");
const test = require("node:test");

const { defaultPetWindowForWorkArea, fitPetWindowToWorkArea } = require("../dist/main/pet-window-layout.js");

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

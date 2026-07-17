const assert = require("node:assert/strict");
const test = require("node:test");

const { wallpaperRenderScale } = require("../dist/shared/wallpaper-render-scale.js");

test("mixed-DPI wallpaper rendering respects quality and battery budgets", () => {
  assert.equal(wallpaperRenderScale({ cssWidth: 1536, cssHeight: 864, devicePixelRatio: 1.25, profile: "quality" }), 1.25);
  assert.equal(wallpaperRenderScale({ cssWidth: 1920, cssHeight: 1080, devicePixelRatio: 2, profile: "battery-saver" }), 1);
  assert.ok(wallpaperRenderScale({ cssWidth: 3840, cssHeight: 2160, devicePixelRatio: 2, profile: "balanced" }) <= 1);
});

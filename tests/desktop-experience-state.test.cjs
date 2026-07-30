const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_DESKTOP_EXPERIENCE,
  enterImmersive,
  enterNative,
  enterClean,
  enterSafe,
  openDesktopSurface,
  closeDesktopSurface
} = require("../dist/shared/desktop-experience.js");

test("starts in native mode", () => {
  assert.equal(DEFAULT_DESKTOP_EXPERIENCE.mode, "native");
  assert.equal(DEFAULT_DESKTOP_EXPERIENCE.activeSurface, null);
});

test("native -> immersive", () => {
  const state = enterImmersive();
  assert.equal(state.mode, "immersive");
  assert.equal(state.activeSurface, null);
});

test("immersive -> task (search)", () => {
  const state = openDesktopSurface("search");
  assert.equal(state.mode, "task");
  assert.equal(state.activeSurface, "search");
});

test("immersive -> task (organize)", () => {
  const state = openDesktopSurface("organize");
  assert.equal(state.mode, "task");
  assert.equal(state.activeSurface, "organize");
});

test("task -> immersive (closeSurface)", () => {
  const task = openDesktopSurface("search");
  const immersive = closeDesktopSurface();
  assert.equal(immersive.mode, "immersive");
  assert.equal(immersive.activeSurface, null);
});

test("immersive -> clean", () => {
  const state = enterClean();
  assert.equal(state.mode, "clean");
  assert.equal(state.activeSurface, null);
});

test("any -> safe", () => {
  const safe = enterSafe();
  assert.equal(safe.mode, "safe");
  assert.equal(safe.activeSurface, null);
});

test("safe -> native (restore)", () => {
  const native = enterNative();
  assert.equal(native.mode, "native");
  assert.equal(native.activeSurface, null);
});

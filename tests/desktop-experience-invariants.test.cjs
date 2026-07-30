const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_DESKTOP_EXPERIENCE,
  enterImmersive,
  openDesktopSurface,
  closeDesktopSurface,
  enterClean,
  enterSafe
} = require("../dist/shared/desktop-experience.js");

test("native mode must have null activeSurface", () => {
  assert.equal(DEFAULT_DESKTOP_EXPERIENCE.activeSurface, null);
});

test("immersive mode must have null activeSurface", () => {
  const state = enterImmersive();
  assert.equal(state.activeSurface, null);
});

test("task mode must have exactly one non-null activeSurface", () => {
  const state = openDesktopSurface("search");
  assert.notEqual(state.activeSurface, null);
  assert.equal(state.mode, "task");
});

test("clean mode must have null activeSurface", () => {
  const state = enterClean();
  assert.equal(state.activeSurface, null);
});

test("safe mode must have null activeSurface", () => {
  const state = enterSafe();
  assert.equal(state.activeSurface, null);
});

test("closeSurface returns immersive with null surface", () => {
  const state = closeDesktopSurface();
  assert.equal(state.mode, "immersive");
  assert.equal(state.activeSurface, null);
});

test("two surfaces cannot coexist — second overwrites first", () => {
  const first = openDesktopSurface("search");
  const second = openDesktopSurface("organize");
  assert.equal(second.activeSurface, "organize");
  assert.equal(first.activeSurface, "search");
});

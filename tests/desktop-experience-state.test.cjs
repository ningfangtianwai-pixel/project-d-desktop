const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_DESKTOP_EXPERIENCE,
  closeDesktopSurface,
  modeForDesktopStatus,
  openDesktopSurface
} = require("../dist/shared/desktop-experience.js");

test("wallpaper-first experience opens an explicit task surface", () => {
  assert.deepEqual(DEFAULT_DESKTOP_EXPERIENCE, { mode: "quiet", activeSurface: null });
  assert.deepEqual(openDesktopSurface("organize"), { mode: "task", activeSurface: "organize" });
  assert.deepEqual(openDesktopSurface("assistant"), { mode: "task", activeSurface: "assistant" });
});

test("closing a task surface returns to the quiet desktop", () => {
  assert.deepEqual(closeDesktopSurface(), { mode: "quiet", activeSurface: null });
});

test("desktop status maps to an experience mode", () => {
  assert.equal(modeForDesktopStatus("idle"), "quiet");
  assert.equal(modeForDesktopStatus("active"), "task");
  assert.equal(modeForDesktopStatus("safe-mode"), "safe");
  assert.equal(modeForDesktopStatus("error"), "attention");
});

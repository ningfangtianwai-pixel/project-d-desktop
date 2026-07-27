const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  DEFAULT_DESKTOP_EXPERIENCE,
  closeDesktopSurface,
  modeForDesktopStatus,
  openDesktopSurface
} = require("../dist/shared/desktop-experience.js");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

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

test("renderer keeps task surfaces explicit and preserves the wallpaper stage", () => {
  const app = read("src/renderer/App.vue");
  const styles = read("src/renderer/styles.css");
  assert.match(app, /class="wallpaper-stage"|<WallpaperStage \/>/);
  assert.match(app, /data-experience-mode/);
  assert.match(app, /activeTaskSurface === 'wallpaper'/);
  assert.match(app, /Escape/);
  for (const surface of ["search", "organize", "inbox", "assistant", "wallpaper"]) {
    assert.match(app, new RegExp(`openDesktopSurface\\('${surface}'\\)`));
  }
  assert.match(styles, /data-task-surface="search"/);
  assert.match(styles, /data-task-surface="assistant"/);
  assert.match(styles, /wallpaper-task-card/);
});

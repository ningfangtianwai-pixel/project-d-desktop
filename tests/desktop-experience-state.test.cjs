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

test("renderer exposes an Escape path for clean desktop recovery", () => {
  const source = read("src/renderer/App.vue");
  assert.match(source, /experienceMode\.value === "clean"/);
  assert.match(source, /window\.projectD\.exitCleanDesktop\(\)/);
});

test("ambient controls keep fixed viewport anchoring", () => {
  const source = read("src/renderer/styles.css");
  assert.match(source, /\.app-shell > \.ambient-edge-rail,[\s\S]*position: fixed/);
  assert.match(source, /\.app-shell > \.ambient-status-capsule/);
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

test("wallpaper studio previews Live Photo before committing the import", () => {
  const source = read("src/renderer/views/WallpaperPage.vue");
  assert.match(source, /wallpaper-filmstrip/);
  assert.match(source, /wallpaper-inspector/);
  assert.match(source, /prepareLivePhotoImport/);
  assert.match(source, /confirmLivePhotoImport/);
  assert.match(source, /cancelLivePhotoPreview/);
  assert.match(source, /loadeddata/);
  assert.match(source, /assignWallpaperToDisplay/);
});

test("Live Photo has no direct-copy IPC bypass", () => {
  const main = read("src/main/main.ts");
  const ipc = read("src/main/ipc/settings-ipc.ts");
  const preload = read("src/preload/preload.ts");
  assert.doesNotMatch(main, /WALLPAPER_IMPORT_LIVE_PHOTO/);
  assert.doesNotMatch(ipc, /WALLPAPER_IMPORT_LIVE_PHOTO/);
  assert.doesNotMatch(preload, /WALLPAPER_IMPORT_LIVE_PHOTO/);
  assert.match(main, /prepareLivePhotoImportFromDialogs/);
  assert.match(main, /confirmLivePhotoImport/);
});

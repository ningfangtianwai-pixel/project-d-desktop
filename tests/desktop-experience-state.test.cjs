const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  DEFAULT_DESKTOP_EXPERIENCE,
  closeDesktopSurface,
  enterClean,
  enterImmersive,
  enterNative,
  enterSafe,
  modeForDesktopStatus,
  openDesktopSurface
} = require("../dist/shared/desktop-experience.js");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("wallpaper-first experience opens an explicit task surface", () => {
  assert.deepEqual(DEFAULT_DESKTOP_EXPERIENCE, { mode: "native", interaction: "idle", activeSurface: null });
  assert.deepEqual(enterImmersive(), { mode: "immersive", interaction: "idle", activeSurface: null });
  assert.deepEqual(openDesktopSurface("organize"), { mode: "task", interaction: "focused", activeSurface: "organize" });
  assert.deepEqual(openDesktopSurface("assistant"), { mode: "task", interaction: "focused", activeSurface: "assistant" });
});

test("closing a task surface returns to the immersive desktop", () => {
  assert.deepEqual(closeDesktopSurface(), { mode: "immersive", interaction: "idle", activeSurface: null });
});

test("the experience model exposes explicit native, clean, and safe states", () => {
  assert.deepEqual(enterNative(), { mode: "native", interaction: "idle", activeSurface: null });
  assert.deepEqual(enterClean(), { mode: "clean", interaction: "idle", activeSurface: null });
  assert.deepEqual(enterSafe(), { mode: "safe", interaction: "attention", activeSurface: null });
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
  assert.equal(modeForDesktopStatus("idle"), "native");
  assert.equal(modeForDesktopStatus("active"), "immersive");
  assert.equal(modeForDesktopStatus("safe-mode"), "safe");
  assert.equal(modeForDesktopStatus("error"), "safe");
});

test("renderer keeps task surfaces explicit and preserves the wallpaper stage", () => {
  const app = read("src/renderer/App.vue");
  const rail = read("src/renderer/components/EdgeRail.vue");
  const scene = read("src/renderer/components/SceneSurface.vue");
  const styles = read("src/renderer/styles.css");
  assert.match(app, /class="wallpaper-stage"|<WallpaperStage \/>/);
  assert.match(app, /data-experience-mode/);
  assert.match(app, /activeTaskSurface === 'scene'/);
  assert.match(app, /Escape/);
  for (const surface of ["search", "organize", "scene", "assistant"]) {
    assert.match(rail, new RegExp(`surface: "${surface}"`));
  }
  assert.match(styles, /data-task-surface="search"/);
  assert.match(styles, /data-task-surface="assistant"/);
  assert.match(styles, /data-task-surface="scene"/);
  assert.match(styles, /scene-surface/);
  assert.match(scene, /getWorkspaceScenes/);
  assert.match(scene, /applyWorkspaceScene/);
  assert.match(scene, /saveWorkspaceScene/);
  assert.match(scene, /emit\("applied"\)/);
});

test("V6 search surface exposes safe workspace actions and scene pinning", () => {
  const app = read("src/renderer/App.vue");
  const search = read("src/renderer/components/SearchSurface.vue");
  const assistant = read("src/renderer/components/AssistantSurface.vue");
  const organizer = read("src/renderer/components/OrganizerSurface.vue");
  const compatibility = read("src/renderer/components/CompatibilitySurface.vue");
  for (const method of [
    "openWorkspaceSearchResult",
    "revealWorkspaceSearchResult",
    "copyWorkspaceSearchResultPath",
    "addSearchResultToPortal",
    "pinSearchResultToScene"
  ]) {
    assert.match(app, new RegExp(`window\\.projectD\\.${method}`));
  }
  assert.match(search, /search-scene-picker/);
  assert.match(search, /选择要钉入的场景/);
  assert.match(app, /已授权只读门户/);
  assert.match(app, /ambient-suggestion/);
  assert.match(app, /openLatestSuggestionTask/);
  assert.match(app, /activeTaskSurface === 'assistant'/);
  assert.match(assistant, /ChatPanel/);
  assert.match(assistant, /无 Key 也可用/);
  assert.match(app, /activeTaskSurface === 'organize'/);
  assert.match(organizer, /先预览，再改变桌面/);
  assert.match(organizer, /executeInbox/);
  assert.match(app, /experienceMode === 'safe'/);
  assert.match(compatibility, /安全恢复路径/);
  assert.match(compatibility, /focusSearch/);
});

test("wallpaper studio previews Live Photo before committing the import", () => {
  const source = read("src/renderer/views/WallpaperPage.vue");
  assert.match(source, /wallpaper-filmstrip/);
  assert.match(source, /wallpaper-inspector/);
  assert.match(source, /statusTone/);
  assert.match(source, /正在应用：/);
  assert.match(source, /wallpaper-studio-toast.*data-tone/s);
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
  assert.match(main, /expectedWindows = hash === "#\/wallpaper"[\s\S]*mainWindow/);
  assert.match(ipc, /WALLPAPER_LIBRARY_GET/);
  assert.match(ipc, /WALLPAPER_APPLY/);
  assert.match(ipc, /\["#\/settings", "#\/wallpaper"\]/);
  assert.doesNotMatch(main, /WALLPAPER_IMPORT_LIVE_PHOTO/);
  assert.doesNotMatch(ipc, /WALLPAPER_IMPORT_LIVE_PHOTO/);
  assert.doesNotMatch(preload, /WALLPAPER_IMPORT_LIVE_PHOTO/);
  assert.match(main, /prepareLivePhotoImportFromDialogs/);
  assert.match(main, /confirmLivePhotoImport/);
});

test("wallpaper library attaches safe regions before pet placement can use them", () => {
  const source = read("src/main/wallpaper-library-service.ts");
  assert.match(source, /WALLPAPER_LIBRARY, wallpaperSafeRegion/);
  assert.match(source, /safeRegion: wallpaperSafeRegion\(item\.id\)/);
  assert.match(source, /item\.safeRegion \?\? wallpaperSafeRegion\(null\)/);
  assert.match(source, /safeRegion: wallpaperSafeRegion\(null\)/);
});

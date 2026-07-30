const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("desktop IPC opens real entries, reports shell errors, and uses the live work area", () => {
  const source = read("src/main/ipc/desktop-ipc.ts");
  assert.match(source, /const error = await shell\.openPath\(file\.fullPath\)/);
  assert.match(source, /if \(error\)/);
  assert.match(source, /getDesktopWorkArea\(\)/);
  assert.match(source, /workArea\.width/);
  assert.match(source, /workArea\.height/);
  assert.match(source, /assertTrustedSender\(event, \["", "#\/settings"\]\)/);
  // The retired overlay route must no longer be a trusted IPC origin.
  assert.doesNotMatch(source, /#\/overlay/);
});

test("desktop organizer renders recognizable folders, previews them, and surfaces portal authorization", () => {
  const source = read("src/renderer/components/OrganizerSurface.vue");
  assert.match(source, /file\.category === 'folder'/);
  assert.match(source, /class="desktop-folder-art"/);
  assert.match(source, /preview\.type === ['"]folder['"]/);
  assert.match(source, /preview\.entries/);
  assert.match(source, /getFolderPortals\(\)/);
  assert.match(source, /organizer-portals/);
});

test("pet behavior exposes the expanded action set without synthetic outfit stickers", () => {
  const source = read("src/renderer/views/PetPage.vue");
  for (const action of ["walking", "dancing", "stretching", "looking", "surprised"]) {
    assert.match(source, new RegExp(`"${action}"`));
  }
  assert.match(source, /data-outfit/);
  assert.doesNotMatch(source, /pet-outfit-accessory/);
});

test("desktop scanner resolves folder shortcuts before categorizing them", () => {
  const source = read("src/main/file-scanner.ts");
  assert.match(source, /shell\.readShortcutLink/);
  assert.match(source, /target\.isDirectory\(\)/);
});

test("folder preview reads real directory entries and caps the result", () => {
  const source = read("src/main/main.ts");
  assert.match(source, /category === "folder"/);
  assert.match(source, /readdir\(folderPath, \{ withFileTypes: true \}\)/);
  assert.match(source, /\.slice\(0, 48\)/);
});

test("layout service preserves the selected 2, 4, 6, or 8 columns", () => {
  const source = read("src/main/database.ts");
  assert.match(source, /const columns = requestedColumns/);
  assert.match(source, /Math\.max\(112, Math\.min\(800, width\)\)/);
  assert.doesNotMatch(source, /Math\.min\(requestedColumns, maxColumns\)/);
});

test("pet bounds use the virtual display union instead of one work area", () => {
  const source = read("src/main/main.ts");
  assert.match(source, /screen\.getAllDisplays\(\)/);
  assert.match(source, /displays\.reduce\(\(area, display\)/);
  assert.match(source, /Math\.min\(area\.x, display\.bounds\.x\)/);
  assert.match(source, /Math\.max\(area\.x \+ area\.width, display\.bounds\.x \+ display\.bounds\.width\)/);
});

test("clean desktop uses a display sleep blocker and restores taskbar state", () => {
  const source = read("src/main/main.ts");
  assert.match(source, /powerSaveBlocker\.start\("prevent-display-sleep"\)/);
  assert.match(source, /setWindowsTaskbarVisible\(false\)/);
  assert.match(source, /restoreTaskbar\("application-shutdown"\)/);
  assert.doesNotMatch(source, /SendKeys|keybd_event|three.minutes/i);
});

test("shutdown drops temporary Live Photo preview drafts", () => {
  const source = read("src/main/main.ts");
  assert.match(source, /livePhotoImportDrafts\.clear\(\)/);
});

test("desktop icon recovery does not fail after visibility succeeds only because icon counting times out", () => {
  const source = read("src/main/windows-desktop-icons.ts");
  assert.match(source, /\$count = -1/);
  assert.match(source, /if \(\$null -eq \$desired\) \{ throw \}/);
});

test("idle shutdown does not persist a false deactivating crash marker", () => {
  const source = read("src/main/desktop-controller.ts");
  assert.match(source, /const requiresRecoveryMarker = this\.status\.mode !== "idle"/);
  assert.match(source, /if \(requiresRecoveryMarker\) \{\s*this\.setStatus\("deactivating"/);
});

test("task and safe states add a readable veil without changing immersive wallpaper", () => {
  const source = read("src/renderer/styles.css");
  assert.match(source, /\.app-shell\[data-experience-mode="task"\]::before/);
  assert.match(source, /backdrop-filter: blur\(2px\) saturate\(0\.94\)/);
  assert.match(source, /pointer-events: none/);
});

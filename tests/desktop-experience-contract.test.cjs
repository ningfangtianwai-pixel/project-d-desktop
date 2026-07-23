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
});

test("desktop overlay renders recognizable folders and surfaces open failures", () => {
  const source = read("src/renderer/views/OverlayPage.vue");
  assert.match(source, /file\.category === 'folder'/);
  assert.match(source, /class="desktop-folder-icon"/);
  assert.match(source, /message: error instanceof Error \? error\.message : String\(error\)/);
});

test("pet behavior exposes the expanded action set and manual outfits", () => {
  const source = read("src/renderer/views/PetPage.vue");
  for (const action of ["walking", "dancing", "stretching", "looking", "surprised"]) {
    assert.match(source, new RegExp(`"${action}"`));
  }
  assert.match(source, /data-outfit/);
  assert.match(source, /pet-outfit-accessory/);
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

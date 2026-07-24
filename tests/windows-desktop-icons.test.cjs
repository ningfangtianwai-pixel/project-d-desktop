const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  buildDesktopIconProbeScript,
  buildDesktopIconSyncScript,
  createDesktopIconRecoveryBatch
} = require("../dist/main/windows-desktop-icons.js");

test("desktop icon synchronization verifies the real Explorer list view", () => {
  const show = buildDesktopIconSyncScript(true);
  const hide = buildDesktopIconSyncScript(false);

  assert.match(show, /IsWindowVisible/);
  assert.match(show, /SendMessageTimeout/);
  assert.match(show, /1000/);
  assert.match(show, /SysListView32/);
  assert.match(show, /\$desired = \$true/);
  assert.match(show, /-Value 0/);
  assert.match(hide, /\$desired = \$false/);
  assert.match(hide, /-Value 1/);
  assert.match(show, /Desktop icon recovery watchdog exhausted retries/);
  const probe = buildDesktopIconProbeScript();
  assert.match(probe, /\$desired = \$null/);
  assert.doesNotMatch(probe, /Set-ItemProperty/);
});

test("manual recovery uses Explorer's icon command without killing Explorer", () => {
  const batch = createDesktopIconRecoveryBatch();
  assert.match(batch, /EncodedCommand/);
  assert.doesNotMatch(batch, /taskkill/i);
  assert.doesNotMatch(batch, /start explorer/i);
});

test("startup and shutdown do not trust only the cached desktop mode", () => {
  const controllerSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "main", "desktop-controller.ts"),
    "utf8"
  );
  const mainSource = fs.readFileSync(path.join(__dirname, "..", "src", "main", "main.ts"), "utf8");

  assert.match(controllerSource, /probeWindowsDesktopIcons\(\)/);
  assert.match(controllerSource, /if \(!iconState\.visible\)/);
  assert.match(mainSource, /if \(desktopController\) \{\s*desktopStatus = await desktopController\.recoverBeforeShutdown\(\)/);
  assert.doesNotMatch(
    controllerSource.match(/async recoverBeforeShutdown\(\)[\s\S]*?\n\s{2}}\n/)?.[0] ?? "",
    /boot_recovery_notice/
  );
});

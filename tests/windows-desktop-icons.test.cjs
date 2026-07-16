const assert = require("node:assert/strict");
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
  assert.match(show, /SysListView32/);
  assert.match(show, /\$desired = \$true/);
  assert.match(show, /-Value 0/);
  assert.match(hide, /\$desired = \$false/);
  assert.match(hide, /-Value 1/);
  assert.match(show, /exit 5/);
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

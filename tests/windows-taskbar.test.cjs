const assert = require("node:assert/strict");
const test = require("node:test");

const { buildWindowsTaskbarSyncScript } = require("../dist/main/windows-taskbar.js");

test("taskbar visibility uses bounded shell window operations without restarting Explorer", () => {
  const hide = buildWindowsTaskbarSyncScript(false);
  const show = buildWindowsTaskbarSyncScript(true);

  assert.match(hide, /Shell_TrayWnd/);
  assert.match(hide, /Shell_SecondaryTrayWnd/);
  assert.match(hide, /ShowWindowAsync/);
  assert.match(hide, /\$desired = \$false/);
  assert.match(show, /\$desired = \$true/);
  assert.doesNotMatch(show, /taskkill/i);
  assert.doesNotMatch(show, /Stop-Process/i);
});

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

test("taskbar recovery retries a slow shell transition within a bounded budget", () => {
  const source = buildWindowsTaskbarSyncScript(true, 8);
  assert.match(source, /for \(\$attempt = 1; \$attempt -le 8; \$attempt\+\+\)/);
  assert.match(source, /Start-Sleep -Milliseconds 250/);
  assert.match(source, /Start-Sleep -Milliseconds 500/);
  assert.match(source, /recovery exhausted retries/);
});

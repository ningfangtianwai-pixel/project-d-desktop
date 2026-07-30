const assert = require("node:assert/strict");
const test = require("node:test");

const { TaskbarRecoveryGuard, buildWindowsTaskbarSyncScript } = require("../dist/main/windows-taskbar.js");

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

test("taskbar recovery guard repairs only a Project D-owned visibility drift", async () => {
  let owned = false;
  let clean = false;
  let visible = false;
  let probes = 0;
  let restores = 0;
  const guard = new TaskbarRecoveryGuard({
    intervalMs: 1_000,
    isHiddenByOwner: () => owned,
    isHiddenAllowed: () => clean,
    probe: async () => { probes += 1; return { visible, taskbarCount: 1 }; },
    restore: async () => { restores += 1; visible = true; owned = false; return { visible: true, taskbarCount: 1 }; }
  });
  guard.start();
  try {
    await new Promise((resolve) => setTimeout(resolve, 1_050));
    assert.equal(probes, 0);

    owned = true;
    await new Promise((resolve) => setTimeout(resolve, 1_050));
    assert.equal(restores, 1);
    assert.equal(visible, true);

    owned = true;
    visible = false;
    clean = true;
    await new Promise((resolve) => setTimeout(resolve, 1_050));
    assert.equal(restores, 1);
  } finally {
    guard.stop();
  }
});

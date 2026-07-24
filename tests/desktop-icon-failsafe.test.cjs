const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "main", "windows-desktop-icons.ts"), "utf8");
const mainSource = fs.readFileSync(path.join(__dirname, "..", "src", "main", "main.ts"), "utf8");

test("desktop icon watchdog retries shell recovery after an unexpected process exit", () => {
  assert.match(source, /buildDesktopIconSyncScript\(true, 12\)/);
  assert.match(source, /for \(\$attempt = 1; \$attempt -le \$\{boundedAttempts\}; \$attempt\+\+\)/);
  assert.match(source, /Desktop icon recovery watchdog exhausted retries/);
  assert.match(source, /Start-Sleep -Seconds 1/);
});

test("Explorer restart and unexpected overlay closure fail closed to the native desktop", () => {
  assert.match(mainSource, /emergencyRestoreDesktop\("explorer-restarted"\)/);
  assert.match(mainSource, /emergencyRestoreDesktop\("overlay-window-closed"\)/);
  assert.match(mainSource, /overlay window closed while desktop was active; restoring native desktop/);
});

test("startup activation never hides the main window after a failed overlay creation", () => {
  const startup = mainSource.match(/async function activateDesktopOnStartup\(\): Promise<void> \{[\s\S]*?\n}\n\nasync function shutdownSafely/)?.[0] ?? "";
  assert.match(startup, /try \{/);
  assert.match(startup, /await emergencyRestoreDesktop\("startup-overlay-failed"\)/);
});

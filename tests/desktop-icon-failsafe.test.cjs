const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "main", "windows-desktop-icons.ts"), "utf8");
const controllerSource = fs.readFileSync(path.join(__dirname, "..", "src", "main", "desktop-controller.ts"), "utf8");
const mainSource = fs.readFileSync(path.join(__dirname, "..", "src", "main", "main.ts"), "utf8");

test("desktop icon watchdog retries shell recovery after an unexpected process exit", () => {
  assert.match(source, /Invoke-CimMethod -ClassName Win32_Process -MethodName Create/);
  assert.match(source, /spawn\("cmd\.exe"/);
  assert.ok(source.includes('"start", "", "/b", "powershell.exe"'));
  assert.match(source, /-File/);
  assert.match(source, /while \(Get-Process -Id \$parentProcessId/);
  assert.match(source, /buildDesktopIconSyncScript\(true, 12\)/);
  assert.match(source, /buildWindowsTaskbarSyncScript\(true\)/);
  assert.match(source, /for \(\$attempt = 1; \$attempt -le \$\{boundedAttempts\}; \$attempt\+\+\)/);
  assert.match(source, /Desktop icon recovery watchdog exhausted retries/);
  assert.match(source, /Start-Sleep -Seconds 1/);
  assert.match(source, /buildDesktopIconSyncScript\(visible, 12\)/);
  assert.match(source, /buildDesktopIconProbeScript\(3\)/);
});

test("Explorer restart and unexpected overlay closure fail closed to the native desktop", () => {
  assert.match(mainSource, /emergencyRestoreDesktop\("explorer-restarted"\)/);
  assert.match(mainSource, /emergencyRestoreDesktop\("overlay-window-closed"\)/);
  assert.match(mainSource, /overlay window closed while desktop was active; restoring native desktop/);
});

test("startup activation shows the immersive shell and fails closed to the native desktop", () => {
  const startup = mainSource.match(/async function activateDesktopOnStartup\(\): Promise<void> \{[\s\S]*?\n}\n\nasync function shutdownSafely/)?.[0] ?? "";
  assert.match(startup, /try \{/);
  assert.match(startup, /showMainWindow\(\)/);
  assert.match(startup, /sendMenuCommand\(MENU_COMMANDS\.ACTIVATE_DESKTOP\)/);
  assert.doesNotMatch(startup, /createOverlayWindow/);
  assert.match(startup, /await emergencyRestoreDesktop\("startup-shell-failed"\)/);
});

test("desktop recovery is armed before service initialization and reused by the controller", () => {
  assert.match(mainSource, /await armEarlyDesktopRecovery\(\)/);
  assert.match(mainSource, /new DesktopController\(database, logger, earlyDesktopRecoveryWatchdogProcessId\)/);
  assert.match(mainSource, /probeWindowsDesktopIcons\(\)/);
  assert.match(mainSource, /setWindowsDesktopIconsVisible\(true\)/);
});

test("unexpected boot recovery suppresses automatic desktop takeover", () => {
  assert.match(controllerSource, /autoActivationWasEnabled/);
  assert.match(controllerSource, /launchAtLoginWasEnabled/);
  assert.match(controllerSource, /setAppState\("auto_activate_on_start", "false"\)/);
  assert.match(controllerSource, /setAppState\("launch_at_login", "false"\)/);
  assert.match(controllerSource, /desktop_auto_activation_suppressed/);
  assert.match(controllerSource, /automatic desktop takeover disabled after unexpected exit/);
});

test("a live idle process also repairs hidden icons before a fatal exit", () => {
  const iconSource = fs.readFileSync(path.join(__dirname, "..", "src", "main", "windows-desktop-icons.ts"), "utf8");
  assert.match(iconSource, /class DesktopIconRecoveryGuard/);
  assert.match(mainSource, /desktopIconRecoveryGuard\.start\(\)/);
  assert.match(mainSource, /desktopIconRecoveryGuard\.stop\(\)/);
  assert.match(mainSource, /desktopController\?\.getStatus\(\)\.mode/);
  assert.match(mainSource, /cleanDesktopEscapeGuard\.isArmed\(\)/);
  assert.match(mainSource, /process\.on\("uncaughtException"/);
  assert.match(mainSource, /process\.on\("unhandledRejection"/);
  assert.match(mainSource, /restoreNativeDesktopState\(`fatal:\$\{kind\}`\)/);
});

test("shutdown gives Electron a bounded exit window and force-terminates only after cleanup", () => {
  const shutdown = mainSource.match(/if \(result === "completed"\) \{[\s\S]*?\n\s*\}/)?.[0] ?? "";
  assert.match(shutdown, /writeBootstrapLog\("shutdown completed"\)/);
  assert.match(shutdown, /process\.kill\(process\.pid, "SIGKILL"\)/);
  assert.doesNotMatch(shutdown, /app\.quit\(\)/);
  assert.doesNotMatch(shutdown, /forcedExit\.unref\(\)/);
});

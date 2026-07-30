"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

if (process.platform !== "win32") throw new Error("Packaged shortcut recovery QA requires Windows");

const root = path.resolve(__dirname, "..");
const executable = path.join(root, "release", "win-unpacked", "Project D.exe");
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(root, "artifacts", "qa", `packaged-force-kill-${runId}`);
const userDataDir = path.join(runDir, "user-data");
const shortcutPath = path.join(runDir, "Project D QA.lnk");
const reportPath = path.join(runDir, "report.json");
const qaToken = `--projectd-qa-run=${runId}`;
const iconModule = require(path.join(root, "dist", "main", "windows-desktop-icons.js"));
const taskbarModule = require(path.join(root, "dist", "main", "windows-taskbar.js"));

if (!fs.existsSync(executable)) throw new Error(`Packaged executable not found: ${executable}`);
fs.mkdirSync(userDataDir, { recursive: true });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const readText = (file) => { try { return fs.readFileSync(file, "utf8"); } catch { return ""; } };
const psQuote = (value) => `'${String(value).replaceAll("'", "''")}'`;

function runPowerShell(script) {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "PowerShell command failed");
  return result.stdout.trim();
}

function createShortcut() {
  runPowerShell(`
    $shell = New-Object -ComObject WScript.Shell;
    $shortcut = $shell.CreateShortcut(${psQuote(shortcutPath)});
    $shortcut.TargetPath = ${psQuote(executable)};
    $shortcut.WorkingDirectory = ${psQuote(root)};
    $shortcut.Arguments = ${psQuote(qaToken)};
    $shortcut.Save();
  `);
}

function launchShortcut() {
  runPowerShell(`Start-Process -FilePath ${psQuote(shortcutPath)}`);
}

function describeQaProcesses() {
  const token = qaToken.replace(/'/g, "''");
  const script = `@(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${token}*' -and $_.Name -match '^(electron|Project D)\\.exe$' } | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress)`;
  const raw = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "ignore"]
  }).stdout ?? "";
  try {
    const parsed = JSON.parse(raw.trim() || "[]");
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function stopQaTree() {
  for (const processInfo of describeQaProcesses()) {
    spawnSync("taskkill.exe", ["/PID", String(processInfo.ProcessId), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  }
}

async function waitForLog(needle, timeoutMs = 45_000, fileName = "app.log") {
  const logPath = path.join(userDataDir, "logs", fileName);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (readText(logPath).includes(needle)) return;
    await delay(400);
  }
  throw new Error(`Packaged shortcut did not log: ${needle}`);
}

async function waitForNoProcesses(timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (describeQaProcesses().length === 0) return;
    await delay(400);
  }
  throw new Error(`QA process tree remained: ${JSON.stringify(describeQaProcesses())}`);
}

async function waitForNativeState(timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const [icons, taskbar] = await Promise.all([
      iconModule.probeWindowsDesktopIcons(),
      taskbarModule.probeWindowsTaskbar()
    ]);
    if (icons.visible && taskbar.visible) return { icons, taskbar };
    await delay(500);
  }
  throw new Error("Windows native desktop state was not restored");
}

(async () => {
  let failure = null;
  let restored = null;
  let secondShutdown = false;
  try {
    createShortcut();
    process.env.PROJECTD_QA_USER_DATA_DIR = userDataDir;
    process.env.PROJECTD_QA_IDLE = "1";
    process.env.PROJECTD_DEMO_AUTORUN = "0";
    delete process.env.PROJECTD_QA_AUTO_QUIT_MS;
    launchShortcut();
    await waitForLog("core services ready");

    await Promise.all([
      iconModule.setWindowsDesktopIconsVisible(false),
      taskbarModule.setWindowsTaskbarVisible(false)
    ]);
    stopQaTree();
    restored = await waitForNativeState();
    await waitForNoProcesses();

    process.env.PROJECTD_QA_AUTO_QUIT_MS = "12000";
    launchShortcut();
    await waitForLog("core services ready");
    await waitForLog("shutdown completed", 35_000, "bootstrap.log");
    await waitForNoProcesses();
    secondShutdown = true;
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  } finally {
    stopQaTree();
    try { await iconModule.setWindowsDesktopIconsVisible(true); } catch { /* best effort final restore */ }
    try { await taskbarModule.setWindowsTaskbarVisible(true); } catch { /* best effort final restore */ }
  }

  const finalNative = await waitForNativeState().catch(() => null);
  const checks = {
    shortcutCreated: fs.existsSync(shortcutPath),
    packagedReady: readText(path.join(userDataDir, "logs", "app.log")).includes("core services ready"),
    iconsRestoredAfterForceKill: Boolean(restored?.icons.visible),
    taskbarRestoredAfterForceKill: Boolean(restored?.taskbar.visible),
    restartedFromSameShortcut: secondShutdown,
    finalNativeStateVisible: Boolean(finalNative?.icons.visible && finalNative.taskbar.visible),
    noProjectDProcesses: describeQaProcesses().length === 0,
    explorerHealthy: Boolean(finalNative?.icons.shellViewHandle && finalNative?.icons.listViewHandle)
  };
  const report = {
    schemaVersion: 1,
    kind: "packaged-shortcut-force-kill-recovery",
    startedAt: runId,
    finishedAt: new Date().toISOString(),
    passed: failure === null && Object.values(checks).every(Boolean),
    executable,
    shortcutPath,
    checks,
    failure
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

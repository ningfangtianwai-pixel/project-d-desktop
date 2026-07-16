const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const initSqlJs = require("sql.js");

const root = path.resolve(__dirname, "..");
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(root, "artifacts", "qa", `crash-restart-${runId}`);
const userDataDir = path.join(runDir, "user-data");
const reportPath = path.join(runDir, "report.json");
const electronPath = require("electron");
const qaToken = `--projectd-qa-run=${runId}`;
fs.mkdirSync(userDataDir, { recursive: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const readText = (file) => { try { return fs.readFileSync(file, "utf8"); } catch { return ""; } };

function launch(autoQuitMs) {
  const env = {
    ...process.env,
    PROJECTD_QA_USER_DATA_DIR: userDataDir,
    PROJECTD_QA_OPEN_SETTINGS: "1",
    PROJECTD_QA_AUTO_QUIT_MS: String(autoQuitMs)
  };
  delete env.ELECTRON_RUN_AS_NODE;
  return spawn(electronPath, [root, qaToken], { cwd: root, env, windowsHide: true, stdio: "ignore" });
}

async function waitForLogCount(child, needle, expected, timeoutMs = 40_000) {
  const logPath = path.join(userDataDir, "logs", "app.log");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Project D exited before readiness (${child.exitCode})`);
    const count = readText(logPath).split(needle).length - 1;
    if (count >= expected) return;
    await delay(400);
  }
  throw new Error(`Expected ${expected} occurrences of ${needle}`);
}

function waitForExit(child, timeoutMs = 30_000) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Restarted process did not exit on time")), timeoutMs);
    child.once("exit", (code) => { clearTimeout(timer); resolve(code); });
  });
}

function killTree(pid) {
  const result = spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, encoding: "utf8" });
  if (result.status !== 0 && !/not found|没有找到/i.test(`${result.stdout}\n${result.stderr}`)) {
    throw new Error(`Unable to kill Project D process tree: ${result.stderr || result.stdout}`);
  }
}

function killQaRun() {
  const escaped = qaToken.replace(/'/g, "''");
  const script = `Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'electron.exe' -and $_.CommandLine -like '*${escaped}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
  spawnSync("powershell.exe", ["-NoProfile", "-Command", script], { windowsHide: true, stdio: "ignore" });
}

async function inspectDatabase() {
  const databasePath = path.join(userDataDir, "database.sqlite");
  const SQL = await initSqlJs({ locateFile: (file) => require.resolve(`sql.js/dist/${file}`) });
  const db = new SQL.Database(fs.readFileSync(databasePath));
  const integrity = db.exec("PRAGMA integrity_check")[0]?.values[0]?.[0] ?? "missing";
  const desktopState = db.exec("SELECT value FROM app_state WHERE key='desktop_state'")[0]?.values[0]?.[0] ?? null;
  db.close();
  return { databasePath, integrity, desktopState };
}

(async () => {
  let first = null;
  let second = null;
  let failure = null;
  let database = null;
  const startedAt = new Date().toISOString();
  try {
    first = launch(120_000);
    await waitForLogCount(first, "core services ready", 1);
    const firstPid = first.pid;
    killTree(firstPid);
    await delay(2_000);

    second = launch(12_000);
    await waitForLogCount(second, "core services ready", 2);
    const exitCode = await waitForExit(second);
    if (exitCode !== 0) throw new Error(`Restarted Project D exited with code ${exitCode}`);
    database = await inspectDatabase();
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    if (first?.exitCode === null) killTree(first.pid);
    if (second?.exitCode === null) killTree(second.pid);
    killQaRun();
  }

  const appLog = readText(path.join(userDataDir, "logs", "app.log"));
  const bootstrapLog = readText(path.join(userDataDir, "logs", "bootstrap.log"));
  const startCount = appLog.split("application starting").length - 1;
  const readyCount = appLog.split("core services ready").length - 1;
  const checks = {
    forcedTerminationCompleted: Boolean(first),
    sameProfileRestarted: startCount >= 2,
    coreServicesReadyTwice: readyCount >= 2,
    databaseIntegrityOk: database?.integrity === "ok",
    desktopRestoredAfterRestart: database?.desktopState === "idle",
    gracefulSecondShutdown: bootstrapLog.includes("shutdown completed"),
    noDatabaseTempLeftBehind: !fs.existsSync(path.join(userDataDir, "database.sqlite.tmp"))
  };
  const passed = failure === null && Object.values(checks).every(Boolean);
  const report = {
    schemaVersion: 1,
    kind: "main-process-force-kill-restart",
    startedAt,
    finishedAt: new Date().toISOString(),
    passed,
    checks,
    database,
    startCount,
    readyCount,
    failure
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ passed, reportPath, checks, database, failure }, null, 2));
  process.exitCode = passed ? 0 : 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const executable = path.join(root, "release", "win-unpacked", "Project D.exe");
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(root, "artifacts", "qa", `packaged-smoke-${runId}`);
const userDataDir = path.join(runDir, "user-data");
const reportPath = path.join(runDir, "report.json");
const qaToken = `--projectd-qa-run=${runId}`;

if (!fs.existsSync(executable)) throw new Error(`Packaged executable not found: ${executable}`);
fs.mkdirSync(userDataDir, { recursive: true });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const readText = (file) => { try { return fs.readFileSync(file, "utf8"); } catch { return ""; } };

async function waitForReady(child, timeoutMs = 40_000) {
  const logPath = path.join(userDataDir, "logs", "app.log");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Packaged Project D exited before ready (${child.exitCode})`);
    if (readText(logPath).includes("core services ready")) return;
    await delay(400);
  }
  throw new Error("Packaged Project D did not report readiness within 40 seconds");
}

function waitForExit(child, timeoutMs = 45_000) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Packaged Project D did not exit on schedule")), timeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

function stopTree(pid) {
  spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
}

(async () => {
  let child = null;
  let failure = null;
  let exitCode = null;
  try {
    child = spawn(executable, [qaToken, "--projectd-start-hidden"], {
      cwd: root,
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        PROJECTD_QA_USER_DATA_DIR: userDataDir,
        PROJECTD_QA_AUTO_QUIT_MS: "20000"
      }
    });
    await waitForReady(child);
    exitCode = await waitForExit(child);
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    if (child?.exitCode === null) stopTree(child.pid);
  }

  const appLog = readText(path.join(userDataDir, "logs", "app.log"));
  const bootstrapLog = readText(path.join(userDataDir, "logs", "bootstrap.log"));
  const errorLog = readText(path.join(userDataDir, "logs", "error.log"));
  const checks = {
    processExitedCleanly: exitCode === 0,
    coreReadyLogged: appLog.includes("core services ready"),
    shutdownCompleted: bootstrapLog.includes("shutdown completed"),
    noErrorLogEntries: errorLog.trim().length === 0
  };
  const passed = failure === null && Object.values(checks).every(Boolean);
  const report = {
    schemaVersion: 1,
    kind: "packaged-runtime-smoke",
    startedAt: runId,
    finishedAt: new Date().toISOString(),
    passed,
    executable,
    exitCode,
    checks,
    failure
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ passed, reportPath, checks, failure }, null, 2));
  process.exitCode = passed ? 0 : 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const secondsArg = Number(process.argv[process.argv.indexOf("--seconds") + 1]);
const durationSeconds = Number.isFinite(secondsArg) ? Math.max(30, Math.round(secondsArg)) : 120;
const modeArg = process.argv[process.argv.indexOf("--mode") + 1];
const mode = modeArg === "idle" ? "idle" : "stress";
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(root, "artifacts", "qa", `soak-${runId}`);
const userDataDir = path.join(runDir, "user-data");
const reportPath = path.join(runDir, "report.json");
const electronPath = require("electron");
const qaToken = `--projectd-qa-run=${runId}`;

fs.mkdirSync(userDataDir, { recursive: true });

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readText(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return ""; }
}

async function waitForReady(child, timeoutMs = 40_000) {
  const logPath = path.join(userDataDir, "logs", "app.log");
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) throw new Error(`Project D exited before ready (${child.exitCode})`);
    if (readText(logPath).includes("core services ready")) return;
    await delay(500);
  }
  throw new Error("Project D did not report readiness within 40 seconds");
}

function sampleProcessTree(rootPid) {
  const script = `
$rootPid = ${Number(rootPid)}
$rows = Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId
$ids = [System.Collections.Generic.HashSet[int]]::new()
[void]$ids.Add($rootPid)
do {
  $before = $ids.Count
  foreach ($row in $rows) { if ($ids.Contains([int]$row.ParentProcessId)) { [void]$ids.Add([int]$row.ProcessId) } }
} while ($ids.Count -gt $before)
$processes = foreach ($id in $ids) { Get-Process -Id $id -ErrorAction SilentlyContinue }
[pscustomobject]@{
  at = [DateTimeOffset]::UtcNow.ToString('o')
  processCount = @($processes).Count
  workingSetBytes = [long](($processes | Measure-Object WorkingSet64 -Sum).Sum)
  privateBytes = [long](($processes | Measure-Object PrivateMemorySize64 -Sum).Sum)
  cpuSeconds = [double](($processes | Measure-Object CPU -Sum).Sum)
  handles = [long](($processes | Measure-Object Handles -Sum).Sum)
} | ConvertTo-Json -Compress
`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", script], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0 || !result.stdout.trim()) return null;
  return JSON.parse(result.stdout.trim());
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Project D soak process did not exit on time")), timeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
}

function stopTree(pid) {
  spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
}

function stopQaRun() {
  const escaped = qaToken.replace(/'/g, "''");
  const script = `Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'electron.exe' -and $_.CommandLine -like '*${escaped}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
  spawnSync("powershell.exe", ["-NoProfile", "-Command", script], { windowsHide: true, stdio: "ignore" });
}

(async () => {
  const env = {
    ...process.env,
    PROJECTD_QA_USER_DATA_DIR: userDataDir,
    PROJECTD_QA_OPEN_SETTINGS: "1",
    PROJECTD_QA_AUTO_QUIT_MS: String((durationSeconds + 8) * 1_000)
  };
  if (mode === "stress") env.PROJECTD_QA_SOAK = "1";
  else delete env.PROJECTD_QA_SOAK;
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(electronPath, [root, qaToken], { cwd: root, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  const startedAt = new Date().toISOString();
  const samples = [];
  let failure = null;
  try {
    await waitForReady(child);
    const samplingDeadline = Date.now() + durationSeconds * 1_000;
    while (Date.now() < samplingDeadline && child.exitCode === null) {
      const sample = sampleProcessTree(child.pid);
      if (sample?.processCount > 0) samples.push(sample);
      await delay(3_000);
    }
    const exitCode = await waitForExit(child, 20_000);
    if (exitCode !== 0) throw new Error(`Project D exited with code ${exitCode}`);
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    if (child.exitCode === null) stopTree(child.pid);
    stopQaRun();
  }

  const appLog = readText(path.join(userDataDir, "logs", "app.log"));
  const errorLog = readText(path.join(userDataDir, "logs", "error.log"));
  const bootstrapLog = readText(path.join(userDataDir, "logs", "bootstrap.log"));
  const warmSamples = samples.slice(Math.floor(samples.length * 0.2));
  const first = warmSamples[0] ?? samples[0] ?? null;
  const last = warmSamples.at(-1) ?? samples.at(-1) ?? null;
  const elapsedSeconds = first && last ? Math.max(1, (Date.parse(last.at) - Date.parse(first.at)) / 1_000) : 1;
  const memorySlopeMiBPerMinute = first && last
    ? ((last.privateBytes - first.privateBytes) / 1024 / 1024) / (elapsedSeconds / 60)
    : null;
  const cpuAveragePercent = first && last
    ? Math.max(0, ((last.cpuSeconds - first.cpuSeconds) / elapsedSeconds) * 100 / Math.max(1, os.cpus().length))
    : null;
  const peakPrivateMiB = samples.length ? Math.max(...samples.map((item) => item.privateBytes)) / 1024 / 1024 : null;
  const errorEntries = errorLog.split(/\r?\n/).filter((line) => line.includes('"level":"ERROR"')).length;
  const checks = {
    processExitedCleanly: failure === null,
    coreReadyLogged: appLog.includes("core services ready"),
    shutdownCompleted: bootstrapLog.includes("shutdown completed"),
    noErrorLogEntries: errorEntries === 0,
    memorySlopeWithinPreflightLimit: memorySlopeMiBPerMinute === null || memorySlopeMiBPerMinute < 100,
    peakPrivateMemoryWithinPreflightLimit: peakPrivateMiB === null || peakPrivateMiB < 1536,
    noSafeRendererRelaunch: !bootstrapLog.includes("--projectd-safe-renderer")
  };
  const passed = Object.values(checks).every(Boolean);
  const report = {
    schemaVersion: 1,
    kind: "accelerated-soak-preflight",
    mode,
    startedAt,
    finishedAt: new Date().toISOString(),
    requestedDurationSeconds: durationSeconds,
    sampleCount: samples.length,
    passed,
    limitation: "This accelerated run is a preflight and does not replace the required 24-hour soak.",
    metrics: { cpuAveragePercent, memorySlopeMiBPerMinute, peakPrivateMiB },
    checks,
    errorEntries,
    failure,
    samples,
    capturedOutput: { stdout: stdout.slice(-4_000), stderr: stderr.slice(-4_000) }
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ passed, reportPath, metrics: report.metrics, checks }, null, 2));
  process.exitCode = passed ? 0 : 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

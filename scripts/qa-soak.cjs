const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const secondsArg = Number(process.argv[process.argv.indexOf("--seconds") + 1]);
const durationSeconds = Number.isFinite(secondsArg) ? Math.max(30, Math.round(secondsArg)) : 120;
const modeArg = process.argv[process.argv.indexOf("--mode") + 1];
const mode = modeArg === "idle" ? "idle" : "stress";
const requestedProfile = durationSeconds >= 86_400 && mode === "idle"
  ? "idle-24h"
  : durationSeconds >= 14_400
    ? "interactive-4h"
    : "preflight";
const thresholds = requestedProfile === "idle-24h"
  ? { completionRatio: 0.995, memorySlopeMiBPerMinute: 1, peakPrivateMiB: 1024, cpuMedianPercent: 1, cpuP95Percent: 3 }
  : requestedProfile === "interactive-4h"
    ? { completionRatio: 0.99, memorySlopeMiBPerMinute: 4, peakPrivateMiB: 1536, cpuMedianPercent: 15, cpuP95Percent: 30 }
    : { completionRatio: 0.8, memorySlopeMiBPerMinute: 100, peakPrivateMiB: 1536, cpuMedianPercent: 1, cpuP95Percent: 3 };
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(root, "artifacts", "qa", `soak-${runId}`);
const userDataDir = path.join(runDir, "user-data");
const reportPath = path.join(runDir, "report.json");
const csvPath = path.join(runDir, "samples.csv");
const runtimeMetricsPath = path.join(runDir, "runtime-metrics.json");
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

function countQaProcesses() {
  const escaped = qaToken.replace(/'/g, "''");
  const script = `@((Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${escaped}*' -and $_.Name -match '^(electron|Project D)\\.exe$' })).Count`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", script], { encoding: "utf8", windowsHide: true });
  return result.status === 0 ? Number(result.stdout.trim()) : -1;
}

function toCsv(samples) {
  const header = "sampledAt,source,processId,cpuPercent,workingSetBytes,paused,profile";
  return [header, ...samples.map((sample) => [
    sample.sampledAt, sample.source, sample.processId, sample.cpuPercent,
    sample.workingSetBytes, sample.paused, sample.profile
  ].join(","))].join("\n") + "\n";
}

function aggregateSamples(samples) {
  const groups = new Map();
  for (const sample of samples) {
    const current = groups.get(sample.sampledAt) ?? { sampledAt: sample.sampledAt, cpuPercent: 0, workingSetBytes: 0 };
    current.cpuPercent += sample.cpuPercent;
    current.workingSetBytes += sample.workingSetBytes;
    groups.set(sample.sampledAt, current);
  }
  return [...groups.values()];
}

(async () => {
  const env = {
    ...process.env,
    PROJECTD_QA_USER_DATA_DIR: userDataDir,
    PROJECTD_QA_OPEN_SETTINGS: mode === "stress" ? "1" : "0",
    PROJECTD_QA_AUTO_QUIT_MS: String((durationSeconds + 8) * 1_000),
    PROJECTD_QA_METRICS_PATH: runtimeMetricsPath
  };
  if (mode === "stress") env.PROJECTD_QA_SOAK = "1";
  else {
    delete env.PROJECTD_QA_SOAK;
    env.PROJECTD_QA_IDLE = "1";
  }
  delete env.ELECTRON_RUN_AS_NODE;
  const childArgs = mode === "idle" ? [root, qaToken, "--projectd-start-hidden"] : [root, qaToken];
  const child = spawn(electronPath, childArgs, { cwd: root, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  let failure = null;
  try {
    await waitForReady(child);
    const samplingDeadline = Date.now() + durationSeconds * 1_000;
    while (Date.now() < samplingDeadline && child.exitCode === null) {
      await delay(500);
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
  const runtimeMetrics = JSON.parse(readText(runtimeMetricsPath) || "{\"samples\":[]}");
  const samples = Array.isArray(runtimeMetrics.samples) ? runtimeMetrics.samples : [];
  const aggregate = aggregateSamples(samples);
  const warmupSeconds = requestedProfile === "idle-24h" ? 300 : requestedProfile === "interactive-4h" ? 120 : 10;
  const stableAggregate = aggregate.filter((sample) => Date.parse(sample.sampledAt) >= startedAtMs + warmupSeconds * 1_000);
  const trendSamples = stableAggregate.length >= 2 ? stableAggregate : aggregate;
  const first = trendSamples[0] ?? null;
  const last = trendSamples.at(-1) ?? null;
  const elapsedSeconds = first && last ? Math.max(1, (Date.parse(last.sampledAt) - Date.parse(first.sampledAt)) / 1_000) : 1;
  const memorySlopeMiBPerMinute = first && last
    ? ((last.workingSetBytes - first.workingSetBytes) / 1024 / 1024) / (elapsedSeconds / 60)
    : null;
  const cpuAveragePercent = aggregate.length
    ? aggregate.reduce((total, sample) => total + sample.cpuPercent, 0) / aggregate.length
    : null;
  const cpuMedianPercent = runtimeMetrics.cpuMedianPercent ?? null;
  const cpuP95Percent = runtimeMetrics.cpuP95Percent ?? null;
  const peakPrivateMiB = runtimeMetrics.peakWorkingSetBytes ? runtimeMetrics.peakWorkingSetBytes / 1024 / 1024 : null;
  const finishedAtMs = Date.now();
  const actualDurationSeconds = Math.max(0, (finishedAtMs - startedAtMs) / 1_000);
  const completionRatio = actualDurationSeconds / durationSeconds;
  const isLongProfile = requestedProfile !== "preflight";
  const memoryTrendEvidenceSufficient = isLongProfile
    ? completionRatio >= thresholds.completionRatio && trendSamples.length >= 100
    : trendSamples.length >= 10;
  const errorEntries = errorLog.split(/\r?\n/).filter((line) => line.includes('"level":"ERROR"')).length;
  await delay(500);
  const residualProcessCount = countQaProcesses();
  const checks = {
    processExitedCleanly: failure === null,
    coreReadyLogged: appLog.includes("core services ready"),
    shutdownCompleted: bootstrapLog.includes("shutdown completed"),
    noErrorLogEntries: errorEntries === 0,
    requestedDurationCompleted: completionRatio >= thresholds.completionRatio,
    memoryTrendEvidenceAvailable: !isLongProfile || memoryTrendEvidenceSufficient,
    memorySlopeWithinLimit: !memoryTrendEvidenceSufficient || memorySlopeMiBPerMinute === null || memorySlopeMiBPerMinute <= thresholds.memorySlopeMiBPerMinute,
    peakPrivateMemoryWithinLimit: peakPrivateMiB === null || peakPrivateMiB <= thresholds.peakPrivateMiB,
    noSafeRendererRelaunch: !bootstrapLog.includes("--projectd-safe-renderer"),
    cpuMedianWithinProfileLimit: cpuMedianPercent === null || cpuMedianPercent <= thresholds.cpuMedianPercent,
    cpuP95WithinProfileLimit: cpuP95Percent === null || cpuP95Percent <= thresholds.cpuP95Percent,
    noResidualQaProcesses: residualProcessCount === 0
  };
  const passed = Object.values(checks).every(Boolean);
  const claimEligible = passed && isLongProfile && memoryTrendEvidenceSufficient;
  const report = {
    schemaVersion: 1,
    kind: "projectd-soak-evidence",
    mode,
    profile: requestedProfile,
    startedAt,
    finishedAt: new Date().toISOString(),
    requestedDurationSeconds: durationSeconds,
    actualDurationSeconds,
    completionRatio,
    sampleCount: samples.length,
    passed,
    claimEligible,
    limitation: claimEligible
      ? null
      : "Short or incomplete runs are preflight evidence only and do not establish 4-hour/24-hour stability.",
    thresholds,
    machine: {
      platform: os.platform(), release: os.release(), architecture: os.arch(),
      cpuModel: os.cpus()[0]?.model ?? "unknown", logicalCpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem()
    },
    metrics: { cpuAveragePercent, cpuMedianPercent, cpuP95Percent, memorySlopeMiBPerMinute, peakPrivateMiB, memoryTrendEvidenceSufficient, warmupSeconds },
    checks,
    residualProcessCount,
    errorEntries,
    failure,
    samples,
    capturedOutput: { stdout: stdout.slice(-4_000), stderr: stderr.slice(-4_000) }
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(csvPath, toCsv(samples), "utf8");
  console.log(JSON.stringify({ passed, reportPath, csvPath, metrics: report.metrics, checks }, null, 2));
  process.exitCode = passed ? 0 : 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

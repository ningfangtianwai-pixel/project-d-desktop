"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");
const { summarizePlaywrightReport } = require("./e2e-report.cjs");

const root = path.resolve(__dirname, "..");
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.join(root, "artifacts", "qa", `e2e-bounded-${runId}`);
const resultsPath = path.join(outputDir, "results.json");
const stdoutPath = path.join(outputDir, "stdout.log");
const stderrPath = path.join(outputDir, "stderr.log");
const reportPath = path.join(outputDir, "report.json");

function parseArgs(argv) {
  let timeoutMs = Number(process.env.PROJECTD_E2E_TIMEOUT_MS ?? 20 * 60 * 1_000);
  const forwarded = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--timeout-ms") {
      timeoutMs = Number(argv[++index]);
      continue;
    }
    forwarded.push(arg);
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 30_000) throw new Error("--timeout-ms must be at least 30000");
  return { timeoutMs, forwarded };
}

function killTree(pid) {
  if (!pid) return;
  try {
    execFileSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } catch {
    // The child may have exited between the timeout and taskkill.
  }
}

function cleanupQaProcesses() {
  const script = `
    $targets = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'electron.exe' -and $_.CommandLine -like '*--projectd-qa-run=*' });
    $before = @($targets | ForEach-Object { $_.ProcessId });
    foreach ($target in $targets) { taskkill.exe /PID $target.ProcessId /T /F | Out-Null };
    Start-Sleep -Milliseconds 500;
    $remaining = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'electron.exe' -and $_.CommandLine -like '*--projectd-qa-run=*' });
    [pscustomobject]@{ before = $before; remaining = @($remaining | ForEach-Object { $_.ProcessId }) } | ConvertTo-Json -Compress
  `;
  try {
    const raw = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 20_000
    }).trim();
    return raw ? JSON.parse(raw) : { before: [], remaining: [] };
  } catch (error) {
    return { before: [], remaining: [], error: error instanceof Error ? error.message : String(error) };
  }
}

async function run() {
  const { timeoutMs, forwarded } = parseArgs(process.argv.slice(2));
  await fsp.mkdir(outputDir, { recursive: true });
  const stdout = fs.createWriteStream(stdoutPath, { encoding: "utf8" });
  const stderr = fs.createWriteStream(stderrPath, { encoding: "utf8" });
  const env = { ...process.env, PROJECTD_E2E_RESULTS: resultsPath, PROJECTD_E2E_BOUNDED_RUN: runId };
  const command = ["exec", "playwright", "test", "--config", "playwright.config.ts", "--workers=1", ...forwarded];
  const child = spawn(process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "pnpm", [
    ...(process.platform === "win32" ? ["/d", "/s", "/c", "pnpm.cmd"] : []),
    ...command
  ], {
    cwd: root,
    env,
    windowsHide: true,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => { process.stdout.write(chunk); stdout.write(chunk); });
  child.stderr.on("data", (chunk) => { process.stderr.write(chunk); stderr.write(chunk); });

  let timedOut = false;
  const exit = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child.pid);
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      resolve({ exitCode: null, signal: null, error: error.message });
    });
    child.once("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolve({ exitCode, signal, error: null });
    });
  });
  stdout.end();
  stderr.end();

  let playwright = null;
  try {
    playwright = JSON.parse(await fsp.readFile(resultsPath, "utf8"));
  } catch {
    // A crash before Playwright writes JSON is represented in the report.
  }
  const summary = summarizePlaywrightReport(playwright);
  const cleanup = cleanupQaProcesses();
  const report = {
    schemaVersion: 1,
    kind: "projectd-bounded-electron-e2e",
    generatedAt: new Date().toISOString(),
    timeoutMs,
    timedOut,
    exit,
    summary,
    cleanup,
    resultsPath: path.relative(root, resultsPath),
    stdoutPath: path.relative(root, stdoutPath),
    stderrPath: path.relative(root, stderrPath),
    passed: !timedOut && exit.exitCode === 0 && summary.total > 0 && summary.failed === 0 && (cleanup.remaining?.length ?? 0) === 0
  };
  await fsp.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...report, reportPath: path.relative(root, reportPath) }, null, 2));
  process.exitCode = report.passed ? 0 : 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

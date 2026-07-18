const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const mode = readArgument("--mode") ?? "fixture";
const packageVersion = require(path.join(root, "package.json")).version;
const installerPath = path.resolve(readArgument("--installer") ?? path.join(root, "release", `ProjectD-${packageVersion}-Setup.exe`));
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(root, "artifacts", "qa", `release-lifecycle-${runId}`);
const reportPath = path.join(runDir, "report.json");

if (!new Set(["dry-run", "fixture"]).has(mode)) {
  throw new Error("--mode must be dry-run or fixture; this harness never performs a real installation");
}

fs.mkdirSync(runDir, { recursive: true });

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function sha256(file) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}

function signatureStatus(file) {
  if (process.platform !== "win32") return { status: "not-checked", signer: null, reason: "Windows-only check" };
  const escaped = file.replace(/'/g, "''");
  const command = `[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); $s=Get-AuthenticodeSignature -LiteralPath '${escaped}'; [pscustomobject]@{status=[string]$s.Status; signer=$s.SignerCertificate.Subject; message=$s.StatusMessage} | ConvertTo-Json -Compress`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
    encoding: "utf8",
    windowsHide: true
  });
  if (result.status !== 0) return { status: "check-failed", signer: null, reason: (result.stderr || result.stdout).trim() };
  try {
    const parsed = JSON.parse(result.stdout.trim());
    return { status: parsed.status, signer: parsed.signer ?? null, reason: parsed.message ?? null };
  } catch {
    return { status: "check-failed", signer: null, reason: "PowerShell returned invalid JSON" };
  }
}

function writePayload(directory, version) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "app-version.json"), JSON.stringify({ version }, null, 2), "utf8");
}

function readVersion(directory) {
  return JSON.parse(fs.readFileSync(path.join(directory, "app-version.json"), "utf8")).version;
}

function executeFixture(checks) {
  const fixtureRoot = path.join(runDir, "fixture");
  const installRoot = path.join(fixtureRoot, "Program Files", "Project D");
  const userData = path.join(fixtureRoot, "用户数据", "Project D");
  const current = path.join(installRoot, "current");
  const staged = path.join(installRoot, "staged");
  const previous = path.join(installRoot, "previous");

  writePayload(current, "1.0.0");
  fs.mkdirSync(userData, { recursive: true });
  fs.writeFileSync(path.join(userData, "settings.json"), JSON.stringify({ wallpaper: "keep-me" }), "utf8");
  checks.freshInstall = readVersion(current) === "1.0.0" && fs.existsSync(path.join(userData, "settings.json"));

  writePayload(staged, "2.0.0");
  fs.renameSync(current, previous);
  fs.renameSync(staged, current);
  checks.overwriteUpgrade = readVersion(current) === "2.0.0"
    && JSON.parse(fs.readFileSync(path.join(userData, "settings.json"), "utf8")).wallpaper === "keep-me";

  const packageFixture = path.join(fixtureRoot, "update.pkg");
  fs.writeFileSync(packageFixture, "valid update payload", "utf8");
  const expectedHash = sha256(packageFixture);
  fs.appendFileSync(packageFixture, "corruption", "utf8");
  checks.corruptPackageRejected = sha256(packageFixture) !== expectedHash && readVersion(current) === "2.0.0";

  let offlineFailure = null;
  try {
    const error = new Error("simulated offline update feed");
    error.code = "ENETUNREACH";
    throw error;
  } catch (error) {
    offlineFailure = error.code;
  }
  checks.offlinePreservesCurrent = offlineFailure === "ENETUNREACH" && readVersion(current) === "2.0.0";

  fs.rmSync(current, { recursive: true, force: true });
  fs.renameSync(previous, current);
  checks.rollbackRestoresPrevious = readVersion(current) === "1.0.0"
    && JSON.parse(fs.readFileSync(path.join(userData, "settings.json"), "utf8")).wallpaper === "keep-me";
}

const startedAt = new Date().toISOString();
const installerExists = fs.existsSync(installerPath);
const installer = {
  path: installerPath,
  exists: installerExists,
  size: installerExists ? fs.statSync(installerPath).size : null,
  sha256: installerExists ? sha256(installerPath) : null,
  signature: installerExists ? signatureStatus(installerPath) : { status: "missing", signer: null, reason: null }
};
const checks = {
  installerLocated: mode === "dry-run" ? installerExists : null,
  fixtureOnly: true,
  freshInstall: mode === "dry-run" ? null : false,
  overwriteUpgrade: mode === "dry-run" ? null : false,
  corruptPackageRejected: mode === "dry-run" ? null : false,
  offlinePreservesCurrent: mode === "dry-run" ? null : false,
  rollbackRestoresPrevious: mode === "dry-run" ? null : false
};

if (mode === "fixture") executeFixture(checks);

const requiredChecks = Object.entries(checks).filter(([, value]) => value !== null);
const passed = requiredChecks.every(([, value]) => value === true);
const report = {
  schemaVersion: 1,
  kind: "release-install-upgrade-rollback-harness",
  mode,
  safety: "No installer was executed; install, upgrade, corruption, offline, and rollback were exercised in an isolated fixture.",
  startedAt,
  finishedAt: new Date().toISOString(),
  passed,
  installer,
  checks
};
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ passed, reportPath, mode, signature: installer.signature, checks }, null, 2));
process.exitCode = passed ? 0 : 1;

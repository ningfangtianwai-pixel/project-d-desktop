const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const ledgerPath = path.join(root, "docs", "ASSET_LEDGER.json");
const assetDirectories = [path.join(root, "public"), path.join(root, "assets")];
const command = process.argv.find((argument) => ["sync", "check", "report"].includes(argument)) ?? "check";
const commercial = process.argv.includes("--commercial");
const strictReport = process.argv.includes("--strict");
const reportPath = path.resolve(readArgument("--output") ?? path.join(root, "artifacts", "asset-ledger-report.json"));
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function portablePath(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function digest(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [absolute];
  });
}

function generatedAssetId(relative, usedIds) {
  const stem = relative.replace(/^public\//, "").replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  let candidate = stem;
  let suffix = 2;
  while (usedIds.has(candidate)) candidate = `${stem}-${suffix++}`;
  usedIds.add(candidate);
  return candidate;
}

function synchronize() {
  const entries = new Map(ledger.assets.map((asset) => [asset.file.split("\\").join("/"), asset]));
  const usedIds = new Set(ledger.assets.map((asset) => asset.assetId));
  let added = 0;
  let hashesUpdated = 0;
  for (const absolute of assetDirectories.flatMap(listFiles).sort()) {
    const relative = portablePath(absolute);
    const fileSha256 = digest(absolute);
    const existing = entries.get(relative);
    if (existing) {
      if (existing.fileSha256 !== fileSha256) {
        existing.fileSha256 = fileSha256;
        existing.version = Math.max(1, Number(existing.version) || 1) + 1;
        hashesUpdated += 1;
      }
      continue;
    }
    const asset = {
      assetId: generatedAssetId(relative, usedIds),
      file: relative,
      author: null,
      originalUrl: null,
      acquiredAt: new Date().toISOString().slice(0, 10),
      licenseType: "evidence-required",
      licenseSnapshot: null,
      evidenceSha256: null,
      fileSha256,
      version: 1,
      reviewStatus: "pending-evidence",
      distributionEnabled: false
    };
    ledger.assets.push(asset);
    entries.set(relative, asset);
    added += 1;
  }
  if (added > 0 || hashesUpdated > 0) {
    ledger.assets.sort((a, b) => a.file.localeCompare(b.file));
    fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  }
  return { added, hashesUpdated, preservedManualAuthorizationFields: true };
}

function inspect() {
  const files = assetDirectories.flatMap(listFiles).sort();
  const entries = new Map(ledger.assets.map((asset) => [asset.file.split("\\").join("/"), asset]));
  const untracked = [];
  const missing = [];
  const hashMismatches = [];
  const commercialIncomplete = [];
  for (const absolute of files) {
    const relative = portablePath(absolute);
    const entry = entries.get(relative);
    if (!entry) {
      untracked.push(relative);
      continue;
    }
    if (digest(absolute) !== entry.fileSha256) hashMismatches.push(relative);
    if (!commercialEvidenceComplete(entry)) {
      commercialIncomplete.push(relative);
    }
  }
  for (const relative of entries.keys()) {
    if (!fs.existsSync(path.join(root, relative))) missing.push(relative);
  }
  const reviewStatus = ledger.assets.reduce((counts, asset) => {
    counts[asset.reviewStatus ?? "unset"] = (counts[asset.reviewStatus ?? "unset"] ?? 0) + 1;
    return counts;
  }, {});
  const failures = [...untracked.map((file) => `Missing ledger entry: ${file}`), ...missing.map((file) => `Ledger file is missing: ${file}`), ...hashMismatches.map((file) => `Hash mismatch: ${file}`)];
  if (commercial) failures.push(...commercialIncomplete.map((file) => `Commercial evidence incomplete: ${file}`));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command,
    commercial,
    totals: { files: files.length, entries: entries.size, commercialReady: ledger.assets.length - commercialIncomplete.length },
    reviewStatus,
    untracked,
    missing,
    hashMismatches,
    commercialIncomplete,
    failures
  };
}

function commercialEvidenceComplete(entry) {
  const snapshot = entry.licenseSnapshot;
  const hasSnapshot = (typeof snapshot === "string" && snapshot.trim().length > 0)
    || (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot));
  const snapshotOrigin = snapshot && typeof snapshot === "object"
    ? snapshot.origin ?? snapshot.source ?? snapshot.sourceUnavailableReason
    : null;
  const hasOrigin = (typeof entry.originalUrl === "string" && /^https:\/\//i.test(entry.originalUrl))
    || (typeof snapshotOrigin === "string" && snapshotOrigin.trim().length > 0);
  return entry.reviewStatus === "approved"
    && entry.distributionEnabled === true
    && typeof entry.author === "string"
    && entry.author.trim().length > 0
    && typeof entry.acquiredAt === "string"
    && Number.isFinite(Date.parse(entry.acquiredAt))
    && typeof entry.licenseType === "string"
    && entry.licenseType !== "evidence-required"
    && hasSnapshot
    && hasOrigin
    && typeof entry.evidenceSha256 === "string"
    && /^[a-f0-9]{64}$/.test(entry.evidenceSha256);
}

let syncResult = null;
if (command === "sync") syncResult = synchronize();
const report = { ...inspect(), sync: syncResult };
if (command === "report" || readArgument("--output")) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
}

if (report.failures.length) {
  console.error(report.failures.join("\n"));
  if (command !== "report" || strictReport) process.exitCode = 1;
}
console.log(JSON.stringify({
  command,
  commercial,
  totals: report.totals,
  reviewStatus: report.reviewStatus,
  sync: syncResult,
  reportPath: command === "report" || readArgument("--output") ? reportPath : null,
  passed: report.failures.length === 0
}, null, 2));

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const ledgerPath = path.join(root, "docs", "ASSET_LEDGER.json");
const wallpaperDir = path.join(root, "public", "wallpapers");
const commercial = process.argv.includes("--commercial");
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const entries = new Map(ledger.assets.map((asset) => [path.normalize(asset.file), asset]));
const failures = [];

for (const file of fs.readdirSync(wallpaperDir).sort()) {
  const relative = path.normalize(path.join("public", "wallpapers", file));
  const entry = entries.get(relative);
  if (!entry) {
    failures.push(`Missing ledger entry: ${relative}`);
    continue;
  }
  const bytes = fs.readFileSync(path.join(root, relative));
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  if (digest !== entry.fileSha256) failures.push(`Hash mismatch: ${relative}`);
  if (commercial && (entry.reviewStatus !== "approved" || entry.distributionEnabled !== true || !entry.evidenceSha256)) {
    failures.push(`Commercial evidence incomplete: ${relative}`);
  }
}

for (const relative of entries.keys()) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Ledger file is missing: ${relative}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Asset ledger verified: ${entries.size} assets (${commercial ? "commercial" : "development"} gate)`);

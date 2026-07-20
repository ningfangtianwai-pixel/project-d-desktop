const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const installer = path.join(root, "release", `ProjectD-${pkg.version}-Setup.exe`);
const checks = [];
const check = (name, passed, detail) => checks.push({ name, passed, detail });

for (const file of ["README.md", "SECURITY.md", "CONTRIBUTING.md", "CHANGELOG.md", "LICENSE", "PRIVACY.md", "DISCLAIMER.md", "docs/ASSET_REGISTRY.md"]) {
  check(`document:${file}`, fs.existsSync(path.join(root, file)), fs.existsSync(path.join(root, file)) ? "present" : "missing");
}
const legalDocuments = ["docs/PRIVACY_POLICY.md", "docs/USER_AGREEMENT.md"];
const invalidLegalDocuments = legalDocuments.filter((file) => {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) return true;
  const content = fs.readFileSync(target, "utf8").trim();
  return content.length < 500 || /(?:律师审核)?草案|\bDRAFT\b/i.test(content);
});
check("legal:approved-documents", invalidLegalDocuments.length === 0, invalidLegalDocuments.length === 0 ? "non-draft documents present" : `missing, empty, or draft: ${invalidLegalDocuments.join(", ")}`);

check("installer:versioned", fs.existsSync(installer), installer);
function latestModifiedAt(directory) {
  if (!fs.existsSync(directory)) return 0;
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((latest, entry) => {
    const target = path.join(directory, entry.name);
    return Math.max(latest, entry.isDirectory() ? latestModifiedAt(target) : fs.statSync(target).mtimeMs);
  }, 0);
}
const packageInputModifiedAt = Math.max(
  latestModifiedAt(path.join(root, "src")),
  ...["package.json", "electron-builder.yml", "vite.config.ts"].map((file) => fs.statSync(path.join(root, file)).mtimeMs)
);
const installerModifiedAt = fs.existsSync(installer) ? fs.statSync(installer).mtimeMs : 0;
check("installer:fresh", installerModifiedAt >= packageInputModifiedAt, installerModifiedAt >= packageInputModifiedAt ? "newer than package inputs" : "rebuild required after source/config changes");
let packageBudget = "not checked";
try {
  execFileSync(process.execPath, [path.join(root, "scripts", "verify-package-budget.cjs")], { cwd: root, stdio: "pipe" });
  packageBudget = "within configured limits";
} catch (error) {
  packageBudget = error instanceof Error ? error.message.split("\n")[0] : String(error);
}
check("installer:size-budget", packageBudget === "within configured limits", packageBudget);
const tags = execFileSync("git", ["tag", "--list", `v${pkg.version}`], { cwd: root, encoding: "utf8" }).trim();
check("version:not-already-tagged", tags.length === 0, tags ? `tag v${pkg.version} already exists` : "unique tag");

let commercialAssets = "verified";
try {
  execFileSync(process.execPath, [path.join(root, "scripts", "verify-asset-ledger.cjs"), "check", "--commercial"], { cwd: root, stdio: "pipe" });
} catch (error) {
  commercialAssets = error instanceof Error ? error.message.split("\n")[0] : String(error);
}
check("assets:distribution-approved", commercialAssets === "verified", commercialAssets);

let signature = "artifact missing";
if (fs.existsSync(installer) && process.platform === "win32") {
  signature = execFileSync("powershell", ["-NoProfile", "-Command", `(Get-AuthenticodeSignature -LiteralPath '${installer.replace(/'/g, "''")}').Status`], { encoding: "utf8" }).trim();
}
check("installer:authenticode", signature === "Valid", signature);

const builderConfig = fs.readFileSync(path.join(root, "electron-builder.yml"), "utf8");
const mainSource = fs.readFileSync(path.join(root, "src", "main", "main.ts"), "utf8");
const packageSource = fs.readFileSync(path.join(root, "package.json"), "utf8");
const manualReleaseUrl = /GITHUB_RELEASES_URL\s*=\s*"(https:\/\/github\.com\/[^"/]+\/[^"/]+\/releases)"/.exec(mainSource)?.[1] ?? "";
const manualUpdateValid = Boolean(manualReleaseUrl)
  && !/^\s*publish:/m.test(builderConfig)
  && !packageSource.includes("electron-updater")
  && !mainSource.includes("scheduleAutomaticCheck()");
check(
  "updates:manual-github-releases",
  manualUpdateValid,
  manualUpdateValid ? manualReleaseUrl : "automatic updater/feed remains configured or trusted GitHub Releases URL is missing"
);

const failed = checks.filter((item) => !item.passed);
const report = { generatedAt: new Date().toISOString(), version: pkg.version, checks, passed: failed.length === 0 };
fs.mkdirSync(path.join(root, "artifacts", "release"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts", "release", "readiness.json"), `${JSON.stringify(report, null, 2)}\n`);
for (const item of checks) console.log(`${item.passed ? "PASS" : "BLOCK"} ${item.name}: ${item.detail}`);
if (failed.length > 0) process.exit(1);

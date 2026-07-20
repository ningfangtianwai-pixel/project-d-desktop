const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const releaseDir = path.join(root, "release");
const evidenceDir = path.join(releaseDir, "evidence");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const installerName = `ProjectD-${pkg.version}-Setup.exe`;
const expectedArtifacts = [installerName, `${installerName}.blockmap`]
  .map((name) => path.join(releaseDir, name))
  .filter((file) => fs.existsSync(file));

if (!expectedArtifacts.some((file) => path.basename(file) === installerName)) {
  throw new Error(`Missing installer: ${path.join(releaseDir, installerName)}`);
}
fs.mkdirSync(evidenceDir, { recursive: true });

function sha256(file) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex").toUpperCase();
}

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true }).trim();
}

const checksums = expectedArtifacts
  .map((file) => `${sha256(file)}  ${path.basename(file)}`)
  .join("\n") + "\n";
fs.writeFileSync(path.join(releaseDir, "SHA256SUMS.txt"), checksums, "utf8");

execFileSync(process.execPath, [path.join(root, "scripts", "generate-supply-chain-evidence.cjs"), "--output", evidenceDir, "--audit-level", "high"], {
  cwd: root,
  stdio: "inherit",
  windowsHide: true
});
const sbomSource = path.join(evidenceDir, "projectd-sbom.cdx.json");
fs.copyFileSync(sbomSource, path.join(releaseDir, "ProjectD-SBOM.cdx.json"));

const commitSha = git("rev-parse", "HEAD");
const dirtyFiles = git("status", "--porcelain").split(/\r?\n/).filter(Boolean);
const installer = path.join(releaseDir, installerName);
const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  product: pkg.name,
  version: pkg.version,
  commitSha,
  sourceTreeClean: dirtyFiles.length === 0,
  dirtyFileCount: dirtyFiles.length,
  platform: process.platform,
  architecture: process.arch,
  node: process.version,
  electron: pkg.devDependencies?.electron ?? null,
  installer: {
    filename: installerName,
    bytes: fs.statSync(installer).size,
    sha256: sha256(installer)
  },
  evidence: {
    checksums: "SHA256SUMS.txt",
    sbom: "ProjectD-SBOM.cdx.json",
    supplyChainReport: "evidence/supply-chain-report.json"
  }
};
fs.writeFileSync(path.join(releaseDir, "BUILD_SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(releaseDir, "COMMIT_SHA.txt"), `${commitSha}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));

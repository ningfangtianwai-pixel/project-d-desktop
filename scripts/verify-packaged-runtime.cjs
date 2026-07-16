const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const asarPath = path.join(projectRoot, "release", "win-unpacked", "resources", "app.asar");
const probePath = path.join(projectRoot, "scripts", "diagnose-packaged-imports.cjs");
const artifactDir = path.join(projectRoot, "artifacts", "packaged-verification");
const outputPath = path.join(artifactDir, "module-imports.log");

if (!fs.existsSync(asarPath)) {
  throw new Error(`Packaged app not found: ${asarPath}`);
}

fs.mkdirSync(artifactDir, { recursive: true });
fs.rmSync(outputPath, { force: true });

const electronPath = require("electron");
const result = spawnSync(electronPath, [probePath, asarPath, outputPath], {
  cwd: projectRoot,
  encoding: "utf8",
  timeout: 20_000,
  windowsHide: true,
});

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`Packaged module probe exited with ${result.status}: ${result.stderr || result.stdout}`);
}

const records = fs
  .readFileSync(outputPath, "utf8")
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const failure = records.find((record) => record.message === "require failed");
const completed = records.some((record) => record.message === "diagnostic complete");

if (failure) {
  throw new Error(`Packaged dependency missing in ${failure.data.relativePath}: ${failure.data.message}`);
}
if (!completed) {
  throw new Error("Packaged module probe did not complete");
}

const loadedModules = records.filter((record) => record.message === "after require").length;
console.log(`Packaged runtime verification passed (${loadedModules} modules loaded).`);

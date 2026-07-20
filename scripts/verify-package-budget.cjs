const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const releaseDir = path.join(root, "release");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const installer = path.join(releaseDir, `ProjectD-${packageJson.version}-Setup.exe`);
const asar = path.join(releaseDir, "win-unpacked", "resources", "app.asar");
const limits = {
  installerMiB: Number(process.env.PROJECTD_MAX_INSTALLER_MIB ?? 180),
  asarMiB: Number(process.env.PROJECTD_MAX_ASAR_MIB ?? 110)
};

function sizeMiB(file) {
  return fs.statSync(file).size / 1024 / 1024;
}

const missing = [installer, asar].filter((file) => !fs.existsSync(file));
if (missing.length > 0) {
  console.error(`Missing package artifacts:\n${missing.join("\n")}`);
  process.exit(1);
}

const actual = { installerMiB: sizeMiB(installer), asarMiB: sizeMiB(asar) };
const failures = [];
if (actual.installerMiB > limits.installerMiB) failures.push(`installer ${actual.installerMiB.toFixed(2)} MiB > ${limits.installerMiB} MiB`);
if (actual.asarMiB > limits.asarMiB) failures.push(`app.asar ${actual.asarMiB.toFixed(2)} MiB > ${limits.asarMiB} MiB`);

const report = { version: packageJson.version, limits, actual, passed: failures.length === 0 };
fs.mkdirSync(path.join(root, "artifacts", "package"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts", "package", "budget.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

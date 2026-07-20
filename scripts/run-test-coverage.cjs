const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(root, "artifacts", "coverage");
const inventoryThresholds = { lines: 70, branches: 70, functions: 70 };
const tests = fs.readdirSync(path.join(root, "tests"))
  .filter((file) => file.endsWith(".test.cjs"))
  .sort()
  .map((file) => path.join("tests", file));

fs.mkdirSync(outputDirectory, { recursive: true });

function executeCoverage(name, thresholds, includeInventory) {
  const args = [
    "--experimental-test-coverage",
    `--test-coverage-lines=${thresholds.lines}`,
    `--test-coverage-branches=${thresholds.branches}`,
    `--test-coverage-functions=${thresholds.functions}`
  ];
  if (includeInventory) {
    args.push("--test-coverage-include=dist/main/**/*.js", "--test-coverage-include=dist/shared/**/*.js");
  }
  args.push("--test", ...tests);
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 24 * 1024 * 1024
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  process.stdout.write(output);
  fs.writeFileSync(path.join(outputDirectory, `${name}.txt`), output, "utf8");
  const total = /all files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/.exec(output);
  return {
    name,
    thresholds,
    actual: total ? { lines: Number(total[1]), branches: Number(total[2]), functions: Number(total[3]) } : null,
    output,
    passed: result.status === 0 && Boolean(total)
  };
}

const inventory = executeCoverage("full-inventory-coverage", inventoryThresholds, true);
const riskMinimums = {
  "database.js": { lines: 45, functions: 40 },
  "tray-manager.js": { lines: 90, functions: 80 },
  "update-service.js": { lines: 90, functions: 85 },
  "register-all.js": { lines: 90, functions: 90 },
  "handler-registry.js": { lines: 90, functions: 90 },
  "wallpaper-host.js": { lines: 55, functions: 65 },
  "wallpaper-supervisor.js": { lines: 90, functions: 70 },
  "desktop-runtime-recovery.js": { lines: 90, functions: 80 },
  "system-event-manager.js": { lines: 95, functions: 80 },
  "shutdown-deadline.js": { lines: 100, functions: 100 },
  "window-resilience.js": { lines: 75, functions: 70 }
};

function moduleCoverage(output, file) {
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^[^|\\r\\n]*${escaped}\\s+\\|\\s+([\\d.]+)\\s+\\|\\s+([\\d.]+)\\s+\\|\\s+([\\d.]+)`, "m").exec(output);
  return match ? { lines: Number(match[1]), branches: Number(match[2]), functions: Number(match[3]) } : null;
}

const highRiskModules = Object.entries(riskMinimums).map(([file, minimum]) => {
  const actual = moduleCoverage(inventory.output, file);
  return {
    file,
    minimum,
    actual,
    passed: Boolean(actual && actual.lines >= minimum.lines && actual.functions >= minimum.functions)
  };
});
const summary = {
  generatedAt: new Date().toISOString(),
  testFiles: tests.length,
  fullInventory: { thresholds: inventory.thresholds, actual: inventory.actual, passed: inventory.passed },
  highRiskModules,
  measurementScope: {
    covered: ["Node behavior tests with the complete dist/main + dist/shared inventory denominator"],
    verifiedSeparately: ["Vue components via Vitest", "Electron main/preload/renderer integration via Playwright"],
    excludedFromNumericCoverage: ["dist/main/main.js", "dist/main/bootstrap.js", "dist/preload/preload.js", "dist/renderer/**"]
  },
  passed: inventory.passed && highRiskModules.every((item) => item.passed)
};
fs.writeFileSync(path.join(outputDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

for (const item of highRiskModules) {
  console.log(`${item.passed ? "PASS" : "FAIL"} risk coverage ${item.file}: ${JSON.stringify(item.actual)} minimum ${JSON.stringify(item.minimum)}`);
}
if (!summary.passed) process.exitCode = 1;

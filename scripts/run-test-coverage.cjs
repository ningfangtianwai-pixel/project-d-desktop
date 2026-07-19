const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(root, "artifacts", "coverage");
const thresholds = { lines: 80, branches: 70, functions: 80 };
const tests = fs.readdirSync(path.join(root, "tests"))
  .filter((file) => file.endsWith(".test.cjs"))
  .sort()
  .map((file) => path.join("tests", file));

fs.mkdirSync(outputDirectory, { recursive: true });
const result = spawnSync(process.execPath, [
  "--experimental-test-coverage",
  `--test-coverage-lines=${thresholds.lines}`,
  `--test-coverage-branches=${thresholds.branches}`,
  `--test-coverage-functions=${thresholds.functions}`,
  "--test-coverage-include=dist/main/**/*.js",
  "--test-coverage-include=dist/shared/**/*.js",
  "--test",
  ...tests
], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024
});

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
process.stdout.write(output);
fs.writeFileSync(path.join(outputDirectory, "node-test-coverage.txt"), output, "utf8");

const total = /all files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/.exec(output);
const summary = {
  generatedAt: new Date().toISOString(),
  testFiles: tests.length,
  thresholds,
  actual: total ? {
    lines: Number(total[1]),
    branches: Number(total[2]),
    functions: Number(total[3])
  } : null,
  passed: result.status === 0 && Boolean(total)
};
fs.writeFileSync(path.join(outputDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

if (!summary.passed) {
  if (!total) process.stderr.write("Unable to parse the Node.js coverage summary.\n");
  process.exitCode = result.status || 1;
}

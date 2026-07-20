const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "projectd-clean-checkout-"));
const checkout = path.join(tempRoot, "source");
const store = path.join(tempRoot, "pnpm-store");
const full = process.argv.includes("--full");
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), full, checks: {}, passed: false };

function run(command, args, cwd = root) {
  const isPnpmOnWindows = process.platform === "win32" && command === "pnpm";
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    shell: isPnpmOnWindows,
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

try {
  run("git", ["worktree", "add", "--detach", checkout, "HEAD"]);
  report.checks.trackedCheckout = !fs.existsSync(path.join(checkout, ".env")) && !fs.existsSync(path.join(checkout, "node_modules"));
  run("pnpm", ["install", "--frozen-lockfile", "--store-dir", store], checkout);
  report.checks.freshDependencyStore = fs.existsSync(store);
  run("pnpm", ["lint"], checkout);
  run("pnpm", ["typecheck"], checkout);
  run("pnpm", ["test:unit"], checkout);
  run("pnpm", ["test:component"], checkout);
  run("pnpm", ["build"], checkout);
  if (full) {
    run("pnpm", ["test:e2e:built"], checkout);
    run("pnpm", ["dist"], checkout);
  }
  report.checks.noAbsoluteWorkspaceDependency = !scanFiles(checkout, ["package.json", "pnpm-lock.yaml", "electron-builder.yml"], root);
  report.checks.noLocalEnvDependency = !fs.existsSync(path.join(checkout, ".env"));
  report.passed = Object.values(report.checks).every(Boolean);
} catch (error) {
  report.failure = error instanceof Error ? error.message.slice(-8_000) : String(error);
} finally {
  try { run("git", ["worktree", "remove", "--force", checkout]); } catch { /* report already captures primary failure */ }
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

const outputDir = path.join(root, "artifacts", "qa");
fs.mkdirSync(outputDir, { recursive: true });
const output = path.join(outputDir, "clean-checkout.json");
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...report, reportPath: output }, null, 2));
process.exitCode = report.passed ? 0 : 1;

function scanFiles(directory, files, forbidden) {
  return files.some((file) => {
    const target = path.join(directory, file);
    return fs.existsSync(target) && fs.readFileSync(target, "utf8").includes(forbidden);
  });
}

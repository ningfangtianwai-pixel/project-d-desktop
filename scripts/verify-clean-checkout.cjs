const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "projectd-clean-checkout-"));
const checkout = path.join(tempRoot, "source");
const store = path.join(tempRoot, "pnpm-store");
const full = process.argv.includes("--full");
const report = { schemaVersion: 2, generatedAt: new Date().toISOString(), full, checks: {}, passed: false };
const cleanEnvironment = createCleanEnvironment(process.env);

function run(command, args, cwd = root) {
  const pnpmCli = command === "pnpm" ? process.env.npm_execpath : null;
  const executable = pnpmCli ? process.execPath : command;
  const executableArgs = pnpmCli ? [pnpmCli, ...args] : args;
  const result = spawnSync(executable, executableArgs, {
    cwd,
    env: cleanEnvironment,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
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
  const trackedRuntimeFiles = listTrackedRuntimeFiles(checkout);
  report.absoluteWorkspacePathFiles = scanFiles(checkout, trackedRuntimeFiles, [root, root.replaceAll("\\", "/")]);
  report.checks.noAbsoluteWorkspaceDependency = report.absoluteWorkspacePathFiles.length === 0;
  report.checks.noLocalEnvDependency = !fs.existsSync(path.join(checkout, ".env"));
  report.checks.noProjectEnvironmentDependency = !Object.keys(cleanEnvironment).some((key) => /^(?:VITE_|PROJECTD_)/i.test(key));
  report.passed = Object.values(report.checks).every(Boolean);
} catch (error) {
  report.failure = error instanceof Error ? error.message.slice(-8_000) : String(error);
} finally {
  try { run("git", ["worktree", "remove", "--force", checkout]); } catch { /* report already captures primary failure */ }
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

const outputDir = path.join(root, "artifacts", "qa");
fs.mkdirSync(outputDir, { recursive: true });
const output = path.join(outputDir, full ? "clean-checkout-full.json" : "clean-checkout.json");
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...report, reportPath: output }, null, 2));
process.exitCode = report.passed ? 0 : 1;

function listTrackedRuntimeFiles(directory) {
  const output = run("git", ["ls-files", "-z"], directory);
  const runtimeExtensions = new Set([
    ".cjs", ".css", ".html", ".js", ".json", ".mjs", ".ps1", ".scss",
    ".sh", ".ts", ".tsx", ".vue", ".yaml", ".yml"
  ]);
  return output.split("\0").filter((file) => runtimeExtensions.has(path.extname(file).toLowerCase()));
}

function createCleanEnvironment(source) {
  const allowed = new Set([
    "ALLUSERSPROFILE", "APPDATA", "COMMONPROGRAMFILES", "COMMONPROGRAMFILES(X86)",
    "COMMONPROGRAMW6432", "COMSPEC", "HOME", "HOMEDRIVE", "HOMEPATH", "LOCALAPPDATA",
    "NUMBER_OF_PROCESSORS", "OS", "PATH", "PATHEXT", "PROCESSOR_ARCHITECTURE",
    "PROCESSOR_IDENTIFIER", "PROGRAMDATA", "PROGRAMFILES", "PROGRAMFILES(X86)",
    "PROGRAMW6432", "SYSTEMDRIVE", "SYSTEMROOT", "TEMP", "TMP", "USERDOMAIN",
    "USERNAME", "USERPROFILE", "WINDIR"
  ]);
  const environment = {};
  for (const [key, value] of Object.entries(source)) {
    const upper = key.toUpperCase();
    const proxyVariable = /^(?:ALL|HTTP|HTTPS|NO)_PROXY$/.test(upper);
    if (value !== undefined && (allowed.has(upper) || proxyVariable)) environment[key] = value;
  }
  return environment;
}

function scanFiles(directory, files, forbiddenValues) {
  return files.filter((file) => {
    const target = path.join(directory, file);
    if (!fs.existsSync(target)) return false;
    const content = fs.readFileSync(target);
    if (content.includes(0)) return false;
    const text = content.toString("utf8");
    return forbiddenValues.some((forbidden) => text.includes(forbidden));
  });
}

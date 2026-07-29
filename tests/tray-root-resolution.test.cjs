const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveProjectRoot } = require("./e2e/helpers/resolve-project-root.cjs");

test("tray root resolution ignores Electron switches before the project root", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "projectd-tray-root-"));
  fs.mkdirSync(path.join(root, "dist", "main"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), "{}", "utf8");
  fs.writeFileSync(path.join(root, "dist", "main", "bootstrap.js"), "", "utf8");

  const shim = path.join(root, "tests", "e2e", "helpers", "tray-main-shim.cjs");
  const resolved = resolveProjectRoot([
    "electron.exe",
    "--no-sandbox",
    "--disable-gpu",
    shim,
    root,
    "--projectd-qa-run=tray"
  ], shim);

  assert.equal(resolved, root);
  assert.notEqual(resolved, path.join(root, "--disable-gpu"));
  fs.rmSync(root, { recursive: true, force: true });
});

test("tray root resolution rejects an argument list without a built project", () => {
  assert.throws(
    () => resolveProjectRoot(["electron.exe", "--no-sandbox", "--disable-gpu", "--projectd-qa-run=tray"], __filename),
    /Project D root argument is missing/
  );
});

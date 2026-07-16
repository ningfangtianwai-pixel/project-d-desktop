const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("sandbox preload is a self-contained bundle with no local runtime require", () => {
  const preloadPath = path.join(__dirname, "..", "dist", "preload", "preload.js");
  const source = fs.readFileSync(preloadPath, "utf8");

  assert.match(source, /require\(["']electron["']\)/);
  assert.doesNotMatch(source, /require\(["']\.\.?[\\/]/);
  assert.doesNotMatch(source, /shared[\\/]ipc\.js/);
  assert.match(source, /contextBridge\.exposeInMainWorld\(["']projectD["']/);
});

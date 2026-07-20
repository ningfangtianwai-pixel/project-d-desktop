const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");

test("package starts through the guarded bootstrap entry", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  assert.equal(packageJson.main, "dist/main/bootstrap.js");
});

test("bootstrap fixes app identity and user data before loading main", () => {
  const source = fs.readFileSync(path.join(projectRoot, "src", "main", "bootstrap.ts"), "utf8");
  const setNameIndex = source.indexOf("app.setName(PRODUCT_NAME)");
  const setUserDataIndex = source.indexOf('app.setPath("userData"');
  const loadMainIndex = source.indexOf('require("./main.js")');

  assert.ok(setNameIndex >= 0);
  assert.ok(setUserDataIndex > setNameIndex);
  assert.ok(loadMainIndex > setUserDataIndex);
  assert.match(source, /process\.exit\(1\)/);
});

test("packaged QA auto-quit requires an explicit run marker", () => {
  const source = fs.readFileSync(path.join(projectRoot, "src", "main", "main.ts"), "utf8");
  assert.match(source, /argument\.startsWith\("--projectd-qa-run="\)/);
  assert.match(source, /qaRunEnabled && Number\.isFinite\(autoQuitMs\)/);
});

test("packaged idle QA requires the explicit run marker before disabling desktop visuals", () => {
  const source = fs.readFileSync(path.join(projectRoot, "src", "main", "main.ts"), "utf8");
  assert.match(source, /qaRunEnabled && process\.env\.PROJECTD_QA_IDLE === "1"/);
  const smoke = fs.readFileSync(path.join(projectRoot, "scripts", "qa-packaged-smoke.cjs"), "utf8");
  assert.match(smoke, /PROJECTD_QA_IDLE: "1"/);
  assert.match(source, /qaRunEnabled \|\| process\.env\.PROJECTD_DEMO_AUTORUN !== "1"/);
  assert.match(source, /setAppState\("privacy_network_paused", "true"\)/);
});

test("committed data reset failures force a clean relaunch instead of leaving dead IPC", () => {
  const source = fs.readFileSync(path.join(projectRoot, "src", "main", "main.ts"), "utf8");
  assert.match(source, /resetCommitted = true/);
  assert.match(source, /reset failed after commit; forcing clean relaunch/);
});

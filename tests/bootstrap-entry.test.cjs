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

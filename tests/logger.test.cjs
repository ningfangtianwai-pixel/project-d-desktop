const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { AppLogger } = require("../dist/main/logger.js");

test("structured logger filters levels and contains unserializable diagnostic data", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "projectd-logger-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const logger = new AppLogger(directory, { minimumLevel: "INFO" });
  const cyclic = {};
  cyclic.self = cyclic;

  logger.debug("app", "hidden debug record");
  logger.info("app", "application ready", { version: "test" });
  assert.doesNotThrow(() => logger.warn("app", "cyclic data", cyclic));

  const records = fs.readFileSync(path.join(directory, "app.log"), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(records.length, 2);
  assert.deepEqual(records.map((record) => record.level), ["INFO", "WARN"]);
  assert.equal(records[0].data.version, "test");
  assert.equal(typeof records[1].serializationError, "string");
});

test("structured logger rotates bounded files", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "projectd-logger-rotation-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const logger = new AppLogger(directory, { maxBytes: 64 * 1024, retainedFiles: 2 });

  for (let index = 0; index < 100; index += 1) {
    logger.info("app", "rotation sample", { index, payload: "x".repeat(1_500) });
  }

  assert.equal(fs.existsSync(path.join(directory, "app.log")), true);
  assert.equal(fs.existsSync(path.join(directory, "app.log.1")), true);
  assert.equal(fs.existsSync(path.join(directory, "app.log.3")), false);
  assert.ok(fs.statSync(path.join(directory, "app.log")).size <= 64 * 1024);
});

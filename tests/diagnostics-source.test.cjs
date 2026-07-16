const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { readRecentLogMetadata } = require("../dist/main/diagnostics/diagnostics-source.js");

test("diagnostics source accepts known levels and skips unknown log records", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "projectd-diagnostics-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const logPath = path.join(directory, "error.log");
  fs.writeFileSync(logPath, [
    JSON.stringify({ at: "2026-07-13T00:00:00Z", level: "debug", message: "skip me" }),
    JSON.stringify({ at: "2026-07-13T00:01:00Z", level: "error", message: "lowercase error", data: { code: "E_TEST" } }),
    JSON.stringify({ at: "2026-07-13T00:02:00Z", level: "WARN", message: "warning" }),
    "not-json"
  ].join("\n"));

  assert.deepEqual(readRecentLogMetadata(logPath), [
    { level: "error", code: "E_TEST", summary: "lowercase error", occurredAt: "2026-07-13T00:01:00Z" },
    { level: "warn", code: "warning", summary: "warning", occurredAt: "2026-07-13T00:02:00Z" }
  ]);
});

test("diagnostics source returns an empty list for missing logs", () => {
  assert.deepEqual(readRecentLogMetadata(path.join(os.tmpdir(), "missing-projectd-error.log")), []);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const runtimeIpc = fs.readFileSync(
  path.join(__dirname, "..", "src", "main", "ipc", "runtime-ipc.ts"),
  "utf8",
);

test("renderer FPS reporting is limited to the main and wallpaper windows", () => {
  assert.match(
    runtimeIpc,
    /RUNTIME_REPORT_FPS[\s\S]*assertTrustedSender\(event, \["", "#\/wallpaper"\]\)/,
  );
  assert.doesNotMatch(runtimeIpc, /assertTrustedSender\(event, \["\*"\]\)/);
});

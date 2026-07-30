const test = require("node:test");
const assert = require("node:assert/strict");
const { summarizePlaywrightReport } = require("../scripts/e2e-report.cjs");

test("summarizes final Playwright results without counting retries twice", () => {
  const summary = summarizePlaywrightReport({
    suites: [{
      specs: [
        { tests: [{ results: [{ status: "unexpected" }, { status: "expected" }] }] },
        { tests: [{ results: [{ status: "skipped" }] }] },
        { tests: [{ results: [{ status: "timedOut" }] }] }
      ],
      suites: [{ specs: [{ tests: [{ results: [{ status: "flaky" }] }] }] }]
    }]
  });
  assert.deepEqual(summary, {
    total: 4,
    passed: 2,
    failed: 1,
    skipped: 1,
    flaky: 1,
    timedOut: 1,
    unknown: 0
  });
});

"use strict";

function summarizePlaywrightReport(report) {
  const summary = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    timedOut: 0,
    unknown: 0
  };

  function visitSuite(suite) {
    for (const spec of suite?.specs ?? []) {
      for (const test of spec.tests ?? []) {
        summary.total += 1;
        const result = test.results?.at(-1);
        const status = result?.status ?? test.status;
        if (status === "skipped") {
          summary.skipped += 1;
        } else if (status === "timedOut") {
          summary.failed += 1;
          summary.timedOut += 1;
        } else if (status === "unexpected" || status === "unknown" || !status) {
          summary.failed += 1;
          if (!status) summary.unknown += 1;
        } else {
          summary.passed += 1;
          if (status === "flaky") summary.flaky += 1;
        }
      }
    }
    for (const child of suite?.suites ?? []) visitSuite(child);
  }

  for (const suite of report?.suites ?? []) visitSuite(suite);
  return summary;
}

module.exports = { summarizePlaywrightReport };

const assert = require("node:assert/strict");
const test = require("node:test");

const { inspectInterruptedAction } = require("../src/main/actions/action-recovery.ts");

function execution(items) {
  return { id: "execution-1", status: "executing", items };
}

function item(id) {
  return { id, label: id, sourcePath: `source:${id}`, targetPath: `target:${id}` };
}

function probe(existing) {
  return { exists: async (filePath) => existing.has(filePath) };
}

test("interrupted action reports each source and target state without mutating files", async () => {
  const report = await inspectInterruptedAction(execution([
    item("completed"),
    item("resumable"),
    item("conflicted"),
    item("missing")
  ]), probe(new Set([
    "target:completed",
    "source:resumable",
    "source:conflicted",
    "target:conflicted"
  ])));

  assert.deepEqual(report.items.map((entry) => entry.state), [
    "completed",
    "resumable",
    "conflicted",
    "missing"
  ]);
  assert.deepEqual(report.counts, { completed: 1, resumable: 1, conflicted: 1, missing: 1 });
  assert.deepEqual(report.resumeCandidateItemIds, ["resumable"]);
  assert.deepEqual(report.rollbackCandidateItemIds, ["completed"]);
  assert.equal(report.canResumeSafely, false);
  assert.equal(report.canRollbackSafely, true);
});

test("resume is safe only when unfinished items are resumable and no path ambiguity exists", async () => {
  const report = await inspectInterruptedAction(execution([
    item("already-moved"),
    item("not-yet-moved")
  ]), probe(new Set([
    "target:already-moved",
    "source:not-yet-moved"
  ])));

  assert.equal(report.canResumeSafely, true);
  assert.equal(report.canRollbackSafely, true);
  assert.deepEqual(report.resumeCandidateItemIds, ["not-yet-moved"]);
  assert.deepEqual(report.rollbackCandidateItemIds, ["already-moved"]);
});

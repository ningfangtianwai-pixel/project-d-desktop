const assert = require("node:assert/strict");
const test = require("node:test");

const { runWithDeadline } = require("../dist/main/shutdown-deadline.js");

test("shutdown deadline invokes the emergency exit path for hung cleanup", async () => {
  let timedOut = false;
  const result = await runWithDeadline(
    () => new Promise(() => {}),
    15,
    () => { timedOut = true; }
  );

  assert.equal(result, "timed-out");
  assert.equal(timedOut, true);
});

test("completed cleanup cancels the emergency deadline", async () => {
  let timedOut = false;
  const result = await runWithDeadline(
    async () => undefined,
    50,
    () => { timedOut = true; }
  );

  assert.equal(result, "completed");
  assert.equal(timedOut, false);
});

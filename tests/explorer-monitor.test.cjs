const assert = require("node:assert/strict");
const test = require("node:test");

const { ExplorerProcessMonitor } = require("../dist/main/explorer-monitor.js");

test("Explorer monitor reports a changed shell process id once", async () => {
  const values = ["100", null, "200", "200"];
  const restarts = [];
  const monitor = new ExplorerProcessMonitor({
    probe: async () => values.shift() ?? "200",
    intervalMs: 60_000,
    onRestart: (previous, current) => restarts.push([previous, current])
  });
  monitor.start();
  await new Promise((resolve) => setTimeout(resolve, 5));
  await monitor.poll();
  await monitor.poll();
  await monitor.poll();
  monitor.stop();
  assert.deepEqual(restarts, [["100", "200"]]);
});

test("Explorer monitor contains probe failures and can continue polling", async () => {
  let calls = 0;
  const errors = [];
  const monitor = new ExplorerProcessMonitor({
    probe: async () => {
      calls += 1;
      if (calls === 1) throw new Error("tasklist unavailable");
      return "300";
    },
    intervalMs: 60_000,
    onRestart: () => assert.fail("initial recovery is not a restart"),
    onError: (error) => errors.push(error.message)
  });
  monitor.start();
  await new Promise((resolve) => setTimeout(resolve, 5));
  await monitor.poll();
  monitor.stop();
  assert.deepEqual(errors, ["tasklist unavailable"]);
  assert.equal(calls, 2);
});

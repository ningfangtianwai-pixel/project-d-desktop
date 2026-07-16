const assert = require("node:assert/strict");
const test = require("node:test");
const { SystemPresenceMonitor } = require("../dist/main/system-presence.js");

test("system presence coalesces concurrent probes and caches normalized state", async () => {
  let calls = 0;
  const monitor = new SystemPresenceMonitor(async () => {
    calls += 1;
    return { externalFullscreen: true, onBattery: true, batteryLevel: 120 };
  }, 5000);

  const [first, second] = await Promise.all([monitor.getState(1000), monitor.getState(1000)]);
  assert.deepEqual(first, { externalFullscreen: true, onBattery: true, batteryLevel: 100 });
  assert.deepEqual(second, first);
  assert.equal(calls, 1);
  assert.deepEqual(await monitor.getState(2000), first);
  assert.equal(calls, 1);
});

test("system presence fails closed to a non-disruptive fallback", async () => {
  const monitor = new SystemPresenceMonitor(async () => { throw new Error("probe failed"); }, 5000);
  assert.deepEqual(await monitor.getState(1000), {
    externalFullscreen: false,
    onBattery: false,
    batteryLevel: null
  });
});

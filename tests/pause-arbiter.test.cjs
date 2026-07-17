const assert = require("node:assert/strict");
const test = require("node:test");
const { PauseArbiter } = require("../dist/main/pause-arbiter.js");

test("pause reasons compose and clearing one reason does not resume early", () => {
  const arbiter = new PauseArbiter();
  arbiter.update({ manual: true, externalFullscreen: true });
  const stillPaused = arbiter.update({ externalFullscreen: false });

  assert.equal(stillPaused.paused, true);
  assert.deepEqual(stillPaused.reasons, ["manual"]);
  assert.equal(arbiter.update({ manual: false }).paused, false);
});

test("system lifecycle and critical thermal states pause rendering", () => {
  const arbiter = new PauseArbiter({ screenLocked: true, suspended: true, thermalState: "critical" });
  assert.deepEqual(arbiter.snapshot.reasons, ["screen-locked", "system-suspend", "thermal-critical"]);
});

test("battery state changes performance profile without forcing pause", () => {
  const arbiter = new PauseArbiter({ configuredMode: "auto", onBattery: true, batteryLevel: 65 });
  assert.equal(arbiter.snapshot.paused, false);
  assert.equal(arbiter.snapshot.effectiveProfile, "batterySaver");

  assert.equal(arbiter.update({ configuredMode: "quality" }).effectiveProfile, "quality");
  assert.equal(arbiter.update({ batteryLevel: 15 }).effectiveProfile, "balanced");
});

test("change callback only runs for material state transitions", () => {
  let changes = 0;
  const arbiter = new PauseArbiter({}, () => { changes += 1; });
  arbiter.update({ manual: false });
  arbiter.update({ manual: true });
  arbiter.update({ manual: true });
  assert.equal(changes, 1);
});


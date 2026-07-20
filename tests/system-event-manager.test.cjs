const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");

const { SystemEventManager } = require("../dist/main/system-event-manager.js");

function createHarness() {
  const screen = new EventEmitter();
  const powerMonitor = new EventEmitter();
  const pending = new Map();
  const calls = [];
  let timerId = 0;
  const manager = new SystemEventManager({
    screen,
    powerMonitor,
    isDynamicWallpaperEnabled: () => true,
    ensureWallpaperWindows: () => calls.push(["wallpaper"]),
    requestRecovery: (reason) => calls.push(["request", reason]),
    suspendRecovery: (reason) => calls.push(["suspend", reason]),
    resumeRecovery: (reason) => calls.push(["resume", reason]),
    updatePauseState: (patch) => calls.push(["pause", patch]),
    probeRenderers: (reason) => calls.push(["probe", reason]),
    schedule: (callback, delayMs) => {
      const timer = { id: ++timerId, unref() {} };
      pending.set(timer, {
        callback: () => {
          pending.delete(timer);
          callback();
        },
        delayMs
      });
      return timer;
    },
    cancelScheduled: (timer) => pending.delete(timer)
  });
  return { manager, screen, powerMonitor, pending, calls };
}

test("start is idempotent and routes system events with existing semantics", () => {
  const { manager, screen, powerMonitor, pending, calls } = createHarness();
  manager.start();
  manager.start();

  for (const event of ["display-added", "display-removed", "display-metrics-changed"]) {
    assert.equal(screen.listenerCount(event), 1);
  }
  for (const event of ["suspend", "resume", "lock-screen", "unlock-screen", "on-battery", "on-ac", "thermal-state-change"]) {
    assert.equal(powerMonitor.listenerCount(event), 1);
  }

  screen.emit("display-added");
  powerMonitor.emit("suspend");
  powerMonitor.emit("resume");
  powerMonitor.emit("lock-screen");
  powerMonitor.emit("unlock-screen");
  powerMonitor.emit("on-battery");
  powerMonitor.emit("on-ac");
  powerMonitor.emit("thermal-state-change", { state: "serious" });

  assert.deepEqual(calls, [
    ["wallpaper"],
    ["request", "display-added"],
    ["pause", { suspended: true }],
    ["suspend", "system-suspend"],
    ["pause", { suspended: false }],
    ["pause", { screenLocked: true }],
    ["suspend", "screen-locked"],
    ["pause", { screenLocked: false }],
    ["pause", { onBattery: true }],
    ["pause", { onBattery: false }],
    ["pause", { thermalState: "serious" }]
  ]);
  assert.deepEqual([...pending.values()].map(({ delayMs }) => delayMs), [650, 800, 1800, 350, 900]);

  for (const { callback } of [...pending.values()]) callback();
  assert.deepEqual(calls.slice(-5), [
    ["probe", "display-added"],
    ["resume", "system-resume"],
    ["probe", "system-resume"],
    ["resume", "screen-unlocked"],
    ["probe", "screen-unlocked"]
  ]);
  assert.equal(pending.size, 0);
});

test("dispose removes every listener, cancels pending work, and allows a clean restart", () => {
  const { manager, screen, powerMonitor, pending, calls } = createHarness();
  manager.start();
  screen.emit("display-metrics-changed");
  powerMonitor.emit("resume");
  assert.equal(pending.size, 3);

  manager.dispose();
  manager.dispose();

  assert.equal(pending.size, 0);
  assert.equal(screen.eventNames().length, 0);
  assert.equal(powerMonitor.eventNames().length, 0);
  const callCount = calls.length;
  screen.emit("display-added");
  powerMonitor.emit("unlock-screen");
  assert.equal(calls.length, callCount);

  manager.start();
  assert.equal(screen.listenerCount("display-added"), 1);
  assert.equal(powerMonitor.listenerCount("resume"), 1);
  manager.dispose();
});

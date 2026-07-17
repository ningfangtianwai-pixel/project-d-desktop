const assert = require("node:assert/strict");
const test = require("node:test");

const { CleanDesktopEscapeGuard } = require("../dist/main/clean-desktop-escape.js");

test("Escape is registered only while clean desktop is active", () => {
  const calls = [];
  let callback = null;
  const registry = {
    register: (accelerator, next) => { calls.push(["register", accelerator]); callback = next; return true; },
    unregister: (accelerator) => calls.push(["unregister", accelerator])
  };
  const guard = new CleanDesktopEscapeGuard(registry, () => calls.push(["exit"]));

  assert.equal(guard.arm(), true);
  assert.equal(guard.isArmed(), true);
  callback();
  guard.disarm();
  assert.equal(guard.isArmed(), false);
  assert.deepEqual(calls, [
    ["unregister", "Escape"],
    ["register", "Escape"],
    ["exit"],
    ["unregister", "Escape"]
  ]);
});

test("failed Escape registration remains disarmed", () => {
  const registry = { register: () => false, unregister: () => undefined };
  const guard = new CleanDesktopEscapeGuard(registry, () => undefined);
  assert.equal(guard.arm(), false);
  assert.equal(guard.isArmed(), false);
});

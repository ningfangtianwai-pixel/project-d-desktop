const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_PEEK_ACCELERATOR,
  EMERGENCY_ACCELERATOR,
  ShortcutManager,
  isValidPeekAccelerator
} = require("../dist/main/shortcut-manager.js");

function harness(initial = {}, blocked = []) {
  const callbacks = new Map();
  const values = new Map(Object.entries(initial));
  const blockedSet = new Set(blocked);
  const unregistered = [];
  const events = [];
  const registry = {
    register(accelerator, callback) {
      if (blockedSet.has(accelerator)) return false;
      callbacks.set(accelerator, callback);
      return true;
    },
    unregister(accelerator) {
      callbacks.delete(accelerator);
      unregistered.push(accelerator);
    },
    isRegistered: (accelerator) => callbacks.has(accelerator)
  };
  const manager = new ShortcutManager(registry, {
    getAppState: (key) => values.get(key) ?? null,
    setAppState: (key, value) => values.set(key, value)
  }, {
    info: (message, data) => events.push({ level: "info", message, data }),
    warn: (message, data) => events.push({ level: "warn", message, data })
  }, {
    showWorkspace: () => events.push({ action: "show" }),
    restoreDesktop: () => events.push({ action: "restore" })
  });
  return { manager, callbacks, values, unregistered, events };
}

test("shortcut manager validates accelerators and recovers an invalid saved value", () => {
  assert.equal(isValidPeekAccelerator("Control+Alt+Space"), true);
  assert.equal(isValidPeekAccelerator("Control++Space"), false);
  assert.equal(isValidPeekAccelerator("Control+NotAKey"), false);
  const { manager, callbacks, values } = harness({ shortcut_peek: "bad shortcut" });

  manager.registerAll();
  assert.equal(values.get("shortcut_peek"), DEFAULT_PEEK_ACCELERATOR);
  assert.equal(values.get("shortcut_peek_status"), "ready");
  assert.equal(callbacks.has(DEFAULT_PEEK_ACCELERATOR), true);
  assert.equal(callbacks.has(EMERGENCY_ACCELERATOR), true);
});

test("a conflicting rebind preserves the active shortcut and reports the conflict", async () => {
  const requested = "Control+Shift+F12";
  const { manager, callbacks, values } = harness({}, [requested]);
  manager.registerAll();

  await assert.rejects(manager.setPeekShortcut(requested), /conflict/);
  assert.equal(callbacks.has(DEFAULT_PEEK_ACCELERATOR), true);
  assert.equal(values.get("shortcut_peek"), undefined);
  assert.equal(values.get("shortcut_peek_status"), "conflict");
});

test("shortcut manager invokes callbacks and unregisters owned shortcuts", () => {
  const { manager, callbacks, events, unregistered } = harness();
  manager.registerAll();
  callbacks.get(DEFAULT_PEEK_ACCELERATOR)();
  callbacks.get(EMERGENCY_ACCELERATOR)();
  manager.dispose();

  assert.ok(events.some((event) => event.action === "show"));
  assert.ok(events.some((event) => event.action === "restore"));
  assert.ok(unregistered.includes(DEFAULT_PEEK_ACCELERATOR));
  assert.ok(unregistered.includes(EMERGENCY_ACCELERATOR));
});

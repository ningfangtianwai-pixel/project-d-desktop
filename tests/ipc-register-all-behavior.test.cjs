const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

const handlers = new Map();
const removed = [];
const ipcMain = {
  handle(channel, handler) {
    assert.equal(handlers.has(channel), false, `duplicate IPC channel: ${channel}`);
    handlers.set(channel, handler);
  },
  removeHandler(channel) {
    removed.push(channel);
    handlers.delete(channel);
  }
};
const originalLoad = Module._load;
Module._load = function projectDElectronStub(request, parent, isMain) {
  if (request === "electron") return { ipcMain };
  return originalLoad.call(this, request, parent, isMain);
};
const { registerAllIpcHandlers } = require("../dist/main/ipc/register-all.js");
Module._load = originalLoad;

function deepNoopProxy() {
  const callable = () => proxy;
  const proxy = new Proxy(callable, {
    get: (_target, key) => key === "then" ? undefined : proxy,
    apply: () => proxy
  });
  return proxy;
}

test("all IPC modules register into one owned registry and dispose every channel", () => {
  handlers.clear();
  removed.length = 0;
  const fallback = deepNoopProxy();
  const deps = new Proxy({ assertTrustedSender() {} }, {
    get(target, key) { return key in target ? target[key] : fallback; }
  });

  const dispose = registerAllIpcHandlers(deps);
  const registered = [...handlers.keys()];
  assert.ok(registered.length >= 60, `expected broad IPC coverage, got ${registered.length}`);
  assert.equal(new Set(registered).size, registered.length);

  dispose();
  dispose();
  assert.equal(handlers.size, 0);
  assert.deepEqual(new Set(removed), new Set(registered));
});

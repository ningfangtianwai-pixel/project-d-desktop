const assert = require("node:assert/strict");
const test = require("node:test");

const { createIpcHandlerRegistry } = require("../dist/main/ipc/handler-registry.js");

test("IPC handler registry owns and removes every registered channel", () => {
  const handlers = new Map();
  const removed = [];
  const ipcMain = {
    handle(channel, listener) {
      if (handlers.has(channel)) throw new Error(`duplicate ${channel}`);
      handlers.set(channel, listener);
    },
    removeHandler(channel) {
      removed.push(channel);
      handlers.delete(channel);
    }
  };
  const registry = createIpcHandlerRegistry(ipcMain);
  registry.ipc.handle("projectd:first", () => "first");
  registry.ipc.handle("projectd:second", () => "second");

  assert.equal(handlers.size, 2);
  registry.dispose();
  registry.dispose();

  assert.deepEqual(removed, ["projectd:first", "projectd:second"]);
  assert.equal(handlers.size, 0);
});

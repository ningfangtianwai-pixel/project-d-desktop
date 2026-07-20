const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

let latestTemplate = [];
class FakeTray {
  constructor() { this.destroyed = false; this.listeners = new Map(); }
  isDestroyed() { return this.destroyed; }
  setToolTip(value) { this.tooltip = value; }
  setContextMenu(value) { this.menu = value; }
  on(event, handler) { this.listeners.set(event, handler); }
  destroy() { this.destroyed = true; }
}

const originalLoad = Module._load;
Module._load = function projectDElectronStub(request, parent, isMain) {
  if (request === "electron") {
    return {
      Tray: FakeTray,
      Menu: { buildFromTemplate: (template) => { latestTemplate = template; return { template }; } },
      nativeImage: { createFromDataURL: () => ({}) }
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { ProjectTrayManager } = require("../dist/main/tray-manager.js");
Module._load = originalLoad;

function actions(overrides = {}) {
  const noop = () => {};
  return {
    showMain: noop, activateDesktop: noop, deactivateDesktop: noop,
    enterCleanDesktop: noop, exitCleanDesktop: noop, emergencyRestore: noop,
    startWallpaper: noop, stopWallpaper: noop, pauseEffects: noop, resumeEffects: noop,
    showPet: noop, hidePet: noop, resetPet: noop, openSettings: noop,
    checkForUpdates: noop, quit: noop, ...overrides
  };
}

test("tray creation is idempotent and destroy permits a clean recreation", () => {
  const manager = new ProjectTrayManager(actions(), () => {});
  const first = manager.create();
  assert.equal(manager.create(), first);
  assert.equal(first.tooltip, "Project D");
  assert.ok(latestTemplate.length > 10);
  manager.destroy();
  assert.equal(first.destroyed, true);
  assert.notEqual(manager.create(), first);
});

test("tray quit and rejected actions use the same guarded invocation path", async () => {
  let quitCalls = 0;
  const errors = [];
  const manager = new ProjectTrayManager(actions({
    quit: () => { quitCalls += 1; },
    checkForUpdates: async () => { throw new Error("offline"); }
  }), (action, error) => errors.push({ action, error }));
  manager.create();

  latestTemplate.find((item) => item.label === "退出").click();
  latestTemplate.find((item) => item.label === "检查更新").click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(quitCalls, 1);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].action, "check-updates");
  assert.match(errors[0].error.message, /offline/);
});

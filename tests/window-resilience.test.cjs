const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");

const { WindowResilienceSupervisor, isMostlyWhiteBitmap } = require("../dist/main/window-resilience.js");

class FakeWebContents extends EventEmitter {
  constructor() {
    super();
    this.id = 42;
    this.destroyed = false;
    this.reloads = 0;
    this.probeResult = true;
  }

  isDestroyed() {
    return this.destroyed;
  }

  isLoadingMainFrame() {
    return false;
  }

  reloadIgnoringCache() {
    this.reloads += 1;
  }

  executeJavaScript() {
    return Promise.resolve(this.probeResult);
  }
}

class FakeWindow extends EventEmitter {
  constructor() {
    super();
    this.destroyed = false;
    this.webContents = new FakeWebContents();
  }

  isDestroyed() {
    return this.destroyed;
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

test("renderer crash is logged and recovered by a bounded reload", async () => {
  const window = new FakeWindow();
  const events = [];
  const supervisor = new WindowResilienceSupervisor({
    record: (event) => events.push(event),
    recoveryCooldownMs: 0
  });

  supervisor.register({ window, role: "settings", healthSelector: ".settings-content" });
  window.webContents.emit("render-process-gone", {}, { reason: "crashed", exitCode: -1 });
  await tick();

  assert.equal(window.webContents.reloads, 1);
  assert.equal(events.some((event) => event.status === "recovering" && event.reason === "render-process-gone"), true);
});

test("main-frame load failures recover but an aborted navigation does not", async () => {
  const window = new FakeWindow();
  const supervisor = new WindowResilienceSupervisor({ recoveryCooldownMs: 0 });
  supervisor.register({ window, role: "main", healthSelector: ".app-shell" });

  window.webContents.emit("did-fail-load", {}, -3, "ERR_ABORTED", "file:///app/index.html", true);
  await tick();
  assert.equal(window.webContents.reloads, 0);

  window.webContents.emit("did-fail-load", {}, -105, "ERR_NAME_NOT_RESOLVED", "file:///app/index.html", true);
  await tick();
  assert.equal(window.webContents.reloads, 1);
});

test("resume health probe repairs a partially blank renderer", async () => {
  const window = new FakeWindow();
  window.webContents.probeResult = false;
  const supervisor = new WindowResilienceSupervisor({ recoveryCooldownMs: 0, probeFailureThreshold: 1 });
  supervisor.register({ window, role: "settings", healthSelector: ".settings-content" });

  await supervisor.probeAll("system-resume");

  assert.equal(window.webContents.reloads, 1);
});

test("a single transient health timeout does not reload a healthy renderer", async () => {
  const window = new FakeWindow();
  window.webContents.probeResult = false;
  const events = [];
  const supervisor = new WindowResilienceSupervisor({
    recoveryCooldownMs: 0,
    record: (event) => events.push(event)
  });
  supervisor.register({ window, role: "settings", healthSelector: ".settings-content" });

  await supervisor.probeAll("transient-busy");

  assert.equal(window.webContents.reloads, 0);
  assert.equal(events.some((event) => event.status === "suspect"), true);
});

test("repeated renderer failure escalates instead of looping forever", async () => {
  const window = new FakeWindow();
  let escalations = 0;
  const supervisor = new WindowResilienceSupervisor({
    recoveryCooldownMs: 0,
    unresponsiveGraceMs: 0,
    maxRecoveries: 2,
    recoveryWindowMs: 60_000,
    onExhausted: () => { escalations += 1; }
  });
  supervisor.register({ window, role: "overlay", healthSelector: ".overlay-page" });

  window.emit("unresponsive");
  await tick();
  window.emit("unresponsive");
  await tick();
  window.emit("unresponsive");
  await tick();

  assert.equal(window.webContents.reloads, 2);
  assert.equal(escalations, 1);
});

test("visual health check distinguishes an all-white frame from rendered content", () => {
  const white = Buffer.alloc(10 * 10 * 4, 255);
  const dark = Buffer.from(white);
  dark[0] = 16;
  dark[1] = 16;
  dark[2] = 16;
  for (let offset = 4; offset < dark.length / 2; offset += 4) {
    dark[offset] = 16;
    dark[offset + 1] = 16;
    dark[offset + 2] = 16;
  }
  assert.equal(isMostlyWhiteBitmap(white, 10, 10), true);
  assert.equal(isMostlyWhiteBitmap(dark, 10, 10), false);
});

const assert = require("node:assert/strict");
const test = require("node:test");

const { PortalWatcher } = require("../dist/main/portals/portal-watcher.js");

class FakeTimer {
  constructor() {
    this.time = 0;
    this.nextId = 1;
    this.tasks = new Map();
  }

  now = () => this.time;
  setTimeout = (callback, delayMs) => {
    const id = this.nextId++;
    this.tasks.set(id, { at: this.time + delayMs, callback });
    return id;
  };
  clearTimeout = (id) => this.tasks.delete(id);
  advance(ms) {
    const end = this.time + ms;
    while (true) {
      const due = [...this.tasks.entries()]
        .filter(([, task]) => task.at <= end)
        .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
      if (!due) break;
      const [id, task] = due;
      this.tasks.delete(id);
      this.time = task.at;
      task.callback();
    }
    this.time = end;
  }
}

class FakeAdapter {
  constructor() {
    this.watches = [];
    this.throwFor = new Map();
  }

  watch(portalPath, callbacks) {
    const error = this.throwFor.get(portalPath);
    if (error) throw error;
    const entry = { portalPath, callbacks, closed: false };
    this.watches.push(entry);
    return { close: () => { entry.closed = true; } };
  }

  byPath(portalPath) {
    return this.watches.find((entry) => entry.portalPath === portalPath);
  }
}

const portal = (id, portalPath, isEnabled = true) => ({ id, path: portalPath, isEnabled });

test("portal watcher merges each portal independently with debounce and max delay", () => {
  const timer = new FakeTimer();
  const adapter = new FakeAdapter();
  const events = [];
  const watcher = new PortalWatcher((event) => events.push(event), {
    timer,
    adapter,
    debounceMs: 500,
    maxBatchDelayMs: 2000
  });
  watcher.updatePortals([portal("alpha", "C:/alpha"), portal("beta", "C:/beta")]);

  adapter.byPath("C:/alpha").callbacks.onChange("change", "draft.md");
  timer.advance(400);
  adapter.byPath("C:/alpha").callbacks.onChange("change", "next.md");
  adapter.byPath("C:/beta").callbacks.onChange("change", "brief.md");
  timer.advance(500);
  assert.deepEqual(events.map((event) => event.portalId), ["alpha", "beta"]);

  adapter.byPath("C:/alpha").callbacks.onChange("change", "one.md");
  timer.advance(400);
  adapter.byPath("C:/alpha").callbacks.onChange("change", "two.md");
  timer.advance(400);
  adapter.byPath("C:/alpha").callbacks.onChange("change", "three.md");
  timer.advance(400);
  adapter.byPath("C:/alpha").callbacks.onChange("change", "four.md");
  timer.advance(400);
  adapter.byPath("C:/alpha").callbacks.onChange("change", "five.md");
  timer.advance(400);
  assert.equal(events.filter((event) => event.portalId === "alpha").length, 2);
  watcher.stop();
});

test("portal watcher ignores operating-system and Office temporary files", () => {
  const timer = new FakeTimer();
  const adapter = new FakeAdapter();
  const events = [];
  const watcher = new PortalWatcher((event) => events.push(event), { timer, adapter });
  watcher.updatePortals([portal("alpha", "C:/alpha")]);
  const callbacks = adapter.byPath("C:/alpha").callbacks;
  callbacks.onChange("change", ".DS_Store");
  callbacks.onChange("change", "DESKTOP.INI");
  callbacks.onChange("change", "~$meeting.docx");
  timer.advance(2500);
  assert.equal(events.length, 0);
  callbacks.onChange("change", "meeting.docx");
  timer.advance(500);
  assert.equal(events.length, 1);
  watcher.stop();
});

test("portal watcher releases removed and stopped portals with pending timers", () => {
  const timer = new FakeTimer();
  const adapter = new FakeAdapter();
  const events = [];
  const watcher = new PortalWatcher((event) => events.push(event), { timer, adapter });
  watcher.updatePortals([portal("alpha", "C:/alpha"), portal("beta", "C:/beta")]);
  adapter.byPath("C:/alpha").callbacks.onChange("change", "one.md");
  watcher.updatePortals([portal("beta", "C:/beta", false)]);
  assert.equal(adapter.byPath("C:/alpha").closed, true);
  assert.equal(adapter.byPath("C:/beta").closed, true);
  timer.advance(2500);
  assert.equal(events.length, 0);

  watcher.updatePortals([portal("gamma", "C:/gamma")]);
  const gamma = adapter.byPath("C:/gamma");
  watcher.stop();
  assert.equal(gamma.closed, true);
});

test("portal watcher reports permission and offline errors without throwing", () => {
  const timer = new FakeTimer();
  const adapter = new FakeAdapter();
  const events = [];
  const watcher = new PortalWatcher((event) => events.push(event), { timer, adapter });
  adapter.throwFor.set("C:/denied", Object.assign(new Error("denied"), { code: "EACCES" }));
  watcher.updatePortals([portal("denied", "C:/denied"), portal("gone", "C:/gone")]);
  adapter.byPath("C:/gone").callbacks.onError(Object.assign(new Error("gone"), { code: "ENOENT" }));

  assert.deepEqual(events.map((event) => [event.portalId, event.reason, event.status, event.errorCode]), [
    ["denied", "error", "permission-denied", "EACCES"],
    ["gone", "error", "offline", "ENOENT"]
  ]);
  watcher.stop();
});

test("portal watcher releases a failed handle and reconnects when the portal returns", () => {
  const timer = new FakeTimer();
  const adapter = new FakeAdapter();
  const events = [];
  const watcher = new PortalWatcher((event) => events.push(event), {
    timer,
    adapter,
    reconnectDelayMs: 200
  });
  watcher.updatePortals([portal("alpha", "C:/alpha")]);
  const first = adapter.byPath("C:/alpha");
  first.callbacks.onError(Object.assign(new Error("offline"), { code: "ENOENT" }));

  assert.equal(first.closed, true);
  assert.equal(adapter.watches.length, 1);
  timer.advance(199);
  assert.equal(adapter.watches.length, 1);
  timer.advance(1);
  assert.equal(adapter.watches.length, 2);
  assert.equal(adapter.watches.at(-1).closed, false);
  adapter.watches.at(-1).callbacks.onChange("change", "restored.md");
  timer.advance(500);
  assert.deepEqual(events.map((event) => [event.reason, event.status]), [
    ["error", "offline"],
    ["change", "ready"]
  ]);
  watcher.stop();
});

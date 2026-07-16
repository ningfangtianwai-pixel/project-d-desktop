const assert = require("node:assert/strict");
const test = require("node:test");

const { DesktopRuntimeRecovery } = require("../dist/main/desktop-runtime-recovery.js");

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

test("runtime recovery serializes display repair and coalesces a queued resume rescan", async () => {
  const calls = [];
  let releaseFirst;
  const first = new Promise((resolve) => { releaseFirst = resolve; });
  const recovery = new DesktopRuntimeRecovery({
    reconcileDisplayBounds: async (reason) => {
      calls.push(`bounds:${reason}`);
      if (reason === "display-added") await first;
    },
    repairWallpaperHost: (reason) => calls.push(`wallpaper:${reason}`),
    rescanDesktop: (reason) => calls.push(`scan:${reason}`),
    record: (state) => calls.push(`${state.status}:${state.reason}`)
  });

  recovery.request("display-added");
  recovery.request("display-metrics-changed");
  recovery.resume("system-resume");
  await tick();
  releaseFirst();
  await tick();
  await tick();

  assert.deepEqual(calls.filter((entry) => entry.startsWith("bounds:")), ["bounds:display-added", "bounds:system-resume"]);
  assert.ok(calls.includes("scan:system-resume"));
  assert.equal(calls.at(-1), "ready:system-resume");
});

test("suspended recovery waits until resume and records failures without throwing", async () => {
  const states = [];
  const recovery = new DesktopRuntimeRecovery({
    reconcileDisplayBounds: () => { throw new Error("display unavailable"); },
    repairWallpaperHost: () => undefined,
    rescanDesktop: () => undefined,
    record: (state) => states.push(state)
  });

  recovery.suspend();
  recovery.request("display-removed");
  await tick();
  assert.equal(states.length, 1);
  recovery.resume();
  await tick();
  assert.equal(states.at(-1).status, "failed");
  assert.match(states.at(-1).error, /display unavailable/);
});

test("diagnostics persistence failures never interrupt runtime recovery", async () => {
  let reconciled = false;
  const recovery = new DesktopRuntimeRecovery({
    reconcileDisplayBounds: () => { reconciled = true; },
    repairWallpaperHost: () => undefined,
    rescanDesktop: () => undefined,
    record: () => { throw new Error("database closed"); }
  });
  assert.doesNotThrow(() => recovery.suspend());
  recovery.resume();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(reconciled, true);
});

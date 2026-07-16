const assert = require("node:assert/strict");
const test = require("node:test");

const { presentWallpaperWindow, WallpaperAttachQueue, WallpaperHostSupervisor, retryWallpaperAttach } = require("../dist/main/wallpaper-supervisor.js");

test("wallpaper presentation stays hidden until desktop attachment is confirmed", () => {
  const calls = [];
  const window = {
    hide: () => calls.push("hide"),
    showInactive: () => calls.push("show")
  };

  assert.equal(presentWallpaperWindow(window, { settled: false, attached: false, renderReady: false }), "hidden");
  assert.equal(presentWallpaperWindow(window, { settled: true, attached: false, renderReady: false }), "hidden");
  assert.equal(presentWallpaperWindow(window, { settled: true, attached: true, renderReady: false }), "hidden");
  assert.equal(presentWallpaperWindow(window, null), "hidden");
  assert.equal(presentWallpaperWindow(window, { settled: true, attached: true, renderReady: true }), "shown");
  assert.deepEqual(calls, ["hide", "hide", "hide", "hide", "show"]);
});

test("wallpaper host attachment never forces a hidden window visible", () => {
  const source = require("node:fs").readFileSync("src/main/wallpaper-host.ts", "utf8");
  assert.doesNotMatch(source, /0x0040/);
  assert.match(source, /SetWindowPos\(\$child, \[IntPtr\]::new\(1\)/);
  assert.match(source, /GetParent\(\$child\)/);
  assert.match(source, /WS_CHILD/);
  assert.match(source, /SetThreadDpiAwarenessContext/);
});

test("wallpaper attach retries a transient failure and returns the recovered result", async () => {
  let attempts = 0;
  const waits = [];
  const result = await retryWallpaperAttach({
    attempts: 3,
    attach: async () => {
      attempts += 1;
      return attempts === 1
        ? { attached: false, childHwnd: "10", error: "transient" }
        : { attached: true, childHwnd: "10", parentHwnd: "20", parentKind: "Progman" };
    },
    wait: async (milliseconds) => waits.push(milliseconds)
  });

  assert.equal(attempts, 2);
  assert.deepEqual(waits, [350]);
  assert.equal(result.attached, true);
});

test("wallpaper supervisor coalesces repair requests and stops cleanly", async () => {
  const reasons = [];
  let releaseFirst;
  const firstRun = new Promise((resolve) => { releaseFirst = resolve; });
  const supervisor = new WallpaperHostSupervisor({
    fallbackIntervalMs: 60_000,
    repair: async (reason) => {
      reasons.push(reason);
      if (reasons.length === 1) await firstRun;
    }
  });

  supervisor.start();
  supervisor.request("display-metrics");
  supervisor.request("resume");
  await new Promise((resolve) => setTimeout(resolve, 5));
  releaseFirst();
  await new Promise((resolve) => setTimeout(resolve, 10));
  supervisor.stop();
  supervisor.request("after-stop");
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.deepEqual(reasons, ["display-metrics", "resume"]);
});

test("wallpaper attach queue prevents startup and recovery attachment races", async () => {
  const queue = new WallpaperAttachQueue();
  const calls = [];
  let releaseStartup;
  const startupGate = new Promise((resolve) => { releaseStartup = resolve; });
  const startup = queue.run(async () => {
    calls.push("startup-begin");
    await startupGate;
    calls.push("startup-end");
    return "startup";
  });
  const recovery = queue.run(async () => {
    calls.push("recovery");
    return "recovery";
  });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(calls, ["startup-begin"]);
  releaseStartup();
  assert.deepEqual(await Promise.all([startup, recovery]), ["startup", "recovery"]);
  assert.deepEqual(calls, ["startup-begin", "startup-end", "recovery"]);
});

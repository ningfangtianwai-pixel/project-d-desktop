const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

let implementation = (_file, _args, _options, callback) => callback(null, { stdout: "", stderr: "" });
function execFile(file, args, options, callback) {
  implementation(file, args, options, callback);
}

const originalLoad = Module._load;
Module._load = function projectDChildProcessStub(request, parent, isMain) {
  if (request === "node:child_process") return { execFile };
  return originalLoad.call(this, request, parent, isMain);
};
const { WallpaperHost } = require("../dist/main/wallpaper-host.js");
Module._load = originalLoad;

function windowHandle(value = 42n) {
  const handle = Buffer.alloc(8);
  handle.writeBigUInt64LE(value);
  return { getNativeWindowHandle: () => handle };
}

function logger() {
  const entries = [];
  return {
    entries,
    info(scope, message, data) { entries.push({ level: "info", scope, message, data }); },
    warn(scope, message, data) { entries.push({ level: "warn", scope, message, data }); }
  };
}

test("wallpaper host accepts the final structured PowerShell result", async () => {
  const log = logger();
  implementation = (file, args, options, callback) => {
    assert.equal(file, "powershell.exe");
    assert.ok(args.includes("-EncodedCommand"));
    assert.equal(options.windowsHide, true);
    callback(null, {
      stdout: `noise\n${JSON.stringify({ attached: true, childHwnd: "42", parentHwnd: "9", parentKind: "Progman" })}\n`,
      stderr: ""
    });
  };
  const result = await new WallpaperHost(log).attachToDesktop(windowHandle());
  assert.deepEqual(result, { attached: true, childHwnd: "42", parentHwnd: "9", parentKind: "Progman" });
  assert.equal(log.entries.some((entry) => entry.message === "wallpaper host attach result"), true);
});

test("wallpaper host contains invalid output as a non-throwing failure", async () => {
  const log = logger();
  implementation = (_file, _args, _options, callback) => callback(null, { stdout: "not json", stderr: "warning" });
  const result = await new WallpaperHost(log).attachToDesktop(windowHandle(7n));
  assert.equal(result.attached, false);
  assert.equal(result.childHwnd, "7");
  assert.match(result.error, /no JSON result/i);
  assert.equal(log.entries.some((entry) => entry.message === "wallpaper host attach stderr"), true);
});

test("wallpaper host recovers a valid JSON result from a non-zero PowerShell exit", async () => {
  implementation = (_file, _args, _options, callback) => {
    const error = new Error("non-zero");
    error.stdout = JSON.stringify({ attached: true, childHwnd: "88", parentHwnd: "11", parentKind: "WorkerW" });
    callback(error);
  };
  const result = await new WallpaperHost(logger()).attachToDesktop(windowHandle(88n));
  assert.equal(result.attached, true);
  assert.equal(result.parentKind, "WorkerW");
});

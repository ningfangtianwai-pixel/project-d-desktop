const assert = require("node:assert/strict");
const test = require("node:test");

const { registerWallpaperIpcHandlers } = require("../dist/main/ipc/wallpaper-ipc.js");
const { IPC_CHANNELS } = require("../dist/shared/ipc.js");

test("wallpaper display fit mode is validated and delegated", () => {
  const handlers = new Map();
  const calls = [];
  registerWallpaperIpcHandlers({
    ipc: { handle: (channel, handler) => handlers.set(channel, handler) },
    assertTrustedSender: () => {},
    getDisplays: () => [],
    assignDisplay: () => [],
    setDisplayFitMode: (displayId, fitMode) => {
      calls.push([displayId, fitMode]);
      return [{ id: displayId, fitMode }];
    }
  });

  assert.deepEqual(
    handlers.get(IPC_CHANNELS.WALLPAPER_DISPLAY_FIT)({}, "display-1", "contain"),
    [{ id: "display-1", fitMode: "contain" }]
  );
  assert.deepEqual(calls, [["display-1", "contain"]]);
  assert.throws(() => handlers.get(IPC_CHANNELS.WALLPAPER_DISPLAY_FIT)({}, "display-1", "stretch"), /fit mode/);
});

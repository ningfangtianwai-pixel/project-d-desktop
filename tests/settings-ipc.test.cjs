const assert = require("node:assert/strict");
const test = require("node:test");

const { registerSettingsIpcHandlers } = require("../dist/main/ipc/settings-ipc.js");
const { IPC_CHANNELS } = require("../dist/shared/ipc.js");

test("settings state IPC exposes the multi-display preference used during page startup", () => {
  const handlers = new Map();
  const trustedRoutes = [];
  registerSettingsIpcHandlers({
    ipc: { handle: (channel, handler) => handlers.set(channel, handler) },
    assertTrustedSender: (_event, routes) => trustedRoutes.push(routes),
    getDatabase: () => ({ getAppState: (key) => key === "cover_all_displays" ? "true" : null }),
    getWeather: async () => ({}),
    getWallpaperLibrary: () => [],
    applyWallpaper: () => ({}),
    broadcastSettings: () => {},
    syncWindows: () => {},
    validateSettingsPatch: (patch) => patch,
    tryAiReply: async () => null,
    createLocalAiReply: () => "",
    sendChatMessage: async () => ({})
  });

  const getState = handlers.get(IPC_CHANNELS.STATE_GET);
  assert.equal(getState({}, "cover_all_displays"), "true");
  assert.ok(trustedRoutes.at(-1).includes("#/settings"));
});

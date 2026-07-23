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
    sendChatMessage: async () => ({}),
    testAiConnection: async () => ({ provider: "local-fallback", mode: "local", message: "ok" })
  });

  const getState = handlers.get(IPC_CHANNELS.STATE_GET);
  assert.equal(getState({}, "cover_all_displays"), "true");
  assert.ok(trustedRoutes.at(-1).includes("#/settings"));
});

test("AI connection test is exposed only to settings and does not send a chat message", async () => {
  const handlers = new Map();
  const trustedRoutes = [];
  let chatCalls = 0;
  registerSettingsIpcHandlers({
    ipc: { handle: (channel, handler) => handlers.set(channel, handler) },
    assertTrustedSender: (_event, routes) => trustedRoutes.push(routes),
    getDatabase: () => null,
    getWeather: async () => ({}),
    getWallpaperLibrary: () => [],
    applyWallpaper: () => ({}),
    broadcastSettings: () => {},
    syncWindows: () => {},
    validateSettingsPatch: (patch) => patch,
    sendChatMessage: async () => {
      chatCalls += 1;
      return {};
    },
    testAiConnection: async () => ({ provider: "deepseek", mode: "remote", message: "deepseek 连接正常" })
  });

  const result = await handlers.get(IPC_CHANNELS.AI_TEST_CONNECTION)({});
  assert.deepEqual(result, { provider: "deepseek", mode: "remote", message: "deepseek 连接正常" });
  assert.deepEqual(trustedRoutes.at(-1), ["#/settings"]);
  assert.equal(chatCalls, 0);
});

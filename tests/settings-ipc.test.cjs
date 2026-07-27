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

test("wallpaper import and deletion remain settings-only privileged actions", async () => {
  const handlers = new Map();
  let imported = 0;
  let deleted = "";
  registerSettingsIpcHandlers({
    ipc: { handle: (channel, handler) => handlers.set(channel, handler) },
    assertTrustedSender: () => {},
    getDatabase: () => null,
    getWeather: async () => ({}),
    getWallpaperLibrary: () => [],
    importWallpaper: async () => { imported += 1; return { id: "user-1" }; },
    deleteWallpaper: (id) => { deleted = id; },
    applyWallpaper: () => ({}),
    broadcastSettings: () => {},
    syncWindows: () => {},
    validateSettingsPatch: (patch) => patch,
    sendChatMessage: async () => ({}),
    testAiConnection: async () => ({ provider: "local", mode: "local", message: "ok" })
  });

  assert.deepEqual(await handlers.get(IPC_CHANNELS.WALLPAPER_IMPORT)({}), { id: "user-1" });
  handlers.get(IPC_CHANNELS.WALLPAPER_DELETE)({}, "user-1");
  assert.equal(imported, 1);
  assert.equal(deleted, "user-1");
});

test("Live Photo preview is confirmed explicitly and never accepts an arbitrary token", async () => {
  const handlers = new Map();
  const calls = [];
  registerSettingsIpcHandlers({
    ipc: { handle: (channel, handler) => handlers.set(channel, handler) },
    assertTrustedSender: () => {},
    getDatabase: () => null,
    getWeather: async () => ({}),
    getWallpaperLibrary: () => [],
    importWallpaper: async () => null,
    importLivePhotoWallpaper: async () => null,
    prepareLivePhotoImport: async () => ({ token: "11111111-1111-4111-8111-111111111111", label: "rain", coverUrl: "projectd-media://live-photo-preview/x?kind=cover", videoUrl: "projectd-media://live-photo-preview/x?kind=video", coverWidth: 1920, coverHeight: 1080, videoBytes: 10, videoExtension: ".mp4", expiresAt: new Date(Date.now() + 60_000).toISOString() }),
    confirmLivePhotoImport: async (token) => { calls.push(["confirm", token]); return { id: "user-1" }; },
    cancelLivePhotoImport: (token) => { calls.push(["cancel", token]); },
    deleteWallpaper: () => {},
    applyWallpaper: () => ({}),
    broadcastSettings: () => {},
    syncWindows: () => {},
    validateSettingsPatch: (patch) => patch,
    sendChatMessage: async () => ({}),
    testAiConnection: async () => ({ provider: "local", mode: "local", message: "ok" })
  });

  const draft = await handlers.get(IPC_CHANNELS.WALLPAPER_PREPARE_LIVE_PHOTO)({});
  assert.equal(draft.label, "rain");
  await assert.rejects(handlers.get(IPC_CHANNELS.WALLPAPER_CONFIRM_LIVE_PHOTO)({}, "not-a-token"), /token/);
  assert.deepEqual(await handlers.get(IPC_CHANNELS.WALLPAPER_CONFIRM_LIVE_PHOTO)({}, draft.token), { id: "user-1" });
  handlers.get(IPC_CHANNELS.WALLPAPER_CANCEL_LIVE_PHOTO)({}, draft.token);
  assert.deepEqual(calls, [["confirm", draft.token], ["cancel", draft.token]]);
});

test("visual profile IPC requires consent, remains settings-only, and persists only confirmed profiles", async () => {
  const handlers = new Map();
  const routes = [];
  const saved = [];
  registerSettingsIpcHandlers({
    ipc: { handle: (channel, handler) => handlers.set(channel, handler) },
    assertTrustedSender: (_event, allowed) => routes.push(allowed),
    getDatabase: () => ({ setAppState: (key, value) => saved.push([key, value]) }),
    getWeather: async () => ({}),
    getWallpaperLibrary: () => [],
    applyWallpaper: () => ({}),
    broadcastSettings: () => {},
    syncWindows: () => {},
    validateSettingsPatch: (patch) => patch,
    sendChatMessage: async () => ({}),
    testAiConnection: async () => ({ provider: "local", mode: "local", message: "ok" }),
    draftPetVisualProfile: async () => ({ type: "anime", appearance: ["blue"], personality: "gentle", tone: "warm", forbiddenWords: [], actionSuggestions: ["idle"] })
  });
  await assert.rejects(handlers.get(IPC_CHANNELS.AI_PET_VISUAL_DRAFT)({}, { characterId: "luna-q", imageDataUrl: "data:image/png;base64,AA==", consent: false }), /consent/);
  const profile = await handlers.get(IPC_CHANNELS.AI_PET_VISUAL_DRAFT)({}, { characterId: "luna-q", imageDataUrl: "data:image/png;base64,AA==", consent: true });
  handlers.get(IPC_CHANNELS.AI_PET_VISUAL_SAVE)({}, "luna-q", profile);
  assert.deepEqual(routes.at(-1), ["#/settings"]);
  assert.equal(saved[0][0], "pet_visual_profile:luna-q");
});

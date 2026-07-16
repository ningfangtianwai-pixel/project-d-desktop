const assert = require("node:assert/strict");
const test = require("node:test");

const { SceneService } = require("../dist/main/scenes/scene-service.js");

function createStore() {
  const scenes = new Map();
  const positions = [];
  const settingsPatches = [];
  const portals = [
    { id: "portal-a", name: "A", path: "C:/a", realPath: "C:/a", isEnabled: true, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" },
    { id: "portal-b", name: "B", path: "C:/b", realPath: "C:/b", isEnabled: false, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" }
  ];
  const portalWrites = [];
  const accents = [];
  return {
    scenes,
    positions,
    settingsPatches,
    portalWrites,
    accents,
    getContainers: () => [
      { id: 1, positionX: 24, positionY: 96, width: 300, height: 280, isCollapsed: false, accentColor: "sky" },
      { id: 2, positionX: 348, positionY: 96, width: 320, height: 240, isCollapsed: true, accentColor: "mint" }
    ],
    getSettings: () => ({
      wallpaper: { dynamicId: "anime-lake", isDynamic: true },
      weather: { particleIntensity: 72, enableBorderInteraction: true },
      pet: { isVisible: true, currentOutfit: "raincoat", scale: 1.1, personality: "gentle", autoOutfit: true, actionInterval: 15, talkFrequency: "normal" }
    }),
    getAppState: (key) => ({
      current_layout_id: "4",
      performance_mode: "balanced",
      "suggestion:delivery-controls": JSON.stringify({ disabled: false, snoozedUntil: null })
    })[key] ?? null,
    getPortalConfigs: () => portals.map((portal) => structuredClone(portal)),
    savePortalConfig: (portal) => {
      portalWrites.push(structuredClone(portal));
      const index = portals.findIndex((item) => item.id === portal.id);
      portals[index] = structuredClone(portal);
    },
    saveWorkspaceScene: (scene) => scenes.set(scene.id, structuredClone(scene)),
    getWorkspaceScenes: () => [...scenes.values()].map((scene) => structuredClone(scene)),
    getWorkspaceScene: (sceneId) => scenes.has(sceneId) ? structuredClone(scenes.get(sceneId)) : null,
    updateContainerPosition: (...args) => positions.push(args),
    updateContainerAccent: (...args) => accents.push(args),
    updateSettings: (patch) => {
      settingsPatches.push(structuredClone(patch));
      return {};
    }
  };
}

test("workspace scene saves and restores real container geometry and appearance state", () => {
  const store = createStore();
  const service = new SceneService(store);
  const scene = service.save("  深度工作  ");

  assert.equal(scene.name, "深度工作");
  assert.equal(scene.layoutId, 4);
  assert.equal(scene.wallpaperId, "anime-lake");
  assert.equal(scene.wallpaperDynamic, true);
  assert.equal(scene.performanceMode, "balanced");
  assert.equal(scene.petVisible, true);
  assert.deepEqual(scene.portalIds, ["portal-a"]);
  assert.deepEqual(scene.weatherState, { particleIntensity: 72, enableBorderInteraction: true });
  assert.equal(scene.petState.currentOutfit, "raincoat");
  assert.equal(scene.suggestionControls.disabled, false);
  assert.equal(scene.containerLayout.length, 2);

  const applied = service.apply(scene.id);
  assert.equal(applied.id, scene.id);
  assert.deepEqual(store.positions, [
    [1, 24, 96, 300, 280, false],
    [2, 348, 96, 320, 240, true]
  ]);
  assert.deepEqual(store.accents, [[1, "sky"], [2, "mint"]]);
  assert.deepEqual(store.settingsPatches, [{
    wallpaper: { dynamicId: "anime-lake", isDynamic: true },
    weather: { particleIntensity: 72, enableBorderInteraction: true },
    pet: { isVisible: true, currentOutfit: "raincoat", scale: 1.1, personality: "gentle", autoOutfit: true, actionInterval: 15, talkFrequency: "normal" },
    appState: {
      performance_mode: "balanced",
      "suggestion:delivery-controls": JSON.stringify({ disabled: false, snoozedUntil: null }),
      current_layout_id: "4"
    }
  }]);
  assert.deepEqual(store.portalWrites, []);
});

test("workspace scene persists pinned search resources without duplicating them", () => {
  const store = createStore();
  const service = new SceneService(store);
  const scene = service.save("钉选场景");
  service.pinResource(scene.id, { origin: "desktop", fileId: 7, path: "C:/Desktop/brief.pdf", label: "brief.pdf" });
  const updated = service.pinResource(scene.id, { origin: "desktop", fileId: 7, path: "C:/Desktop/brief.pdf", label: "更新名称.pdf" });

  assert.equal(updated.pinnedResources.length, 1);
  assert.equal(updated.pinnedResources[0].label, "更新名称.pdf");
  assert.equal(store.getWorkspaceScene(scene.id).pinnedResources[0].fileId, 7);
});

test("workspace scene restores the enabled portal set without deleting portal consent", () => {
  const store = createStore();
  const service = new SceneService(store);
  const scene = service.save("工作");
  scene.portalIds = ["portal-b"];
  store.scenes.set(scene.id, structuredClone(scene));

  service.apply(scene.id);
  assert.deepEqual(store.portalWrites.map((portal) => [portal.id, portal.isEnabled]), [
    ["portal-a", false],
    ["portal-b", true]
  ]);
});

test("workspace scene preserves a disabled dynamic-wallpaper state", () => {
  const store = createStore();
  const service = new SceneService(store);
  const scene = service.save("纯净");
  scene.wallpaperDynamic = false;
  store.scenes.set(scene.id, structuredClone(scene));

  service.apply(scene.id);
  assert.deepEqual(store.settingsPatches.at(-1).wallpaper, {
    dynamicId: "anime-lake",
    isDynamic: false
  });
});

test("workspace scene refuses unknown ids without mutating layout", () => {
  const store = createStore();
  const service = new SceneService(store);

  assert.throws(() => service.apply("missing-scene"), /not found/i);
  assert.equal(store.positions.length, 0);
  assert.equal(store.settingsPatches.length, 0);
});

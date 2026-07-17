const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("search, scene, and portal IPC handlers stay in their owning modules", () => {
  const main = fs.readFileSync(path.join(root, "src/main/main.ts"), "utf8");
  const boundaries = [
    ["SEARCH_QUERY", "src/main/search/search-ipc.ts"],
    ["ACTION_PLAN_INBOX", "src/main/actions/action-ipc.ts"],
    ["SCENES_GET_ALL", "src/main/scenes/scene-ipc.ts"],
    ["PORTALS_CHOOSE_FOLDER", "src/main/portals/portal-ipc.ts"]
  ];

  for (const [channel, relativeFile] of boundaries) {
    const owner = fs.readFileSync(path.join(root, relativeFile), "utf8");
    assert.equal(main.includes(`ipcMain.handle(IPC_CHANNELS.${channel}`), false, `${channel} leaked back into main.ts`);
    assert.match(owner, new RegExp(`(?:ipc|ipcMain)\\.handle\\(IPC_CHANNELS\\.${channel}`));
  }
});

test("IPC composition keeps module contracts instead of an any-based service bag", () => {
  const registration = fs.readFileSync(path.join(root, "src/main/ipc/register-all.ts"), "utf8");
  const serviceContract = registration.slice(
    registration.indexOf("export interface ServiceDeps"),
    registration.indexOf("export function registerAllIpcHandlers")
  );

  assert.doesNotMatch(serviceContract, /\bany\b/);
  for (const dependency of ["DesktopIpcDependencies", "SettingsIpcDependencies", "UpdateIpcDependencies", "WallpaperIpcDependencies"]) {
    assert.match(serviceContract, new RegExp(`HandlerDependencies<${dependency}>`));
  }
});

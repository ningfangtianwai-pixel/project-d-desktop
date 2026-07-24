const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const originalLoad = Module._load;
Module._load = function projectDElectronStub(request, parent, isMain) {
  if (request === "electron") {
    return {
      app: { getPath: () => os.tmpdir(), getAppPath: () => process.cwd() },
      safeStorage: {
        isEncryptionAvailable: () => false,
        encryptString: () => { throw new Error("safeStorage disabled in Node test"); },
        decryptString: () => { throw new Error("safeStorage disabled in Node test"); }
      }
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { DatabaseService } = require("../dist/main/database.js");
Module._load = originalLoad;

function logger() {
  return { info() {}, warn() {}, error() {}, debug() {} };
}

test("database persists settings and reopens with an integral schema", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "projectd-db-behavior-"));
  const file = path.join(root, "database.sqlite");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const first = new DatabaseService(logger(), file);
  const created = await first.initialize();
  assert.equal(created.createdNow, true);
  first.updateSettings({ pet: { personality: "calm", actionInterval: 321 } });
  first.close();

  const second = new DatabaseService(logger(), file);
  const reopened = await second.initialize();
  assert.equal(reopened.createdNow, false);
  assert.equal(second.getSettings().pet.personality, "calm");
  assert.equal(second.getSettings().pet.actionInterval, 321);
  assert.equal(second.getAppState("schema_version"), "6");
  second.close();
});

test("unreadable database is preserved and replaced by a clean recoverable database", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "projectd-db-corrupt-"));
  const file = path.join(root, "database.sqlite");
  const corrupt = Buffer.from("not-a-sqlite-database-private-filename.txt", "utf8");
  fs.writeFileSync(file, corrupt);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const database = new DatabaseService(logger(), file);
  const status = await database.initialize();
  assert.equal(status.initialized, true);
  assert.equal(status.createdNow, true);
  assert.ok(database.getAppState("database_recovered_from_corruption"));
  database.close();

  const backups = fs.readdirSync(root).filter((name) => name.includes(".corrupt-") && name.endsWith(".backup"));
  assert.equal(backups.length, 1);
  assert.deepEqual(fs.readFileSync(path.join(root, backups[0])), corrupt);
  assert.ok(fs.statSync(file).size > corrupt.length);
});

test("user wallpaper assets persist separately and clear stale display assignments on deletion", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "projectd-db-media-"));
  const file = path.join(root, "database.sqlite");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const database = new DatabaseService(logger(), file);
  await database.initialize();
  database.saveUserMediaAsset({
    id: "user-01234567-89ab-cdef-0123-456789abcdef",
    label: "Local image",
    style: "minimalist",
    type: "image",
    file: "user-image.png",
    aliases: ["local"],
    source: "user"
  }, path.join(root, "wallpapers", "originals", "user-image.png"));
  database.setDisplayWallpaperAssignment("display-1", "user-01234567-89ab-cdef-0123-456789abcdef");

  assert.equal(database.getUserMediaAssets().length, 1);
  assert.ok(database.getUserMediaAssetPath("user-01234567-89ab-cdef-0123-456789abcdef").endsWith("user-image.png"));
  assert.equal(database.getDisplayWallpaperAssignments()["display-1"], "user-01234567-89ab-cdef-0123-456789abcdef");

  assert.equal(database.deleteUserMediaAsset("user-01234567-89ab-cdef-0123-456789abcdef"), true);
  assert.equal(database.getUserMediaAssets().length, 0);
  assert.equal(database.getDisplayWallpaperAssignments()["display-1"], undefined);
  database.close();
});

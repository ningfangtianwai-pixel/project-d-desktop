const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app } = require("electron");

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "projectd-wallpaper-library-"));
  const databasePath = path.join(root, "database.sqlite");
  try {
    const { DatabaseService } = require("../dist/main/database.js");
    const { WallpaperLibraryService } = require("../dist/main/wallpaper-library-service.js");
    const logger = { info() {}, warn() {}, error() {}, debug() {} };
    const database = new DatabaseService(logger, databasePath);
    await database.initialize();
    const service = new WallpaperLibraryService(root, database, logger);
    await service.initialize();

    const source = path.join(__dirname, "..", "public", "wallpapers", "anime-lakeside-station.png");
    const imported = await service.importImage(source);
    assert.equal(imported.source, "user");
    assert.ok(service.list().some((asset) => asset.id === imported.id));
    assert.ok(fs.existsSync(service.resolveAssetPath(imported.id, "original")));

    const pairedVideo = path.join(root, "fixture.mp4");
    fs.writeFileSync(pairedVideo, Buffer.from("Project D Live Photo fixture"));
    const livePhoto = await service.importLivePhoto(source, pairedVideo);
    assert.equal(livePhoto.type, "video");
    assert.equal(livePhoto.livePhoto, true);
    assert.ok(fs.existsSync(service.resolveAssetPath(livePhoto.id, "original")));
    assert.ok(fs.existsSync(service.resolveAssetPath(livePhoto.id, "cover")));
    assert.ok(fs.existsSync(service.resolveAssetPath(livePhoto.id, "thumbnail")));
    assert.ok(service.list().some((asset) => asset.id === livePhoto.id && asset.livePhoto));
    assert.ok(fs.existsSync(service.resolveAssetPath(imported.id, "thumbnail")));

    database.setDisplayWallpaperAssignment("qa-display", imported.id);
    service.delete(imported.id);
    service.delete(livePhoto.id);
    assert.equal(database.getDisplayWallpaperAssignments()["qa-display"], undefined);
    assert.equal(service.list().some((asset) => asset.id === imported.id), false);
    database.close();
    process.stdout.write(JSON.stringify({ passed: true, importedId: imported.id }) + "\n");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

app.whenReady()
  .then(main)
  .then(() => app.exit(0))
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });

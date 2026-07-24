const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { app, nativeImage } = require("electron");

const ROOT = path.resolve(__dirname, "..");
const PET_ROOT = path.join(ROOT, "public", "pet");
const REQUIRED_SLOTS = ["idle", "walk", "happy", "thinking", "sleep", "interaction"];
const CHARACTER_IDS = ["luna-q", "luna-spring", "starlight", "floral-star", "lin-yuxi"];

function fail(message) {
  throw new Error(`Pet asset verification failed: ${message}`);
}

function resolveAsset(manifestPath, image) {
  if (typeof image !== "string" || !image || path.isAbsolute(image)) {
    fail(`${manifestPath} has an invalid asset path`);
  }
  const resolved = path.resolve(path.dirname(manifestPath), image);
  const relative = path.relative(PET_ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(`${manifestPath} escapes the public pet directory`);
  }
  return resolved;
}

async function main() {
  await app.whenReady();
  const summary = [];
  for (const id of CHARACTER_IDS) {
    const manifestPath = path.join(PET_ROOT, id, "manifest.json");
    if (!fs.existsSync(manifestPath)) fail(`missing manifest for ${id}`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifest.id !== id || !manifest.actions || typeof manifest.actions !== "object") {
      fail(`invalid manifest identity for ${id}`);
    }
    const actionHashes = new Set();
    for (const slot of REQUIRED_SLOTS) {
      const asset = manifest.actions[slot];
      if (!asset || !Number.isInteger(asset.width) || !Number.isInteger(asset.height) || asset.width < 1 || asset.height < 1) {
        fail(`${id}:${slot} is missing dimensions`);
      }
      const assetPath = resolveAsset(manifestPath, asset.image);
      const stat = fs.statSync(assetPath);
      if (!stat.isFile() || stat.size === 0) fail(`${id}:${slot} is missing or empty`);
      const image = nativeImage.createFromPath(assetPath);
      if (image.isEmpty() || image.getSize().width !== asset.width || image.getSize().height !== asset.height) {
        fail(`${id}:${slot} has an unexpected image size`);
      }
      actionHashes.add(crypto.createHash("sha256").update(fs.readFileSync(assetPath)).digest("hex"));
    }
    if (id !== "luna-q" && actionHashes.size !== REQUIRED_SLOTS.length) {
      fail(`${id} has duplicated action frames; every declared slot must use a distinct asset`);
    }
    summary.push(`${id}: ${REQUIRED_SLOTS.length} action slots`);
  }
  process.stdout.write(`Pet assets verified (${summary.join(", ")})\n`);
}

main().then(() => app.quit()).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  app.exit(1);
});

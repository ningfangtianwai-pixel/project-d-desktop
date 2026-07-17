const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { WALLPAPER_LIBRARY, WALLPAPER_STYLES, wallpaperDisplayLabel } = require("../dist/shared/wallpaper-library.js");

test("wallpaper library has at least two real local assets for every required style", () => {
  assert.equal(WALLPAPER_STYLES.length, 6);
  for (const [style] of WALLPAPER_STYLES) {
    const items = WALLPAPER_LIBRARY.filter((wallpaper) => wallpaper.style === style);
    assert.ok(items.length >= 2, `${style} only has ${items.length} wallpaper(s)`);
    for (const item of items) {
      const assetPath = path.join(__dirname, "..", "public", "wallpapers", item.file);
      assert.ok(fs.existsSync(assetPath), `${item.id} is missing ${assetPath}`);
      assert.ok(fs.statSync(assetPath).size > 100_000, `${item.id} is still a low-detail placeholder`);
      if (item.type === "video") {
        assert.ok(item.posterFile, `${item.id} must define a static poster fallback`);
        assert.ok(fs.existsSync(path.join(__dirname, "..", "public", "wallpapers", item.posterFile)), `${item.id} poster is missing`);
      }
    }
  }
});

test("wallpaper controls identify both the asset and its style", () => {
  const lakeside = WALLPAPER_LIBRARY.find((wallpaper) => wallpaper.id === "anime-lakeside-station");
  assert.equal(wallpaperDisplayLabel(lakeside), "湖畔车站 · 动漫");
  assert.equal(wallpaperDisplayLabel(null), "选择壁纸");
});

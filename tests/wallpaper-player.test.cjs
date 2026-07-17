const assert = require("node:assert/strict");
const test = require("node:test");

const { WallpaperPlayer } = require("../dist/shared/wallpaper-player.js");

test("wallpaper player keeps the previous wallpaper when a new asset fails", async () => {
  const loads = [];
  const player = new WallpaperPlayer(async (asset) => {
    loads.push(asset.id);
    if (asset.id === "broken") throw new Error("missing asset");
  });
  const first = { id: "first", type: "image", src: "/first.jpg" };
  const broken = { id: "broken", type: "image", src: "/broken.jpg" };

  assert.equal((await player.select(first)).current.id, "first");
  const failed = await player.select(broken);
  assert.equal(failed.changed, false);
  assert.equal(failed.current.id, "first");
  assert.match(failed.error, /missing asset/);
  assert.deepEqual(loads, ["first", "broken"]);
});

test("wallpaper player caches preloads and ignores stale concurrent selection", async () => {
  const releases = new Map();
  const counts = new Map();
  const player = new WallpaperPlayer((asset) => {
    counts.set(asset.id, (counts.get(asset.id) ?? 0) + 1);
    return new Promise((resolve) => releases.set(asset.id, resolve));
  });
  const first = { id: "first", type: "image", src: "/first.jpg" };
  const second = { id: "second", type: "image", src: "/second.jpg" };

  const firstSelection = player.select(first);
  const secondSelection = player.select(second);
  releases.get("second")();
  await secondSelection;
  releases.get("first")();
  const stale = await firstSelection;
  await player.preload(second);

  assert.equal(stale.stale, true);
  assert.equal(player.current.id, "second");
  assert.equal(counts.get("second"), 1);
});

test("wallpaper player bounds its preload cache with LRU eviction", async () => {
  const counts = new Map();
  const player = new WallpaperPlayer(async (asset) => {
    counts.set(asset.id, (counts.get(asset.id) ?? 0) + 1);
  }, 2);
  const asset = (id) => ({ id, type: "image", src: `/${id}.jpg` });

  await player.preload(asset("one"));
  await player.preload(asset("two"));
  await player.preload(asset("three"));
  await player.preload(asset("one"));

  assert.equal(counts.get("one"), 2);
  assert.equal(counts.get("two"), 1);
  assert.equal(counts.get("three"), 1);
});

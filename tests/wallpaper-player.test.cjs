const assert = require("node:assert/strict");
const test = require("node:test");

const { WallpaperPlayer } = require("../dist/shared/wallpaper-player.js");

test("wallpaper player exposes the complete playback lifecycle", async () => {
  const states = [];
  let releaseLoad;
  const player = new WallpaperPlayer(
    () => new Promise((resolve) => {
      releaseLoad = resolve;
    })
  );
  const video = { id: "video", type: "video", src: "/video.mp4" };
  const unsubscribe = player.subscribe((snapshot) => states.push([snapshot.state, snapshot.lastEvent]));

  const selection = player.select(video);
  assert.equal(player.snapshot.state, "loading");
  releaseLoad();
  await selection;
  player.handleMediaEvent("video", "canplay");
  player.handleMediaEvent("video", "playing");
  player.handleMediaEvent("video", "pause");
  player.handleMediaEvent("video", "ended");
  unsubscribe();

  assert.deepEqual(states, [
    ["idle", null],
    ["loading", null],
    ["loading", null],
    ["loading", "canplay"],
    ["playing", "playing"],
    ["paused", "pause"],
    ["loading", "ended"]
  ]);
});

test("runtime pause and resume permit one new video play attempt", async () => {
  const player = new WallpaperPlayer(async () => undefined);
  const video = { id: "video", type: "video", src: "/video.mp4" };

  await player.select(video);
  assert.equal(player.requestPlay("video"), true);
  assert.equal(player.requestPlay("video"), false);
  player.handleMediaEvent("video", "playing");
  player.pause();
  assert.equal(player.snapshot.state, "paused");
  assert.equal(player.requestPlay("video"), false);
  player.resume();
  assert.equal(player.snapshot.state, "loading");
  assert.equal(player.requestPlay("video"), true);
  assert.equal(player.requestPlay("video"), false);
});

test("video playback failure falls back to its static poster without retrying", async () => {
  const states = [];
  const player = new WallpaperPlayer(async () => undefined);
  const video = {
    id: "video",
    type: "video",
    src: "/video.mp4",
    posterSrc: "/video-poster.jpg"
  };
  player.subscribe((snapshot) => states.push(snapshot.state));

  await player.select(video);
  assert.equal(player.requestPlay("video"), true);
  player.handleMediaEvent("video", "error", "decoder unavailable");

  assert.equal(player.snapshot.state, "fallback");
  assert.deepEqual(player.snapshot.fallback, {
    id: "video:poster",
    type: "image",
    src: "/video-poster.jpg"
  });
  assert.match(player.snapshot.error, /decoder unavailable/);
  assert.equal(player.requestPlay("video"), false);
  assert.deepEqual(states.slice(-2), ["error", "fallback"]);
});

test("stalled video preserves the previous wallpaper when no poster exists", async () => {
  const player = new WallpaperPlayer(async () => undefined);
  const cover = { id: "cover", type: "image", src: "/cover.jpg" };
  const video = { id: "video", type: "video", src: "/video.mp4" };

  await player.select(cover);
  await player.select(video);
  player.handleMediaEvent("video", "stalled");

  assert.equal(player.snapshot.state, "fallback");
  assert.equal(player.snapshot.fallback.id, "cover");
  assert.equal(player.snapshot.lastEvent, "stalled");
});

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

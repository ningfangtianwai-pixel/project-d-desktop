const assert = require("node:assert/strict");
const test = require("node:test");

const { PET_ACTION_SLOTS, parsePetManifest, petActionSlotFor } = require("../dist/shared/pet-manifest.js");

function manifest() {
  return {
    id: "luna-q",
    name: "Luna Q",
    source: "/pet/luna-q/",
    actions: Object.fromEntries(PET_ACTION_SLOTS.map((slot) => [slot, { image: "idle.png", width: 127, height: 228 }]))
  };
}

test("a pet manifest requires every supported action slot", () => {
  const valid = parsePetManifest(manifest(), "luna-q");
  assert.equal(valid?.actions.idle.width, 127);

  const incomplete = manifest();
  delete incomplete.actions.walk;
  assert.equal(parsePetManifest(incomplete, "luna-q"), null);
  assert.equal(parsePetManifest(manifest(), "different"), null);
});

test("ambient states resolve to deterministic package action slots", () => {
  assert.equal(petActionSlotFor("walking"), "walk");
  assert.equal(petActionSlotFor("cheerful"), "happy");
  assert.equal(petActionSlotFor("sleeping"), "sleep");
  assert.equal(petActionSlotFor("rain"), "interaction");
  assert.equal(petActionSlotFor("idle"), "idle");
});

const assert = require("node:assert/strict");
const test = require("node:test");

const { CONTAINER_ACCENT_OPTIONS, isContainerAccent, normalizeContainerAccent } = require("../dist/shared/container-accents.js");

test("container accents expose exactly eight persisted safe choices", () => {
  assert.equal(CONTAINER_ACCENT_OPTIONS.length, 8);
  assert.equal(new Set(CONTAINER_ACCENT_OPTIONS.map((option) => option.id)).size, 8);
  assert.equal(CONTAINER_ACCENT_OPTIONS.every((option) => /^#[0-9a-f]{6}$/i.test(option.color)), true);
});

test("container accent validation rejects arbitrary CSS and falls back safely", () => {
  assert.equal(isContainerAccent("sky"), true);
  assert.equal(isContainerAccent("url(javascript:alert(1))"), false);
  assert.equal(normalizeContainerAccent("not-a-color"), "neutral");
});

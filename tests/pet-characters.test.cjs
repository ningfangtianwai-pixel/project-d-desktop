const assert = require("node:assert/strict");
const test = require("node:test");

const { PET_CHARACTERS, getPetCharacter, normalizePetCharacterId } = require("../dist/shared/pet-characters.js");

test("every supplied Project D character is selectable", () => {
  assert.equal(PET_CHARACTERS.length, 5);
  assert.equal(new Set(PET_CHARACTERS.map((character) => character.id)).size, 5);
  assert.ok(PET_CHARACTERS.every((character) => character.asset.startsWith("pet/characters/")));
});

test("legacy and invalid pet ids recover to Luna Q", () => {
  assert.equal(normalizePetCharacterId("default"), "luna-q");
  assert.equal(normalizePetCharacterId("missing"), "luna-q");
  assert.equal(getPetCharacter("lin-yuxi").name, "林予曦");
});

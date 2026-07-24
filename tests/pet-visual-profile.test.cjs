const assert = require("node:assert/strict");
const test = require("node:test");

const { parsePetVisualProfile, validatePetVisualProfile } = require("../dist/shared/pet-visual-profile.js");

const profile = {
  type: "anime desktop companion",
  appearance: ["short dark hair", "pale blue outfit"],
  personality: "gentle",
  tone: "brief and warm",
  forbiddenWords: ["harassment"],
  actionSuggestions: ["idle", "walk", "happy"]
};

test("a visual profile must be structured and use declared action slots", () => {
  assert.deepEqual(validatePetVisualProfile(profile), profile);
  assert.deepEqual(parsePetVisualProfile(`\`\`\`json\n${JSON.stringify(profile)}\n\`\`\``), profile);
  assert.equal(validatePetVisualProfile({ ...profile, actionSuggestions: ["teleport"] }), null);
  assert.equal(validatePetVisualProfile({ ...profile, appearance: [] }), null);
});

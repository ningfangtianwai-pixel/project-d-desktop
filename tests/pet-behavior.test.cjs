const assert = require("node:assert/strict");
const test = require("node:test");

const { petActionIntervalMs, petBubbleDelayMs, petPersonalityInstruction, petSentence } = require("../dist/shared/pet-behavior.js");

test("pet talk frequency changes real scheduling ranges", () => {
  assert.equal(petBubbleDelayMs("silent", false, () => 0.5), null);
  assert.equal(petBubbleDelayMs("chatty", false, () => 0), 120_000);
  assert.equal(petBubbleDelayMs("normal", false, () => 0), 360_000);
  assert.equal(petBubbleDelayMs("rare", false, () => 0), 1_200_000);
  assert.ok(petBubbleDelayMs("chatty", false, () => 1) < petBubbleDelayMs("normal", false, () => 1));
});

test("pet action interval and AI voice honor the selected settings", () => {
  assert.equal(petActionIntervalMs(120), 120_000);
  assert.equal(petActionIntervalMs(5), 15_000);
  assert.equal(petActionIntervalMs(5000), 3_600_000);
  assert.match(petPersonalityInstruction("cold"), /冷静简洁/);
  assert.match(petPersonalityInstruction("gentle"), /温柔/);
});

test("pet personalities produce visibly different voices", () => {
  const energetic = petSentence("energetic", () => 0);
  const cold = petSentence("cold", () => 0);
  const tsundere = petSentence("tsundere", () => 0);
  assert.notEqual(energetic, cold);
  assert.match(energetic, /精神|庆祝|冲刺|好耶/);
  assert.match(cold, /正常|异常|优先级|待命/);
  assert.match(tsundere, /不是|误会|而已/);
});

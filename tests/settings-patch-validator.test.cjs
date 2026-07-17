const assert = require("node:assert/strict");
const test = require("node:test");
const { validateSettingsPatch } = require("../dist/main/settings-patch-validator.js");

test("settings validator accepts the bounded settings-page payload", () => {
  const patch = {
    weather: { mode: "auto", particleIntensity: 0.8, apiKey: "" },
    ai: { provider: "deepseek", apiEndpoint: "https://api.deepseek.com", maxTokens: 300, enabled: true },
    appState: {
      auto_activate_on_start: "true",
      launch_at_login: "true",
      cover_all_displays: "true",
      performance_mode: "balanced"
    }
  };
  assert.deepEqual(validateSettingsPatch(patch), patch);
});

test("settings validator rejects unknown and restricted state fields", () => {
  assert.throws(() => validateSettingsPatch({ internal: { arbitrary: true } }), /Unknown settings section/);
  assert.throws(() => validateSettingsPatch({ appState: { desktop_state: "active" } }), /Restricted appState key/);
});

test("settings validator rejects unsafe endpoints and out-of-range values", () => {
  assert.throws(() => validateSettingsPatch({ ai: { apiEndpoint: "file:///secret" } }), /Invalid ai.apiEndpoint/);
  assert.throws(() => validateSettingsPatch({ weather: { particleIntensity: 99 } }), /Invalid weather.particleIntensity/);
  assert.throws(() => validateSettingsPatch({ pet: { talkFrequency: "always" } }), /Invalid pet.talkFrequency/);
});

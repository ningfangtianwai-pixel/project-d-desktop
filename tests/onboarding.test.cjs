const test = require("node:test");
const assert = require("node:assert/strict");

const onboarding = require("../dist/shared/onboarding.js");

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

test("onboarding is visible on first launch and restores progress", () => {
  const storage = memoryStorage();
  let state = onboarding.readOnboardingState(storage, 5);
  assert.equal(onboarding.shouldShowOnboarding(state), true);
  state = onboarding.advanceOnboarding(state, 5, new Date("2026-01-01T00:00:00Z"));
  onboarding.writeOnboardingState(storage, state);
  assert.equal(onboarding.readOnboardingState(storage, 5).currentStep, 1);
});

test("completed and skipped onboarding no longer opens automatically", () => {
  const storage = memoryStorage();
  const initial = onboarding.readOnboardingState(storage, 2);
  const skipped = onboarding.finishOnboarding(initial, "skipped");
  assert.equal(onboarding.shouldShowOnboarding(skipped), false);
  const completed = onboarding.advanceOnboarding({ ...initial, currentStep: 1 }, 2);
  assert.equal(completed.status, "completed");
  assert.equal(onboarding.shouldShowOnboarding(completed), false);
});

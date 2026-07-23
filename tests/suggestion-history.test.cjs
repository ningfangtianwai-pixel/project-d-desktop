const assert = require("node:assert/strict");
const test = require("node:test");

const {
  appendSuggestionSuppressionHistory,
  parseSuggestionSuppressionHistory
} = require("../dist/main/suggestions/suggestion-history.js");

test("suggestion suppression history ignores malformed records", () => {
  const parsed = parseSuggestionSuppressionHistory(JSON.stringify([
    { reason: "scheduled-quiet-hours", explanation: "当前处于免打扰时段。", suppressedAt: "2026-07-20T08:00:00.000Z" },
    { reason: "", explanation: "missing reason", suppressedAt: "2026-07-20T08:00:00.000Z" },
    { reason: "runtime-fullscreen", explanation: "invalid date", suppressedAt: "today" },
    { reason: "x".repeat(81), explanation: "too long", suppressedAt: "2026-07-20T08:00:00.000Z" }
  ]));

  assert.deepEqual(parsed, [{
    reason: "scheduled-quiet-hours",
    explanation: "当前处于免打扰时段。",
    suppressedAt: "2026-07-20T08:00:00.000Z"
  }]);
  assert.deepEqual(parseSuggestionSuppressionHistory("{invalid"), []);
});

test("suggestion suppression history stays chronological and bounded", () => {
  let history = [];
  for (let index = 0; index < 25; index += 1) {
    history = appendSuggestionSuppressionHistory(history, {
      reason: `reason-${index}`,
      explanation: `explanation-${index}`,
      suppressedAt: new Date(Date.UTC(2026, 6, 20, 8, index)).toISOString()
    });
  }

  assert.equal(history.length, 20);
  assert.equal(history[0].reason, "reason-5");
  assert.equal(history.at(-1).reason, "reason-24");
});

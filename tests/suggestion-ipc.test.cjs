const assert = require("node:assert/strict");
const test = require("node:test");

const { registerSuggestionIpcHandlers } = require("../dist/main/ipc/suggestion-ipc.js");
const { IPC_CHANNELS } = require("../dist/shared/ipc.js");

test("suggestion suppression history is exposed as settings-only read data", () => {
  const handlers = new Map();
  const trustedCalls = [];
  const expected = [{
    reason: "runtime-fullscreen",
    explanation: "全屏应用运行中。",
    suppressedAt: "2026-07-20T08:00:00.000Z"
  }];
  const fallback = () => undefined;
  registerSuggestionIpcHandlers({
    ipc: { handle: (channel, handler) => handlers.set(channel, handler) },
    assertTrustedSender: (_event, routes) => trustedCalls.push(routes),
    getLatestSuggestion: () => null,
    getSuggestionControls: () => ({}),
    getSuggestionSuppressionHistory: () => structuredClone(expected),
    serializeOp: async (operation) => operation(),
    dismissSuggestion: fallback,
    snoozeSuggestions: fallback,
    setSuggestionEnabled: fallback,
    updateSuggestionPolicy: fallback,
    getDiagnosticsReport: fallback,
    exportDiagnostics: fallback
  });

  const handler = handlers.get(IPC_CHANNELS.SUGGESTIONS_GET_SUPPRESSION_HISTORY);
  assert.equal(typeof handler, "function");
  assert.deepEqual(handler({}), expected);
  assert.deepEqual(trustedCalls.at(-1), ["#/settings"]);
});

const assert = require("node:assert/strict");
const test = require("node:test");

const { evaluateCrashAlerts } = require("../dist/main/operations/alert-engine.js");

const now = new Date("2026-07-17T08:00:00.000Z");

function metric(rate, totalSessions = 100) {
  const crashedSessions = Math.round(totalSessions * (1 - rate));
  return {
    appVersion: "1.2.3",
    generatedAt: now.toISOString(),
    windowStartedAt: "2026-07-16T08:00:00.000Z",
    totalSessions,
    crashedSessions,
    crashFreeSessions: totalSessions - crashedSessions,
    crashFreeRate: rate,
    crashEventCount: crashedSessions,
    startupCrashCount: 0,
    topFingerprints: []
  };
}

function crashes(count, fingerprint = "renderer:white-screen") {
  return Array.from({ length: count }, (_, index) => ({
    eventId: `event-${fingerprint}-${index}`,
    sessionId: `session-${index}`,
    appVersion: "1.2.3",
    occurredAt: new Date(now.getTime() - index * 20_000).toISOString(),
    process: "renderer",
    fingerprint,
    startup: false
  }));
}

test("P0 supersedes P1 for the same crash-free condition", () => {
  const result = evaluateCrashAlerts({ metrics: [metric(0.90)], crashEvents: [], now });
  assert.equal(result.emitted.length, 1);
  assert.equal(result.emitted[0].severity, "P0");
  assert.equal(result.emitted[0].kind, "crash-free-rate");
});

test("fingerprint spike alerts deduplicate inside cooldown", () => {
  const first = evaluateCrashAlerts({ metrics: [], crashEvents: crashes(6), now });
  assert.equal(first.emitted.length, 1);
  assert.equal(first.emitted[0].severity, "P1");
  const second = evaluateCrashAlerts({
    metrics: [],
    crashEvents: crashes(6),
    previousState: first.state,
    now: new Date(now.getTime() + 5 * 60_000)
  });
  assert.equal(second.emitted.length, 0);
  assert.equal(second.suppressed.length, 1);
});

test("severity escalation bypasses an existing P1 cooldown", () => {
  const first = evaluateCrashAlerts({ metrics: [], crashEvents: crashes(6), now });
  const escalated = evaluateCrashAlerts({
    metrics: [],
    crashEvents: crashes(12),
    previousState: first.state,
    now: new Date(now.getTime() + 2 * 60_000)
  });
  assert.equal(escalated.emitted.length, 1);
  assert.equal(escalated.emitted[0].severity, "P0");
});

test("healthy observations clear active state so recurrence can alert immediately", () => {
  const first = evaluateCrashAlerts({ metrics: [metric(0.98)], crashEvents: [], now });
  assert.equal(first.state.length, 1);
  const healthy = evaluateCrashAlerts({
    metrics: [metric(0.999)], crashEvents: [], previousState: first.state,
    now: new Date(now.getTime() + 1_000)
  });
  assert.equal(healthy.state.length, 0);
  const recurrence = evaluateCrashAlerts({
    metrics: [metric(0.98)], crashEvents: [], previousState: healthy.state,
    now: new Date(now.getTime() + 2_000)
  });
  assert.equal(recurrence.emitted.length, 1);
});

const assert = require("node:assert/strict");
const test = require("node:test");

const { aggregateCrashMetrics, dedupeCrashEvents } = require("../dist/main/operations/crash-metrics.js");

const now = new Date("2026-07-17T08:00:00.000Z");

function session(id, version = "1.0.0") {
  return { sessionId: id, appVersion: version, startedAt: "2026-07-17T07:30:00.000Z" };
}

function crash(id, sessionId, fingerprint = "renderer:white-screen", version = "1.0.0") {
  return {
    eventId: id,
    sessionId,
    appVersion: version,
    occurredAt: "2026-07-17T07:45:00.000Z",
    process: "renderer",
    fingerprint,
    startup: false
  };
}

test("version aggregation calculates crash-free sessions and deduplicates event IDs", () => {
  const sessions = [session("a"), session("b"), session("c"), session("d", "2.0.0")];
  const duplicate = crash("event-1", "a");
  const events = [duplicate, { ...duplicate }, crash("event-2", "a"), crash("event-3", "b", "gpu:exit")];
  const metrics = aggregateCrashMetrics(sessions, events, { now });
  const v1 = metrics.find((metric) => metric.appVersion === "1.0.0");
  assert.equal(v1.totalSessions, 3);
  assert.equal(v1.crashedSessions, 2);
  assert.equal(v1.crashFreeSessions, 1);
  assert.equal(v1.crashFreeRate, 1 / 3);
  assert.equal(v1.crashEventCount, 3);
  assert.deepEqual(v1.topFingerprints[0], {
    fingerprint: "renderer:white-screen", count: 2, affectedSessions: 1
  });
  assert.equal(dedupeCrashEvents(events).length, 3);
});

test("orphan crash events remain visible without corrupting the session denominator", () => {
  const metrics = aggregateCrashMetrics(
    [session("known")],
    [crash("orphan-event", "unknown-session", "main:startup")],
    { now }
  )[0];
  assert.equal(metrics.totalSessions, 1);
  assert.equal(metrics.crashedSessions, 0);
  assert.equal(metrics.crashEventCount, 1);
  assert.equal(metrics.crashFreeRate, 1);
});

test("events outside the reporting window are excluded", () => {
  const old = { ...crash("old", "a"), occurredAt: "2026-07-15T08:00:00.000Z" };
  const metrics = aggregateCrashMetrics([session("a")], [old], { now, windowMs: 60 * 60_000 });
  assert.equal(metrics[0].crashEventCount, 0);
  assert.equal(metrics[0].crashFreeRate, 1);
});

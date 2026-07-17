const assert = require("node:assert/strict");
const test = require("node:test");

const { OperationsTelemetryService } = require("../dist/main/operations/operations-telemetry.js");

test("operations telemetry persists a privacy-safe local crash dashboard", () => {
  const values = new Map();
  let timestamp = Date.parse("2026-07-17T08:00:00.000Z");
  const telemetry = new OperationsTelemetryService(
    "0.1.0",
    { get: (key) => values.get(key) ?? null, set: (key, value) => values.set(key, value) },
    () => new Date(timestamp += 1_000)
  );

  telemetry.start();
  const dashboard = telemetry.recordCrash("renderer", "renderer:wallpaper:crashed");
  telemetry.finish();

  assert.equal(dashboard.metrics.totalSessions, 1);
  assert.equal(dashboard.metrics.crashedSessions, 1);
  const persistedEvents = JSON.parse(values.get("operations:crash-events"));
  assert.equal(persistedEvents.length, 1);
  assert.match(persistedEvents[0].fingerprint, /^[a-f0-9]{24}$/);
  assert.equal(JSON.stringify(persistedEvents).includes("wallpaper:crashed"), false);
  assert.ok(values.has("operations:dashboard"));
});

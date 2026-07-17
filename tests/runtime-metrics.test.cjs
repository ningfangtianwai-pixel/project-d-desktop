const assert = require("node:assert/strict");
const test = require("node:test");
const { RuntimeMetricsService, createRuntimeMetricsReport } = require("../dist/main/runtime-metrics.js");

const state = {
  paused: false, reasons: [], manual: false, externalFullscreen: false, screenLocked: false,
  suspended: false, onBattery: false, batteryLevel: null, thermalState: "nominal",
  configuredMode: "auto", effectiveProfile: "balanced", changedAt: "2026-01-01T00:00:00.000Z"
};

test("runtime metrics service normalizes and flushes bounded batches", () => {
  const persisted = [];
  const service = new RuntimeMetricsService({
    sampleProcesses: () => [{ source: "main", processId: 4, cpuPercent: -1, workingSetBytes: 128 }],
    getRuntimeState: () => state,
    persistBatch: (batch) => persisted.push(...batch),
    now: () => new Date("2026-01-01T00:01:00.000Z"),
    flushSize: 2
  });
  service.capture();
  service.capture();
  assert.equal(persisted.length, 2);
  assert.equal(persisted[0].cpuPercent, 0);
});

test("runtime report calculates median, p95 and memory growth", () => {
  const samples = [
    { sampledAt: "2026-01-01T00:00:00.000Z", source: "main", processId: 1, cpuPercent: 1, workingSetBytes: 100, paused: false, profile: "balanced" },
    { sampledAt: "2026-01-01T00:01:00.000Z", source: "main", processId: 1, cpuPercent: 8, workingSetBytes: 115, paused: true, profile: "batterySaver" },
    { sampledAt: "2026-01-01T00:02:00.000Z", source: "main", processId: 1, cpuPercent: 3, workingSetBytes: 110, paused: false, profile: "balanced" }
  ];
  const report = createRuntimeMetricsReport(samples, new Date("2026-01-01T00:02:00.000Z"));
  assert.equal(report.cpuMedianPercent, 3);
  assert.equal(report.cpuP95Percent, 8);
  assert.equal(report.memoryGrowthPercent, 10);
  assert.equal(report.pausedSampleCount, 1);
});

test("runtime report excludes incomplete startup process groups from memory baseline", () => {
  const samples = [
    { sampledAt: "2026-01-01T00:00:00.000Z", source: "main", processId: 1, cpuPercent: 0, workingSetBytes: 100, paused: false, profile: "balanced" },
    { sampledAt: "2026-01-01T00:01:00.000Z", source: "main", processId: 1, cpuPercent: 1, workingSetBytes: 100, paused: false, profile: "balanced" },
    { sampledAt: "2026-01-01T00:01:00.000Z", source: "gpu", processId: 2, cpuPercent: 2, workingSetBytes: 200, paused: false, profile: "balanced" },
    { sampledAt: "2026-01-01T00:02:00.000Z", source: "main", processId: 1, cpuPercent: 1, workingSetBytes: 110, paused: false, profile: "balanced" },
    { sampledAt: "2026-01-01T00:02:00.000Z", source: "gpu", processId: 2, cpuPercent: 2, workingSetBytes: 220, paused: false, profile: "balanced" }
  ];
  const report = createRuntimeMetricsReport(samples, new Date("2026-01-01T00:02:00.000Z"));
  assert.equal(report.memoryGrowthPercent, 10);
  assert.equal(report.cpuMedianPercent, 3);
});

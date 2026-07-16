const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DIAGNOSTICS_EXPORT_SCHEMA,
  DIAGNOSTICS_EXPORT_SCHEMA_VERSION,
  MAX_DIAGNOSTICS_EXPORT_BYTES,
  DiagnosticsService,
  redactDiagnosticText
} = require("../dist/main/diagnostics/diagnostics-service.js");

function createService() {
  return new DiagnosticsService({ now: () => new Date("2026-07-13T10:00:00.000Z") });
}

function healthyInput(overrides = {}) {
  return {
    app: { version: "0.2.0", platform: "win32", architecture: "x64" },
    database: { healthy: true, schemaVersion: 3, migrationCount: 8 },
    desktop: { healthy: true, desktopFileCount: 14, portalCount: 2 },
    wallpaperHost: { healthy: true, attached: true },
    recentLogs: [],
    providerConfigured: true,
    ...overrides
  };
}

test("creates a fixed JSON-safe healthy report from metadata only", () => {
  const report = createService().createReport(healthyInput());

  assert.equal(report.generatedAt, "2026-07-13T10:00:00.000Z");
  assert.equal(report.health, "healthy");
  assert.deepEqual(report.counts, {
    desktopFiles: 14,
    portals: 2,
    recentErrors: 0,
    configuredProviders: 1,
    schemaVersion: 3,
    migrationCount: 8
  });
  assert.deepEqual(report.statusCodes, {
    database: "ok",
    desktop: "ok",
    wallpaperHost: "ok",
    aiProvider: "ok"
  });
  assert.doesNotThrow(() => JSON.stringify(report));
});

test("redacts keys, bearer values, and Windows or Unix paths from errors", () => {
  const report = createService().createReport(healthyInput({
    recentLogs: [{
      level: "error",
      code: "wallpaper attach failed",
      summary: "Bearer sk-1234567890abcdef key=super-secret at C:\\Users\\Alice\\Desktop\\secret.txt and /home/alice/token"
    }]
  }));

  assert.equal(report.health, "degraded");
  assert.equal(report.recentErrors[0].code, "wallpaper-attach-failed");
  assert.match(report.recentErrors[0].summary, /Bearer \[REDACTED\]/);
  assert.match(report.recentErrors[0].summary, /key=\[REDACTED\]/i);
  assert.match(report.recentErrors[0].summary, /\[PATH\]/);
  assert.doesNotMatch(report.recentErrors[0].summary, /Alice|super-secret|sk-1234567890abcdef|secret\.txt|\/home/);
});

test("limits summaries and exposes only the newest five errors", () => {
  const errors = Array.from({ length: 7 }, (_, index) => ({
    level: "error",
    code: `E${index}`,
    summary: `failure ${index} ${"x".repeat(400)}`,
    occurredAt: "invalid"
  }));
  const report = createService().createReport(healthyInput({ recentLogs: errors, providerConfigured: false }));

  assert.equal(report.counts.recentErrors, 5);
  assert.equal(report.recentErrors[0].code, "e2");
  assert.equal(report.recentErrors.at(-1).code, "e6");
  assert.ok(report.recentErrors.every((error) => error.summary.length <= 240));
  assert.ok(report.recentErrors.every((error) => error.occurredAt === null));
  assert.equal(report.statusCodes.aiProvider, "not-configured");
  assert.equal(redactDiagnosticText("token: abcdefghijklmnopqrstuvwxyz", 20).length <= 20, true);
});

test("has no side effects and reports degraded or unavailable health from input flags", () => {
  const input = healthyInput({
    database: { healthy: false, schemaVersion: -1, migrationCount: -2 },
    desktop: { healthy: true, desktopFileCount: -3, portalCount: -4 },
    wallpaperHost: { healthy: true, attached: false },
    recentLogs: [{ level: "info", summary: "this is not an error" }]
  });
  const original = structuredClone(input);

  const report = createService().createReport(input);

  assert.deepEqual(input, original);
  assert.equal(report.health, "unhealthy");
  assert.equal(report.statusCodes.database, "unavailable");
  assert.equal(report.statusCodes.wallpaperHost, "degraded");
  assert.equal(report.counts.desktopFiles, 0);
  assert.equal(report.counts.portals, 0);
  assert.equal(report.counts.schemaVersion, 0);
});

test("requires explicit consent before serializing diagnostics", () => {
  const service = createService();
  const report = service.createReport(healthyInput());

  assert.throws(
    () => service.serializeForExport(report, { consent: false }),
    /explicit consent is required/i
  );
  assert.throws(
    () => service.serializeForExport(report),
    /explicit consent is required/i
  );
});

test("serializes an allowlisted, deterministic, versioned export envelope", () => {
  const service = createService();
  const report = service.createReport(healthyInput());
  report.chatHistory = [{ role: "user", content: "private conversation" }];
  report.fileList = ["C:\\Users\\Alice\\Desktop\\private.txt"];
  report.rawLogs = ["password=hunter2"];
  report.app.installPath = "C:\\Program Files\\ProjectD";

  const first = service.serializeForExport(report, { consent: true });
  const second = service.serializeForExport(report, { consent: true });
  const exported = JSON.parse(first);

  assert.equal(first, second);
  assert.equal(exported.schema, DIAGNOSTICS_EXPORT_SCHEMA);
  assert.equal(exported.schemaVersion, DIAGNOSTICS_EXPORT_SCHEMA_VERSION);
  assert.equal(exported.generatedAt, "2026-07-13T10:00:00.000Z");
  assert.deepEqual(Object.keys(exported).sort(), ["generatedAt", "report", "schema", "schemaVersion"]);
  assert.deepEqual(Object.keys(exported.report).sort(), [
    "app",
    "counts",
    "generatedAt",
    "health",
    "recentErrors",
    "statusCodes"
  ]);
  assert.doesNotMatch(first, /chatHistory|fileList|rawLogs|installPath|private conversation|hunter2|Alice/);
});

test("redacts quoted secrets and paths with spaces and bounds the complete export payload", () => {
  const service = createService();
  const report = service.createReport(healthyInput({
    recentLogs: Array.from({ length: 20 }, (_, index) => ({
      level: "error",
      code: `EXPORT_${index}`,
      summary: `password=\"very private phrase\" api_key='secret-${index}' OPENAI_API_KEY=\"short-secret-${index}\" at \"C:\\Users\\Alice Smith\\Desktop\\private ${index}.txt\", C:/Users/Alice Smith/Desktop/forward-${index}.txt and '/home/alice smith/private ${index}.log' ${"x".repeat(2_000)}`
    }))
  }));

  const serialized = service.serializeForExport(report, { consent: true });
  const exported = JSON.parse(serialized);

  assert.equal(exported.report.recentErrors.length, 5);
  assert.ok(Buffer.byteLength(serialized, "utf8") <= MAX_DIAGNOSTICS_EXPORT_BYTES);
  assert.doesNotMatch(serialized, /very private phrase|secret-\d+|short-secret-\d+|Alice Smith|alice smith|private \d+\.(txt|log)|forward-\d+\.txt/);
  assert.match(serialized, /\[REDACTED\]/);
  assert.match(serialized, /\[PATH\]/);
});

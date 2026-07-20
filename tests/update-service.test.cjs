const assert = require("node:assert/strict");
const test = require("node:test");

const {
  UpdateService,
  normalizeUpdateChannel,
  validateManualUpdateUrl
} = require("../dist/main/update-service.js");

function createService(overrides = {}) {
  const values = overrides.values ?? new Map();
  const opened = [];
  const service = new UpdateService({
    currentVersion: "0.2.0-beta.2",
    releasesUrl: "https://github.com/ningfangtianwai-pixel/project-d-desktop/releases",
    state: {
      get: (key) => values.get(key) ?? null,
      set: (key, value) => values.set(key, value)
    },
    logger: { info() {}, warn() {} },
    openExternal: async (url) => { opened.push(url); },
    now: () => new Date("2026-07-20T08:00:00.000Z"),
    ...overrides
  });
  return { service, values, opened };
}

test("manual update URL accepts only a repository GitHub Releases page", () => {
  assert.equal(validateManualUpdateUrl("http://github.com/owner/repo/releases"), null);
  assert.equal(validateManualUpdateUrl("https://example.com/owner/repo/releases"), null);
  assert.equal(validateManualUpdateUrl("https://github.com/owner/repo/releases/latest"), null);
  assert.equal(validateManualUpdateUrl("https://github.com/owner/repo/releases/?token=secret"), "https://github.com/owner/repo/releases");
  assert.equal(normalizeUpdateChannel("beta"), "beta");
  assert.equal(normalizeUpdateChannel("nightly"), "stable");
});

test("manual mode starts without updater network work", () => {
  const { service } = createService();
  const status = service.getStatus();
  assert.equal(status.phase, "manual");
  assert.equal(status.feedConfigured, true);
  assert.equal(status.stagedRolloutSupported, false);
  assert.doesNotThrow(() => service.dispose());
});

test("checking for updates opens the trusted GitHub Releases page", async () => {
  const { service, opened } = createService();
  const status = await service.checkForUpdates();
  assert.deepEqual(opened, ["https://github.com/ningfangtianwai-pixel/project-d-desktop/releases"]);
  assert.equal(status.phase, "manual");
  assert.equal(status.lastCheckedAt, "2026-07-20T08:00:00.000Z");
  assert.match(status.message, /SHA256/);
});

test("invalid update address disables the update entry", async () => {
  const { service, opened } = createService({ releasesUrl: "https://updates.projectd.invalid/releases" });
  assert.equal(service.getStatus().phase, "disabled");
  await assert.rejects(() => service.checkForUpdates(), /GitHub Releases/);
  assert.deepEqual(opened, []);
});

test("operations policy can pause the manual release link", async () => {
  const { service, opened } = createService({ distributionAllowed: () => false });
  await assert.rejects(() => service.checkForUpdates(), /运维策略暂停/);
  assert.deepEqual(opened, []);
});

test("channel preference persists without changing the manual update transport", () => {
  const { service, values } = createService();
  const status = service.setChannel("beta");
  assert.equal(status.channel, "beta");
  assert.equal(status.phase, "manual");
  assert.equal(values.get("update_channel"), "beta");
});

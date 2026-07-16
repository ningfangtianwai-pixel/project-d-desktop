const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");

const { UpdateService, normalizeUpdateChannel, validateUpdateFeedUrl } = require("../dist/main/update-service.js");

class FakeUpdater extends EventEmitter {
  constructor() {
    super();
    this.autoDownload = true;
    this.autoInstallOnAppQuit = true;
    this.allowPrerelease = false;
    this.allowDowngrade = false;
    this.disableWebInstaller = false;
    this.channel = null;
    this.feed = null;
    this.checks = 0;
    this.downloads = 0;
    this.installs = 0;
  }

  setFeedURL(feed) {
    this.feed = feed;
  }

  async checkForUpdates() {
    this.checks += 1;
    this.emit("checking-for-update");
    this.emit("update-not-available", { version: "0.1.0" });
  }

  async downloadUpdate() {
    this.downloads += 1;
    this.emit("download-progress", { percent: 50, transferred: 50, total: 100 });
    this.emit("update-downloaded", { version: "0.2.0" });
  }

  quitAndInstall() {
    this.installs += 1;
  }
}

function createService(overrides = {}) {
  const updater = overrides.updater ?? new FakeUpdater();
  const values = new Map();
  const service = new UpdateService({
    updater,
    currentVersion: "0.1.0",
    isPackaged: true,
    feedUrl: "https://updates.example.test/project-d",
    state: {
      get: (key) => values.get(key) ?? null,
      set: (key, value) => values.set(key, value)
    },
    logger: { info() {}, warn() {}, error() {} },
    ...overrides
  });
  return { service, updater, values };
}

test("update feed only accepts HTTPS and channels normalize safely", () => {
  assert.equal(validateUpdateFeedUrl("http://example.test"), null);
  assert.equal(validateUpdateFeedUrl("not a url"), null);
  assert.equal(validateUpdateFeedUrl("https://example.test/releases/"), "https://example.test/releases");
  assert.equal(normalizeUpdateChannel("beta"), "beta");
  assert.equal(normalizeUpdateChannel("nightly"), "stable");
});

test("update service stays disabled without a production feed", async () => {
  const { service } = createService({ feedUrl: null });
  assert.equal(service.getStatus().phase, "disabled");
  assert.equal(service.getStatus().feedConfigured, false);
  await assert.rejects(() => service.checkForUpdates(), /尚未配置/);
});

test("a packaged build can use its bundled app-update configuration", () => {
  const { service, updater } = createService({ feedUrl: null, useBundledFeed: true });
  assert.equal(service.getStatus().phase, "idle");
  assert.equal(service.getStatus().feedConfigured, true);
  assert.equal(updater.feed, null);
  assert.equal(updater.channel, "latest");
});

test("stable and beta channels configure matching feed metadata", () => {
  const { service, updater, values } = createService();
  assert.equal(updater.channel, "latest");
  assert.equal(updater.autoDownload, false);
  assert.equal(updater.autoInstallOnAppQuit, false);

  const status = service.setChannel("beta");
  assert.equal(status.channel, "beta");
  assert.equal(values.get("update_channel"), "beta");
  assert.equal(updater.channel, "beta");
  assert.equal(updater.allowPrerelease, true);
  assert.equal(updater.feed.channel, "beta");
});

test("manual update lifecycle requires availability before download and install", async () => {
  const { service, updater } = createService();
  await assert.rejects(() => service.downloadUpdate(), /没有可下载/);

  updater.emit("update-available", { version: "0.2.0" });
  assert.equal(service.getStatus().phase, "available");
  await service.downloadUpdate();
  assert.equal(service.getStatus().phase, "downloaded");
  assert.equal(service.getStatus().progressPercent, 100);

  service.installDownloadedUpdate();
  assert.equal(updater.installs, 1);
});

const assert = require("node:assert/strict");
const { generateKeyPairSync, sign } = require("node:crypto");
const test = require("node:test");

const { OperationsControlService } = require("../dist/main/operations/operations-control.js");
const { remoteConfigSigningBytes, sha256Hex } = require("../dist/main/operations/remote-config.js");

function signedEnvelope(keys, revision = 1) {
  const payload = {
    featureOverrides: [{ key: "online.ai", enabled: false }],
    disabledAssets: [{ assetId: "wallpaper.bad", reason: "render failure" }],
    disabledVersions: [],
    updateDistribution: { paused: true, withdrawnVersions: [] }
  };
  const unsigned = {
    schemaVersion: 1,
    configId: "project-d-production",
    revision,
    issuedAt: "2026-07-17T00:00:00.000Z",
    expiresAt: "2026-07-18T00:00:00.000Z",
    payloadSha256: sha256Hex(payload),
    payload
  };
  return {
    ...unsigned,
    signatureBase64: sign(null, remoteConfigSigningBytes(unsigned), keys.privateKey).toString("base64")
  };
}

test("operations control fetches, verifies, persists, and applies remote stops", async () => {
  const keys = generateKeyPairSync("ed25519");
  const values = new Map();
  const service = new OperationsControlService({
    appVersion: "0.1.0",
    configId: "project-d-production",
    endpoint: "https://operations.example.test/config.json",
    publicKey: keys.publicKey.export({ format: "pem", type: "spki" }),
    state: { get: (key) => values.get(key) ?? null, set: (key, value) => values.set(key, value) },
    logger: { info() {}, warn() {} },
    fetchConfig: async () => signedEnvelope(keys)
  });

  await service.initialize();
  assert.equal(service.feature({ key: "online.ai", risk: "low", defaultEnabled: true }).enabled, false);
  assert.equal(service.assetAllowed("wallpaper.bad"), false);
  assert.equal(service.version().distributionAllowed, false);
  assert.ok(values.has("operations:verified-config"));
  assert.ok(values.has("operations:config-cursor"));
  service.dispose();
});

test("operations control stays inactive without both HTTPS endpoint and public key", async () => {
  const service = new OperationsControlService({
    appVersion: "0.1.0",
    configId: "project-d-production",
    endpoint: "http://unsafe.example.test/config.json",
    publicKey: null,
    state: { get: () => null, set() {} },
    logger: { info() {}, warn() {} },
    fetchConfig: async () => { throw new Error("must not fetch"); }
  });
  await service.initialize();
  assert.equal(service.configured, false);
  assert.equal(service.feature({ key: "online.weather", risk: "low", defaultEnabled: true }).enabled, true);
  service.dispose();
});

test("operations control preserves the anti-rollback cursor when the cached envelope is unusable", async () => {
  const keys = generateKeyPairSync("ed25519");
  const newer = signedEnvelope(keys, 5);
  const values = new Map([
    ["operations:verified-config", "{not-json"],
    ["operations:config-cursor", JSON.stringify({
      configId: newer.configId,
      revision: newer.revision,
      payloadSha256: newer.payloadSha256,
      expiresAt: newer.expiresAt
    })]
  ]);
  const service = new OperationsControlService({
    appVersion: "0.1.0",
    configId: "project-d-production",
    endpoint: "https://operations.example.test/config.json",
    publicKey: keys.publicKey.export({ format: "pem", type: "spki" }),
    state: { get: (key) => values.get(key) ?? null, set: (key, value) => values.set(key, value) },
    logger: { info() {}, warn() {} },
    fetchConfig: async () => signedEnvelope(keys, 4)
  });

  await service.initialize();
  await assert.rejects(service.refresh(), /revision-rollback/);
  service.dispose();
});

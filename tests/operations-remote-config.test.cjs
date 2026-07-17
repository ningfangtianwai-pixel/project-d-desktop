const assert = require("node:assert/strict");
const { generateKeyPairSync, sign } = require("node:crypto");
const test = require("node:test");

const {
  advanceRemoteConfigCursor,
  decideAsset,
  decideFeature,
  decideVersion,
  remoteConfigSigningBytes,
  sha256Hex,
  verifyRemoteConfig
} = require("../dist/main/operations/remote-config.js");

const now = new Date("2026-07-17T08:00:00.000Z");
const keys = generateKeyPairSync("ed25519");

function envelope(overrides = {}) {
  const payload = overrides.payload ?? {
    featureOverrides: [{ key: "weather.effects", enabled: false }],
    disabledAssets: [{ assetId: "wallpaper.bad", reason: "render crash" }],
    disabledVersions: ["0.1.0"],
    updateDistribution: { paused: false, withdrawnVersions: ["0.0.9"] }
  };
  const unsigned = {
    schemaVersion: 1,
    configId: "project-d-production",
    revision: overrides.revision ?? 7,
    issuedAt: "2026-07-17T07:00:00.000Z",
    expiresAt: overrides.expiresAt ?? "2026-07-18T08:00:00.000Z",
    payloadSha256: sha256Hex(payload),
    payload
  };
  return {
    ...unsigned,
    signatureBase64: sign(null, remoteConfigSigningBytes(unsigned), keys.privateKey).toString("base64")
  };
}

function verify(value = envelope()) {
  return verifyRemoteConfig(value, {
    source: "remote",
    publicKey: keys.publicKey,
    expectedConfigId: "project-d-production",
    now
  });
}

test("signed remote config verifies checksum, environment and Ed25519 signature", () => {
  const verified = verify();
  assert.equal(verified.envelope.revision, 7);
  assert.equal(verified.source, "remote");
});

test("remote config requires an environment binding and rejects ambiguous schema fields", () => {
  assert.throws(() => verifyRemoteConfig(envelope(), {
    source: "remote", publicKey: keys.publicKey, now
  }), /expected config ID/);
  const ambiguous = envelope();
  ambiguous.payload.unrecognizedControl = true;
  assert.throws(() => verify(ambiguous), /Unknown payload field/);
});

test("tampering and expired configuration are rejected", () => {
  const tampered = envelope();
  tampered.payload.disabledVersions.push("9.9.9");
  assert.throws(() => verify(tampered), /checksum mismatch/);
  assert.throws(() => verify(envelope({ expiresAt: "2026-07-17T07:59:59.000Z" })), /expired/);
});

test("unsigned fixture is only accepted through the explicit development escape hatch", () => {
  const fixture = { ...envelope(), signatureBase64: null };
  assert.throws(() => verifyRemoteConfig(fixture, { source: "local-fixture", now }), /public key/);
  const verified = verifyRemoteConfig(fixture, {
    source: "local-fixture",
    now,
    allowUnsignedDevelopmentFixture: true
  });
  assert.equal(verified.source, "local-fixture");
});

test("revision cursor rejects rollback and same-revision payload collision", () => {
  const accepted = advanceRemoteConfigCursor(null, verify(envelope({ revision: 7 })));
  assert.equal(accepted.accepted, true);
  const current = accepted.cursor;
  assert.deepEqual(advanceRemoteConfigCursor(current, verify(envelope({ revision: 6 }))), {
    accepted: false,
    reason: "revision-rollback"
  });
  const changedPayload = {
    ...envelope({ revision: 7 }).payload,
    disabledVersions: ["2.0.0"]
  };
  assert.deepEqual(advanceRemoteConfigCursor(current, verify(envelope({ revision: 7, payload: changedPayload }))), {
    accepted: false,
    reason: "revision-collision"
  });
});

test("desktop core cannot be disabled and unavailable config only fails open for low risk", () => {
  const config = verify();
  assert.deepEqual(decideFeature({
    key: "weather.effects", risk: "low", defaultEnabled: true
  }, config, now), { key: "weather.effects", enabled: false, reason: "remote-override" });
  assert.equal(decideFeature({
    key: "desktop.clean-mode.escape", risk: "high", defaultEnabled: true
  }, config, now).enabled, true);
  assert.equal(decideFeature({ key: "ambient.clock", risk: "low", defaultEnabled: true }, null).enabled, true);
  assert.equal(decideFeature({ key: "cloud.actions", risk: "high", defaultEnabled: true }, null).enabled, false);
});

test("an accepted config automatically stops influencing policy after expiry", () => {
  const config = verify();
  const afterExpiry = new Date("2026-07-19T08:00:00.000Z");
  assert.equal(decideFeature({ key: "weather.effects", risk: "low", defaultEnabled: true }, config, afterExpiry).enabled, true);
  assert.equal(decideFeature({ key: "cloud.actions", risk: "high", defaultEnabled: true }, config, afterExpiry).enabled, false);
  assert.equal(decideAsset("wallpaper.bad", config, afterExpiry).allowed, true);
  assert.equal(decideVersion("0.1.0", config, afterExpiry).reason, "active");
});

test("asset and version stops preserve the local desktop core", () => {
  const config = verify();
  assert.deepEqual(decideAsset("wallpaper.bad", config, now), {
    assetId: "wallpaper.bad", allowed: false, reason: "render crash"
  });
  const disabled = decideVersion("0.1.0", config, now);
  assert.equal(disabled.distributionAllowed, false);
  assert.equal(disabled.onlineFeaturesAllowed, false);
  assert.equal(disabled.desktopCoreAllowed, true);
});

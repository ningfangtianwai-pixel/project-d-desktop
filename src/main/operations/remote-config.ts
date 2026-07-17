import { createHash, timingSafeEqual, verify as verifySignature } from "node:crypto";
import type {
  AssetDecision,
  FeatureDecision,
  FeatureDefinition,
  RemoteConfigCursor,
  RemoteConfigEnvelope,
  RemoteConfigSource,
  RemoteOperationsPayload,
  VerifiedRemoteConfig,
  VersionDecision
} from "../../shared/operations.js";
import { PROTECTED_DESKTOP_FEATURE_KEYS } from "../../shared/operations.js";

export interface RemoteConfigVerificationOptions {
  source: RemoteConfigSource;
  publicKey?: string | Buffer;
  expectedConfigId?: string;
  now?: Date;
  maxClockSkewMs?: number;
  allowUnsignedDevelopmentFixture?: boolean;
}

export type CursorAdvanceResult =
  | { accepted: true; changed: boolean; cursor: RemoteConfigCursor }
  | { accepted: false; reason: "config-id-mismatch" | "revision-rollback" | "revision-collision" };

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical JSON does not support non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record).sort().map((key) => {
      const item = record[key];
      if (item === undefined) throw new Error(`Canonical JSON does not support undefined at ${key}`);
      return `${JSON.stringify(key)}:${canonicalJson(item)}`;
    });
    return `{${entries.join(",")}}`;
  }
  throw new Error(`Canonical JSON does not support ${typeof value}`);
}

export function sha256Hex(value: unknown): string {
  const bytes = typeof value === "string" ? value : canonicalJson(value);
  return createHash("sha256").update(bytes, "utf8").digest("hex");
}

export function remoteConfigSigningBytes(envelope: Omit<RemoteConfigEnvelope, "signatureBase64"> | RemoteConfigEnvelope): Buffer {
  const { signatureBase64: _signature, ...signed } = envelope as RemoteConfigEnvelope;
  return Buffer.from(canonicalJson(signed), "utf8");
}

export function verifyRemoteConfig(
  raw: unknown,
  options: RemoteConfigVerificationOptions
): VerifiedRemoteConfig {
  const envelope = parseRemoteConfigEnvelope(raw);
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const issuedAtMs = Date.parse(envelope.issuedAt);
  const expiresAtMs = Date.parse(envelope.expiresAt);
  const clockSkewMs = Math.max(0, options.maxClockSkewMs ?? 5 * 60_000);

  if (options.source === "remote" && !options.expectedConfigId) {
    throw new Error("An expected config ID is required for remote configuration");
  }
  if (options.expectedConfigId && envelope.configId !== options.expectedConfigId) {
    throw new Error("Remote config ID does not match the expected environment");
  }
  if (issuedAtMs > nowMs + clockSkewMs) throw new Error("Remote config was issued in the future");
  if (expiresAtMs <= nowMs) throw new Error("Remote config has expired");
  if (expiresAtMs <= issuedAtMs) throw new Error("Remote config expiry must be after issue time");

  const actualPayloadDigest = sha256Hex(envelope.payload);
  if (!timingSafeTextEqual(actualPayloadDigest, envelope.payloadSha256)) {
    throw new Error("Remote config payload checksum mismatch");
  }

  const fixtureAllowed = options.source === "local-fixture"
    && options.allowUnsignedDevelopmentFixture === true;
  if (!fixtureAllowed) {
    if (!options.publicKey) throw new Error("A public key is required for remote configuration");
    if (!envelope.signatureBase64) throw new Error("Remote config signature is missing");
    const signature = decodeBase64(envelope.signatureBase64);
    const valid = verifySignature(null, remoteConfigSigningBytes(envelope), options.publicKey, signature);
    if (!valid) throw new Error("Remote config signature is invalid");
  }

  return { envelope, source: options.source, acceptedAt: now.toISOString() };
}

export function advanceRemoteConfigCursor(
  current: RemoteConfigCursor | null,
  candidate: VerifiedRemoteConfig
): CursorAdvanceResult {
  const next = cursorFromConfig(candidate);
  if (!current) return { accepted: true, changed: true, cursor: next };
  if (current.configId !== next.configId) return { accepted: false, reason: "config-id-mismatch" };
  if (next.revision < current.revision) return { accepted: false, reason: "revision-rollback" };
  if (next.revision === current.revision && next.payloadSha256 !== current.payloadSha256) {
    return { accepted: false, reason: "revision-collision" };
  }
  if (next.revision === current.revision) return { accepted: true, changed: false, cursor: current };
  return { accepted: true, changed: true, cursor: next };
}

export function decideFeature(
  definition: FeatureDefinition,
  config: VerifiedRemoteConfig | null,
  now = new Date()
): FeatureDecision {
  if (definition.protectedDesktopCore || isProtectedDesktopFeature(definition.key)) {
    return { key: definition.key, enabled: true, reason: "protected-desktop-core" };
  }
  const activeConfig = unexpiredConfig(config, now);
  if (!activeConfig) {
    if (definition.risk === "low") {
      return { key: definition.key, enabled: definition.defaultEnabled, reason: "unavailable-low-risk-fail-open" };
    }
    return { key: definition.key, enabled: false, reason: "unavailable-risk-fail-closed" };
  }
  const override = activeConfig.envelope.payload.featureOverrides.find((item) => item.key === definition.key);
  if (override) return { key: definition.key, enabled: override.enabled, reason: "remote-override" };
  return { key: definition.key, enabled: definition.defaultEnabled, reason: "local-default" };
}

export function decideAsset(assetId: string, config: VerifiedRemoteConfig | null, now = new Date()): AssetDecision {
  const blocked = unexpiredConfig(config, now)?.envelope.payload.disabledAssets.find((item) => item.assetId === assetId);
  return { assetId, allowed: !blocked, reason: blocked?.reason ?? null };
}

export function decideVersion(version: string, config: VerifiedRemoteConfig | null, now = new Date()): VersionDecision {
  const activeConfig = unexpiredConfig(config, now);
  if (!activeConfig) return activeVersionDecision(version);
  const payload = activeConfig.envelope.payload;
  if (payload.disabledVersions.includes(version)) {
    return disabledVersionDecision(version, "version-disabled");
  }
  if (payload.updateDistribution.withdrawnVersions.includes(version)) {
    return disabledVersionDecision(version, "version-withdrawn");
  }
  if (payload.updateDistribution.paused) {
    return {
      version,
      distributionAllowed: false,
      onlineFeaturesAllowed: true,
      desktopCoreAllowed: true,
      reason: "distribution-paused"
    };
  }
  return activeVersionDecision(version);
}

function cursorFromConfig(config: VerifiedRemoteConfig): RemoteConfigCursor {
  const { configId, revision, payloadSha256, expiresAt } = config.envelope;
  return { configId, revision, payloadSha256, expiresAt };
}

function unexpiredConfig(config: VerifiedRemoteConfig | null, now: Date): VerifiedRemoteConfig | null {
  if (!config || Date.parse(config.envelope.expiresAt) <= now.getTime()) return null;
  return config;
}

function isProtectedDesktopFeature(key: string): boolean {
  return (PROTECTED_DESKTOP_FEATURE_KEYS as readonly string[]).includes(key);
}

function activeVersionDecision(version: string): VersionDecision {
  return {
    version,
    distributionAllowed: true,
    onlineFeaturesAllowed: true,
    desktopCoreAllowed: true,
    reason: "active"
  };
}

function disabledVersionDecision(
  version: string,
  reason: "version-disabled" | "version-withdrawn"
): VersionDecision {
  return {
    version,
    distributionAllowed: false,
    onlineFeaturesAllowed: false,
    desktopCoreAllowed: true,
    reason
  };
}

function parseRemoteConfigEnvelope(raw: unknown): RemoteConfigEnvelope {
  if (!isRecord(raw)) throw new Error("Remote config must be an object");
  assertOnlyKeys(raw, [
    "schemaVersion", "configId", "revision", "issuedAt", "expiresAt",
    "payloadSha256", "payload", "signatureBase64"
  ], "remote config envelope");
  if (raw.schemaVersion !== 1) throw new Error("Unsupported remote config schema version");
  requireNonEmptyString(raw.configId, "configId");
  if (!Number.isSafeInteger(raw.revision) || Number(raw.revision) < 1) {
    throw new Error("Remote config revision must be a positive integer");
  }
  requireIsoDate(raw.issuedAt, "issuedAt");
  requireIsoDate(raw.expiresAt, "expiresAt");
  if (typeof raw.payloadSha256 !== "string" || !/^[a-f0-9]{64}$/.test(raw.payloadSha256)) {
    throw new Error("Remote config payloadSha256 must be a lowercase SHA-256 digest");
  }
  const payload = parseOperationsPayload(raw.payload);
  if (raw.signatureBase64 !== null && typeof raw.signatureBase64 !== "string") {
    throw new Error("Remote config signatureBase64 must be a string or null");
  }
  return {
    schemaVersion: 1,
    configId: raw.configId,
    revision: Number(raw.revision),
    issuedAt: raw.issuedAt,
    expiresAt: raw.expiresAt,
    payloadSha256: raw.payloadSha256,
    payload,
    signatureBase64: raw.signatureBase64
  };
}

function parseOperationsPayload(raw: unknown): RemoteOperationsPayload {
  if (!isRecord(raw)) throw new Error("Remote config payload must be an object");
  assertOnlyKeys(raw, ["featureOverrides", "disabledAssets", "disabledVersions", "updateDistribution"], "payload");
  if (!Array.isArray(raw.featureOverrides) || !Array.isArray(raw.disabledAssets) || !Array.isArray(raw.disabledVersions)) {
    throw new Error("Remote config payload lists are invalid");
  }
  if (!isRecord(raw.updateDistribution)
    || typeof raw.updateDistribution.paused !== "boolean"
    || !Array.isArray(raw.updateDistribution.withdrawnVersions)) {
    throw new Error("Remote config update distribution policy is invalid");
  }
  assertOnlyKeys(raw.updateDistribution, ["paused", "withdrawnVersions"], "updateDistribution");

  const featureOverrides = raw.featureOverrides.map((item, index) => {
    if (!isRecord(item) || typeof item.enabled !== "boolean") {
      throw new Error(`Invalid feature override at index ${index}`);
    }
    assertOnlyKeys(item, ["key", "enabled"], `featureOverrides[${index}]`);
    requireNonEmptyString(item.key, `featureOverrides[${index}].key`);
    return { key: item.key, enabled: item.enabled };
  });
  const disabledAssets = raw.disabledAssets.map((item, index) => {
    if (!isRecord(item)) throw new Error(`Invalid disabled asset at index ${index}`);
    assertOnlyKeys(item, ["assetId", "reason"], `disabledAssets[${index}]`);
    requireNonEmptyString(item.assetId, `disabledAssets[${index}].assetId`);
    requireNonEmptyString(item.reason, `disabledAssets[${index}].reason`);
    return { assetId: item.assetId, reason: item.reason };
  });
  const disabledVersions = parseUniqueStrings(raw.disabledVersions, "disabledVersions");
  const withdrawnVersions = parseUniqueStrings(raw.updateDistribution.withdrawnVersions, "withdrawnVersions");
  assertUnique(featureOverrides.map((item) => item.key), "feature override key");
  assertUnique(disabledAssets.map((item) => item.assetId), "disabled asset ID");
  return {
    featureOverrides,
    disabledAssets,
    disabledVersions,
    updateDistribution: { paused: raw.updateDistribution.paused, withdrawnVersions }
  };
}

function parseUniqueStrings(raw: unknown[], field: string): string[] {
  const values = raw.map((value, index) => {
    requireNonEmptyString(value, `${field}[${index}]`);
    return value;
  });
  assertUnique(values, field);
  return values;
}

function assertUnique(values: readonly string[], field: string): void {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${field}`);
}

function assertOnlyKeys(record: Record<string, unknown>, allowed: readonly string[], field: string): void {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(record).find((key) => !allowedKeys.has(key));
  if (unknown) throw new Error(`Unknown ${field} field: ${unknown}`);
}

function requireNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string`);
}

function requireIsoDate(value: unknown, field: string): asserts value is string {
  requireNonEmptyString(value, field);
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${field} must be an ISO date`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function decodeBase64(value: string): Buffer {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error("Remote config signature is not valid base64");
  }
  return Buffer.from(value, "base64");
}

function timingSafeTextEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

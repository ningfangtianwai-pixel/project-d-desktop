export type RemoteConfigSource = "remote" | "local-fixture";
export type FeatureRisk = "low" | "medium" | "high";

export const PROTECTED_DESKTOP_FEATURE_KEYS = [
  "desktop.wallpaper.static",
  "desktop.wallpaper.restore",
  "desktop.icons.restore",
  "desktop.clean-mode.escape",
  "desktop.settings",
  "desktop.recovery",
  "desktop.shutdown"
] as const;

export interface FeatureDefinition {
  key: string;
  risk: FeatureRisk;
  defaultEnabled: boolean;
  protectedDesktopCore?: boolean;
}

export interface RemoteFeatureOverride {
  key: string;
  enabled: boolean;
}

export interface DisabledAsset {
  assetId: string;
  reason: string;
}

export interface RemoteOperationsPayload {
  featureOverrides: RemoteFeatureOverride[];
  disabledAssets: DisabledAsset[];
  disabledVersions: string[];
  updateDistribution: {
    paused: boolean;
    withdrawnVersions: string[];
  };
}

export interface RemoteConfigEnvelope {
  schemaVersion: 1;
  configId: string;
  revision: number;
  issuedAt: string;
  expiresAt: string;
  payloadSha256: string;
  payload: RemoteOperationsPayload;
  signatureBase64: string | null;
}

export interface RemoteConfigCursor {
  configId: string;
  revision: number;
  payloadSha256: string;
  expiresAt: string;
}

export interface VerifiedRemoteConfig {
  envelope: RemoteConfigEnvelope;
  source: RemoteConfigSource;
  acceptedAt: string;
}

export interface FeatureDecision {
  key: string;
  enabled: boolean;
  reason:
    | "protected-desktop-core"
    | "remote-override"
    | "local-default"
    | "unavailable-low-risk-fail-open"
    | "unavailable-risk-fail-closed";
}

export interface AssetDecision {
  assetId: string;
  allowed: boolean;
  reason: string | null;
}

export interface VersionDecision {
  version: string;
  distributionAllowed: boolean;
  onlineFeaturesAllowed: boolean;
  desktopCoreAllowed: true;
  reason: "active" | "distribution-paused" | "version-disabled" | "version-withdrawn";
}

export type CrashProcess = "main" | "renderer" | "gpu" | "utility" | "unknown";

export interface OperationsSession {
  sessionId: string;
  appVersion: string;
  startedAt: string;
  endedAt?: string | null;
}

export interface CrashEvent {
  eventId: string;
  sessionId: string;
  appVersion: string;
  occurredAt: string;
  process: CrashProcess;
  fingerprint: string;
  startup: boolean;
}

export interface CrashFingerprintMetric {
  fingerprint: string;
  count: number;
  affectedSessions: number;
}

export interface VersionCrashMetric {
  appVersion: string;
  generatedAt: string;
  windowStartedAt: string;
  totalSessions: number;
  crashedSessions: number;
  crashFreeSessions: number;
  crashFreeRate: number | null;
  crashEventCount: number;
  startupCrashCount: number;
  topFingerprints: CrashFingerprintMetric[];
}

export type AlertSeverity = "P0" | "P1";
export type CrashAlertKind = "crash-free-rate" | "fingerprint-spike";

export interface CrashAlertRule {
  id: string;
  kind: CrashAlertKind;
  severity: AlertSeverity;
  cooldownMs: number;
  minimumSessions?: number;
  crashFreeRateBelow?: number;
  eventCountAtLeast?: number;
  windowMs?: number;
}

export interface OperationsAlert {
  alertId: string;
  dedupeKey: string;
  ruleId: string;
  severity: AlertSeverity;
  kind: CrashAlertKind;
  appVersion: string;
  fingerprint: string | null;
  observedValue: number;
  threshold: number;
  occurredAt: string;
  message: string;
}

export interface OperationsAlertState {
  dedupeKey: string;
  severity: AlertSeverity;
  lastEmittedAt: string;
  lastObservedAt: string;
}

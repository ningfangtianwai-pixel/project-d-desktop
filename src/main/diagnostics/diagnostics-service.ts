export type DiagnosticHealth = "healthy" | "degraded" | "unhealthy";

export type ControlledStatusCode = "ok" | "degraded" | "unavailable" | "not-configured";

export const DIAGNOSTICS_EXPORT_SCHEMA = "projectd.diagnostics.export";
export const DIAGNOSTICS_EXPORT_SCHEMA_VERSION = 1;
export const MAX_DIAGNOSTICS_EXPORT_BYTES = 8 * 1024;

export interface AppDiagnosticInfo {
  version: string;
  platform: string;
  architecture?: string;
}

export interface DatabaseDiagnosticStatus {
  healthy: boolean;
  schemaVersion?: number | null;
  migrationCount?: number | null;
  statusCode?: string | null;
}

export interface DesktopDiagnosticStatus {
  healthy: boolean;
  desktopFileCount?: number | null;
  portalCount?: number | null;
  statusCode?: string | null;
}

export interface WallpaperHostDiagnosticStatus {
  healthy: boolean;
  attached?: boolean | null;
  statusCode?: string | null;
}

/**
 * This intentionally accepts only caller-selected metadata. It never opens a
 * log file, database, portal, or filesystem path on its own.
 */
export interface RecentLogMetadata {
  level: "error" | "warn" | "info";
  code?: string | null;
  summary?: string | null;
  occurredAt?: string | null;
}

export interface DiagnosticsInput {
  app: AppDiagnosticInfo;
  database: DatabaseDiagnosticStatus;
  desktop: DesktopDiagnosticStatus;
  wallpaperHost: WallpaperHostDiagnosticStatus;
  recentLogs: readonly RecentLogMetadata[];
  providerConfigured: boolean;
}

export interface DiagnosticsClock {
  now(): Date;
}

export interface LocalDiagnosticsReport {
  generatedAt: string;
  app: {
    version: string;
    platform: string;
    architecture: string | null;
  };
  health: DiagnosticHealth;
  counts: {
    desktopFiles: number;
    portals: number;
    recentErrors: number;
    configuredProviders: number;
    schemaVersion: number | null;
    migrationCount: number | null;
  };
  statusCodes: {
    database: ControlledStatusCode;
    desktop: ControlledStatusCode;
    wallpaperHost: ControlledStatusCode;
    aiProvider: ControlledStatusCode;
  };
  recentErrors: Array<{
    code: string;
    summary: string;
    occurredAt: string | null;
  }>;
}

export interface DiagnosticsExportOptions {
  consent: boolean;
}

export interface DiagnosticsExportEnvelope {
  schema: typeof DIAGNOSTICS_EXPORT_SCHEMA;
  schemaVersion: typeof DIAGNOSTICS_EXPORT_SCHEMA_VERSION;
  generatedAt: string;
  report: LocalDiagnosticsReport;
}

const MAX_RECENT_ERRORS = 5;
const MAX_ERROR_SUMMARY_LENGTH = 240;

/**
 * Produces a support-safe, JSON-serializable health summary from metadata
 * supplied by the caller. No secret, chat content, or full path is retained.
 */
export class DiagnosticsService {
  constructor(private readonly clock: DiagnosticsClock = { now: () => new Date() }) {}

  createReport(input: DiagnosticsInput): LocalDiagnosticsReport {
    const recentErrors = input.recentLogs
      .filter((entry) => entry.level === "error")
      .slice(-MAX_RECENT_ERRORS)
      .map((entry) => ({
        code: controlledErrorCode(entry.code),
        summary: redactDiagnosticText(entry.summary ?? "Unknown diagnostic error"),
        occurredAt: safeTimestamp(entry.occurredAt)
      }));

    const statusCodes = {
      database: statusFromHealth(input.database.healthy),
      desktop: statusFromHealth(input.desktop.healthy),
      wallpaperHost: wallpaperStatus(input.wallpaperHost),
      aiProvider: input.providerConfigured ? "ok" : "not-configured"
    } satisfies LocalDiagnosticsReport["statusCodes"];

    return {
      generatedAt: this.clock.now().toISOString(),
      app: {
        version: redactVersion(input.app.version),
        platform: redactPlatform(input.app.platform),
        architecture: input.app.architecture ? redactPlatform(input.app.architecture) : null
      },
      health: calculateHealth(statusCodes, recentErrors.length),
      counts: {
        desktopFiles: nonNegativeInteger(input.desktop.desktopFileCount),
        portals: nonNegativeInteger(input.desktop.portalCount),
        recentErrors: recentErrors.length,
        configuredProviders: input.providerConfigured ? 1 : 0,
        schemaVersion: nullableNonNegativeInteger(input.database.schemaVersion),
        migrationCount: nullableNonNegativeInteger(input.database.migrationCount)
      },
      statusCodes,
      recentErrors
    };
  }

  /**
   * Serializes a support-safe report only after the caller records explicit
   * user consent. The report is projected onto an allowlist again so runtime
   * callers cannot append chat, file-list, raw-log, or path-bearing fields.
   */
  serializeForExport(
    report: LocalDiagnosticsReport,
    options?: DiagnosticsExportOptions
  ): string {
    if (options?.consent !== true) {
      throw new Error("Explicit consent is required before diagnostics can be serialized");
    }

    const safeReport = allowlistedReport(report, this.clock);
    const envelope: DiagnosticsExportEnvelope = {
      schema: DIAGNOSTICS_EXPORT_SCHEMA,
      schemaVersion: DIAGNOSTICS_EXPORT_SCHEMA_VERSION,
      generatedAt: safeReport.generatedAt,
      report: safeReport
    };
    const serialized = deterministicJson(envelope);

    if (Buffer.byteLength(serialized, "utf8") > MAX_DIAGNOSTICS_EXPORT_BYTES) {
      throw new Error(`Diagnostics export exceeds ${MAX_DIAGNOSTICS_EXPORT_BYTES} bytes`);
    }

    return serialized;
  }
}

export function redactDiagnosticText(value: string, maxLength = MAX_ERROR_SUMMARY_LENGTH): string {
  const limit = Math.max(1, Math.floor(maxLength));
  const sanitized = value
    .replace(/\bBearer\s+(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "Bearer [REDACTED]")
    .replace(
      /\b([A-Za-z0-9_-]*(?:api[_-]?key|key|access[_-]?token|refresh[_-]?token|token|secret|password|authorization))\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1=[REDACTED]"
    )
    .replace(/\b(sk-[A-Za-z0-9_-]{8,}|[A-Za-z0-9_-]{24,})\b/g, "[REDACTED]")
    .replace(/(["'])(?:[A-Za-z]:[\\/]|\\\\|\/\/)[^"'\r\n]*\1/g, "[PATH]")
    .replace(/(["'])\/[^"'\r\n]*\1/g, "[PATH]")
    .replace(/(?:[A-Za-z]:[\\/]|\\\\|\/\/)[^\r\n,;]*/g, "[PATH]")
    .replace(/(?<![:\w])\/[^\r\n,;]*/g, "[PATH]")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized.length <= limit ? sanitized : `${sanitized.slice(0, Math.max(0, limit - 3))}...`;
}

function statusFromHealth(healthy: boolean): ControlledStatusCode {
  return healthy ? "ok" : "unavailable";
}

function wallpaperStatus(status: WallpaperHostDiagnosticStatus): ControlledStatusCode {
  if (!status.healthy) {
    return "unavailable";
  }
  return status.attached === false ? "degraded" : "ok";
}

function calculateHealth(
  statusCodes: LocalDiagnosticsReport["statusCodes"],
  recentErrorCount: number
): DiagnosticHealth {
  if (statusCodes.database === "unavailable" || statusCodes.desktop === "unavailable") {
    return "unhealthy";
  }
  if (statusCodes.wallpaperHost !== "ok" || recentErrorCount > 0) {
    return "degraded";
  }
  return "healthy";
}

function controlledErrorCode(value: string | null | undefined): string {
  const normalized = (value ?? "unknown-error").replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  return normalized.slice(0, 48) || "unknown-error";
}

function safeTimestamp(value: string | null | undefined): string | null {
  if (!value || Number.isNaN(Date.parse(value))) {
    return null;
  }
  return new Date(value).toISOString();
}

function nonNegativeInteger(value: number | null | undefined): number {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value ?? 0 : 0));
}

function nullableNonNegativeInteger(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : nonNegativeInteger(value);
}

function redactVersion(value: string): string {
  return value.replace(/[^0-9A-Za-z._-]/g, "").slice(0, 64) || "unknown";
}

function redactPlatform(value: string): string {
  return value.replace(/[^0-9A-Za-z._-]/g, "").slice(0, 32) || "unknown";
}

function allowlistedReport(report: LocalDiagnosticsReport, clock: DiagnosticsClock): LocalDiagnosticsReport {
  const generatedAt = safeTimestamp(report.generatedAt) ?? clock.now().toISOString();
  const recentErrors = Array.isArray(report.recentErrors)
    ? report.recentErrors.slice(-MAX_RECENT_ERRORS).map((entry) => ({
        code: controlledErrorCode(entry?.code),
        summary: redactDiagnosticText(entry?.summary ?? "Unknown diagnostic error"),
        occurredAt: safeTimestamp(entry?.occurredAt)
      }))
    : [];

  return {
    generatedAt,
    app: {
      version: redactVersion(report.app?.version ?? "unknown"),
      platform: redactPlatform(report.app?.platform ?? "unknown"),
      architecture: report.app?.architecture
        ? redactPlatform(report.app.architecture)
        : null
    },
    health: controlledHealth(report.health),
    counts: {
      desktopFiles: nonNegativeInteger(report.counts?.desktopFiles),
      portals: nonNegativeInteger(report.counts?.portals),
      recentErrors: recentErrors.length,
      configuredProviders: nonNegativeInteger(report.counts?.configuredProviders),
      schemaVersion: nullableNonNegativeInteger(report.counts?.schemaVersion),
      migrationCount: nullableNonNegativeInteger(report.counts?.migrationCount)
    },
    statusCodes: {
      database: controlledStatusCode(report.statusCodes?.database),
      desktop: controlledStatusCode(report.statusCodes?.desktop),
      wallpaperHost: controlledStatusCode(report.statusCodes?.wallpaperHost),
      aiProvider: controlledStatusCode(report.statusCodes?.aiProvider)
    },
    recentErrors
  };
}

function controlledHealth(value: DiagnosticHealth): DiagnosticHealth {
  return value === "healthy" || value === "degraded" || value === "unhealthy"
    ? value
    : "unhealthy";
}

function controlledStatusCode(value: ControlledStatusCode): ControlledStatusCode {
  return value === "ok" || value === "degraded" || value === "unavailable" || value === "not-configured"
    ? value
    : "unavailable";
}

function deterministicJson(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)])
    );
  }
  return value;
}

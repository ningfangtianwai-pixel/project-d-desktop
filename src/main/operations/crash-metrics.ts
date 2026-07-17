import type {
  CrashEvent,
  CrashFingerprintMetric,
  OperationsSession,
  VersionCrashMetric
} from "../../shared/operations.js";

export interface CrashAggregationOptions {
  now?: Date;
  windowMs?: number;
  fingerprintLimit?: number;
}

export function aggregateCrashMetrics(
  sessions: readonly OperationsSession[],
  events: readonly CrashEvent[],
  options: CrashAggregationOptions = {}
): VersionCrashMetric[] {
  const now = options.now ?? new Date();
  const windowMs = Math.max(60_000, options.windowMs ?? 24 * 60 * 60_000);
  const windowStartedAt = new Date(now.getTime() - windowMs);
  const fingerprintLimit = Math.max(1, Math.round(options.fingerprintLimit ?? 10));
  const validSessions = dedupeSessions(sessions).filter((session) => inWindow(session.startedAt, windowStartedAt, now));
  const validEvents = dedupeEvents(events).filter((event) => inWindow(event.occurredAt, windowStartedAt, now));
  const versions = new Set([
    ...validSessions.map((session) => session.appVersion),
    ...validEvents.map((event) => event.appVersion)
  ]);

  return [...versions].sort(compareVersions).map((appVersion) => {
    const versionSessions = validSessions.filter((session) => session.appVersion === appVersion);
    const knownSessionIds = new Set(versionSessions.map((session) => session.sessionId));
    const versionEvents = validEvents.filter((event) => event.appVersion === appVersion);
    const crashedSessionIds = new Set(
      versionEvents.filter((event) => knownSessionIds.has(event.sessionId)).map((event) => event.sessionId)
    );
    const totalSessions = knownSessionIds.size;
    const crashedSessions = crashedSessionIds.size;
    return {
      appVersion,
      generatedAt: now.toISOString(),
      windowStartedAt: windowStartedAt.toISOString(),
      totalSessions,
      crashedSessions,
      crashFreeSessions: Math.max(0, totalSessions - crashedSessions),
      crashFreeRate: totalSessions > 0 ? (totalSessions - crashedSessions) / totalSessions : null,
      crashEventCount: versionEvents.length,
      startupCrashCount: versionEvents.filter((event) => event.startup).length,
      topFingerprints: aggregateFingerprints(versionEvents).slice(0, fingerprintLimit)
    };
  });
}

export function dedupeCrashEvents(events: readonly CrashEvent[]): CrashEvent[] {
  return dedupeEvents(events);
}

function aggregateFingerprints(events: readonly CrashEvent[]): CrashFingerprintMetric[] {
  const grouped = new Map<string, { count: number; sessions: Set<string> }>();
  for (const event of events) {
    const current = grouped.get(event.fingerprint) ?? { count: 0, sessions: new Set<string>() };
    current.count += 1;
    current.sessions.add(event.sessionId);
    grouped.set(event.fingerprint, current);
  }
  return [...grouped.entries()].map(([fingerprint, value]) => ({
    fingerprint,
    count: value.count,
    affectedSessions: value.sessions.size
  })).sort((left, right) => right.count - left.count || left.fingerprint.localeCompare(right.fingerprint));
}

function dedupeSessions(sessions: readonly OperationsSession[]): OperationsSession[] {
  const seen = new Set<string>();
  const result: OperationsSession[] = [];
  for (const session of sessions) {
    const key = `${session.appVersion}:${session.sessionId}`;
    if (seen.has(key) || !validDate(session.startedAt)) continue;
    seen.add(key);
    result.push({ ...session });
  }
  return result;
}

function dedupeEvents(events: readonly CrashEvent[]): CrashEvent[] {
  const seen = new Set<string>();
  const result: CrashEvent[] = [];
  for (const event of events) {
    if (seen.has(event.eventId) || !validDate(event.occurredAt) || !event.appVersion || !event.fingerprint) continue;
    seen.add(event.eventId);
    result.push({ ...event });
  }
  return result;
}

function inWindow(value: string, start: Date, end: Date): boolean {
  const timestamp = Date.parse(value);
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

function validDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function compareVersions(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true });
}

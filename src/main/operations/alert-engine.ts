import type {
  CrashAlertRule,
  CrashEvent,
  OperationsAlert,
  OperationsAlertState,
  VersionCrashMetric
} from "../../shared/operations.js";

export const DEFAULT_CRASH_ALERT_RULES: readonly CrashAlertRule[] = [
  {
    id: "crash-free-p0",
    kind: "crash-free-rate",
    severity: "P0",
    minimumSessions: 20,
    crashFreeRateBelow: 0.95,
    cooldownMs: 15 * 60_000
  },
  {
    id: "crash-free-p1",
    kind: "crash-free-rate",
    severity: "P1",
    minimumSessions: 20,
    crashFreeRateBelow: 0.99,
    cooldownMs: 60 * 60_000
  },
  {
    id: "fingerprint-spike-p0",
    kind: "fingerprint-spike",
    severity: "P0",
    eventCountAtLeast: 10,
    windowMs: 10 * 60_000,
    cooldownMs: 15 * 60_000
  },
  {
    id: "fingerprint-spike-p1",
    kind: "fingerprint-spike",
    severity: "P1",
    eventCountAtLeast: 5,
    windowMs: 15 * 60_000,
    cooldownMs: 60 * 60_000
  }
];

export interface AlertEvaluationInput {
  metrics: readonly VersionCrashMetric[];
  crashEvents: readonly CrashEvent[];
  previousState?: readonly OperationsAlertState[];
  rules?: readonly CrashAlertRule[];
  now?: Date;
}

export interface AlertEvaluationResult {
  emitted: OperationsAlert[];
  suppressed: OperationsAlert[];
  state: OperationsAlertState[];
}

export function evaluateCrashAlerts(input: AlertEvaluationInput): AlertEvaluationResult {
  const now = input.now ?? new Date();
  const rules = input.rules ?? DEFAULT_CRASH_ALERT_RULES;
  const candidates = [
    ...crashFreeCandidates(input.metrics, rules, now),
    ...fingerprintCandidates(input.crashEvents, rules, now)
  ];
  const strongest = strongestCandidatePerCondition(candidates);
  const previous = new Map((input.previousState ?? []).map((state) => [state.dedupeKey, state]));
  const emitted: OperationsAlert[] = [];
  const suppressed: OperationsAlert[] = [];
  const state: OperationsAlertState[] = [];

  for (const candidate of strongest) {
    const old = previous.get(candidate.dedupeKey);
    const rule = rules.find((item) => item.id === candidate.ruleId);
    if (!rule) continue;
    const withinCooldown = old
      ? now.getTime() - Date.parse(old.lastEmittedAt) < rule.cooldownMs
      : false;
    const escalated = old ? severityRank(candidate.severity) > severityRank(old.severity) : false;
    if (!withinCooldown || escalated) emitted.push(candidate);
    else suppressed.push(candidate);
    state.push({
      dedupeKey: candidate.dedupeKey,
      severity: candidate.severity,
      lastEmittedAt: emitted.includes(candidate) ? now.toISOString() : old?.lastEmittedAt ?? now.toISOString(),
      lastObservedAt: now.toISOString()
    });
  }
  return { emitted, suppressed, state };
}

function crashFreeCandidates(
  metrics: readonly VersionCrashMetric[],
  rules: readonly CrashAlertRule[],
  now: Date
): OperationsAlert[] {
  const candidates: OperationsAlert[] = [];
  for (const metric of metrics) {
    if (metric.crashFreeRate === null) continue;
    for (const rule of rules.filter((item) => item.kind === "crash-free-rate")) {
      const minimumSessions = rule.minimumSessions ?? Number.POSITIVE_INFINITY;
      const threshold = rule.crashFreeRateBelow ?? 0;
      if (metric.totalSessions < minimumSessions || metric.crashFreeRate >= threshold) continue;
      const dedupeKey = `crash-free-rate:${metric.appVersion}`;
      candidates.push({
        alertId: `${dedupeKey}:${rule.severity}:${now.toISOString()}`,
        dedupeKey,
        ruleId: rule.id,
        severity: rule.severity,
        kind: rule.kind,
        appVersion: metric.appVersion,
        fingerprint: null,
        observedValue: metric.crashFreeRate,
        threshold,
        occurredAt: now.toISOString(),
        message: `${metric.appVersion} crash-free rate is ${(metric.crashFreeRate * 100).toFixed(2)}%`
      });
    }
  }
  return candidates;
}

function fingerprintCandidates(
  events: readonly CrashEvent[],
  rules: readonly CrashAlertRule[],
  now: Date
): OperationsAlert[] {
  const candidates: OperationsAlert[] = [];
  for (const rule of rules.filter((item) => item.kind === "fingerprint-spike")) {
    const windowMs = rule.windowMs ?? 0;
    const threshold = rule.eventCountAtLeast ?? Number.POSITIVE_INFINITY;
    const startMs = now.getTime() - windowMs;
    const grouped = new Map<string, { version: string; fingerprint: string; eventIds: Set<string> }>();
    for (const event of events) {
      const occurredAt = Date.parse(event.occurredAt);
      if (!Number.isFinite(occurredAt) || occurredAt < startMs || occurredAt > now.getTime()) continue;
      const key = `${event.appVersion}\u0000${event.fingerprint}`;
      const current = grouped.get(key) ?? {
        version: event.appVersion,
        fingerprint: event.fingerprint,
        eventIds: new Set<string>()
      };
      current.eventIds.add(event.eventId);
      grouped.set(key, current);
    }
    for (const value of grouped.values()) {
      if (value.eventIds.size < threshold) continue;
      const dedupeKey = `fingerprint-spike:${value.version}:${value.fingerprint}`;
      candidates.push({
        alertId: `${dedupeKey}:${rule.severity}:${now.toISOString()}`,
        dedupeKey,
        ruleId: rule.id,
        severity: rule.severity,
        kind: rule.kind,
        appVersion: value.version,
        fingerprint: value.fingerprint,
        observedValue: value.eventIds.size,
        threshold,
        occurredAt: now.toISOString(),
        message: `${value.version} fingerprint ${value.fingerprint} produced ${value.eventIds.size} crashes`
      });
    }
  }
  return candidates;
}

function strongestCandidatePerCondition(candidates: readonly OperationsAlert[]): OperationsAlert[] {
  const strongest = new Map<string, OperationsAlert>();
  for (const candidate of candidates) {
    const current = strongest.get(candidate.dedupeKey);
    if (!current || severityRank(candidate.severity) > severityRank(current.severity)) {
      strongest.set(candidate.dedupeKey, candidate);
    }
  }
  return [...strongest.values()].sort((left, right) => {
    const severity = severityRank(right.severity) - severityRank(left.severity);
    return severity || left.dedupeKey.localeCompare(right.dedupeKey);
  });
}

function severityRank(severity: OperationsAlert["severity"]): number {
  return severity === "P0" ? 2 : 1;
}

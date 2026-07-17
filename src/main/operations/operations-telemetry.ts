import { createHash, randomUUID } from "node:crypto";
import type { CrashEvent, CrashProcess, OperationsAlert, OperationsAlertState, OperationsSession, VersionCrashMetric } from "../../shared/operations.js";
import { evaluateCrashAlerts } from "./alert-engine.js";
import { aggregateCrashMetrics } from "./crash-metrics.js";

interface StateStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export interface OperationsDashboard {
  generatedAt: string;
  currentVersion: string;
  metrics: VersionCrashMetric | null;
  activeAlerts: OperationsAlert[];
}

const SESSIONS_KEY = "operations:sessions";
const EVENTS_KEY = "operations:crash-events";
const ALERT_STATE_KEY = "operations:alert-state";
const DASHBOARD_KEY = "operations:dashboard";

export class OperationsTelemetryService {
  private readonly sessionId = randomUUID();
  private sessions: OperationsSession[];
  private events: CrashEvent[];
  private alertState: OperationsAlertState[];

  constructor(
    private readonly appVersion: string,
    private readonly state: StateStore,
    private readonly now: () => Date = () => new Date()
  ) {
    this.sessions = readArray<OperationsSession>(state.get(SESSIONS_KEY));
    this.events = readArray<CrashEvent>(state.get(EVENTS_KEY));
    this.alertState = readArray<OperationsAlertState>(state.get(ALERT_STATE_KEY));
  }

  start(): OperationsDashboard {
    this.sessions.push({ sessionId: this.sessionId, appVersion: this.appVersion, startedAt: this.now().toISOString(), endedAt: null });
    return this.persist();
  }

  recordCrash(process: CrashProcess, fingerprintInput: string, startup = false): OperationsDashboard {
    const occurredAt = this.now().toISOString();
    this.events.push({
      eventId: randomUUID(),
      sessionId: this.sessionId,
      appVersion: this.appVersion,
      occurredAt,
      process,
      fingerprint: createHash("sha256").update(fingerprintInput.slice(0, 500), "utf8").digest("hex").slice(0, 24),
      startup
    });
    return this.persist();
  }

  finish(): OperationsDashboard {
    const current = this.sessions.find((session) => session.sessionId === this.sessionId);
    if (current) current.endedAt = this.now().toISOString();
    return this.persist();
  }

  dashboard(): OperationsDashboard {
    return this.buildDashboard();
  }

  private persist(): OperationsDashboard {
    this.sessions = this.sessions.slice(-500);
    this.events = this.events.slice(-2_000);
    const metrics = aggregateCrashMetrics(this.sessions, this.events, { now: this.now() });
    const alerts = evaluateCrashAlerts({ metrics, crashEvents: this.events, previousState: this.alertState, now: this.now() });
    this.alertState = alerts.state.slice(-200);
    const dashboard = this.buildDashboard(metrics, alerts.emitted);
    this.state.set(SESSIONS_KEY, JSON.stringify(this.sessions));
    this.state.set(EVENTS_KEY, JSON.stringify(this.events));
    this.state.set(ALERT_STATE_KEY, JSON.stringify(this.alertState));
    this.state.set(DASHBOARD_KEY, JSON.stringify(dashboard));
    return dashboard;
  }

  private buildDashboard(metrics = aggregateCrashMetrics(this.sessions, this.events, { now: this.now() }), activeAlerts: OperationsAlert[] = []): OperationsDashboard {
    return {
      generatedAt: this.now().toISOString(),
      currentVersion: this.appVersion,
      metrics: metrics.find((metric) => metric.appVersion === this.appVersion) ?? null,
      activeAlerts
    };
  }
}

function readArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

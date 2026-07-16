import type { SuggestionRecord } from "../../shared/types";

export interface DesktopSuggestionCandidate {
  id: string | number;
  filename: string;
  fullPath: string;
  category?: string | null;
  isDirectory?: boolean;
  isMissing?: boolean;
  isRegularFile?: boolean;
  isShortcut?: boolean;
}

export interface SuggestionRuntimeState {
  quietHours?: boolean;
  fullscreen?: boolean;
  batteryLevel?: number | null;
  batterySaver?: boolean;
  isBatteryLow?: boolean;
}

export interface SuggestionClock {
  now(): Date;
}

export interface SuggestionStore {
  getByFingerprint(fingerprint: string): Promise<SuggestionRecord | null> | SuggestionRecord | null;
  getLatestCreatedAt(): Promise<string | null> | string | null;
  getCreatedSince?(
    since: string
  ): Promise<readonly SuggestionDeliveryHistoryEntry[]> | readonly SuggestionDeliveryHistoryEntry[];
  getLatestCreatedAtForKind?(kind: string): Promise<string | null> | string | null;
  save(record: SuggestionRecord, fingerprint: string): Promise<void> | void;
  getDeliveryControls?(): Promise<SuggestionDeliveryControls | null> | SuggestionDeliveryControls | null;
  saveDeliveryControls?(controls: SuggestionDeliveryControls): Promise<void> | void;
}

/**
 * User-owned delivery controls. These values belong in the main-process store,
 * not in an individual suggestion record, so a snooze suppresses new batches.
 */
export interface SuggestionDeliveryControls {
  snoozedUntil?: string | null;
  mutedUntil?: string | null;
  disabled?: boolean;
  policy?: SuggestionPolicy | null;
}

export interface DesktopSuggestionEvaluation {
  candidates: readonly DesktopSuggestionCandidate[];
  runtime: SuggestionRuntimeState;
}

export interface SuggestionEngineOptions {
  cooldownMs?: number;
  minimumCandidateCount?: number;
  policy?: SuggestionPolicy;
}

export interface SuggestionQuietHoursSchedule {
  enabled?: boolean;
  start: string;
  end: string;
}

export interface SuggestionPolicy {
  timeZoneOffsetMinutes?: number;
  quietHours?: SuggestionQuietHoursSchedule | null;
  dailyBudget?: number | null;
  perKind?: Readonly<Record<string, SuggestionKindPolicy | undefined>> | null;
}

export interface SuggestionKindPolicy {
  cooldownMs?: number | null;
  dailyBudget?: number | null;
}

export interface SuggestionDeliveryHistoryEntry {
  kind: string;
  createdAt: string;
}

export type SuggestionDecisionReason =
  | "delivered"
  | "runtime-quiet-hours"
  | "runtime-fullscreen"
  | "runtime-battery-saver"
  | "runtime-low-battery"
  | "delivery-disabled"
  | "delivery-snoozed"
  | "delivery-muted"
  | "scheduled-quiet-hours"
  | "insufficient-candidates"
  | "duplicate-fingerprint"
  | "global-cooldown"
  | "kind-cooldown"
  | "daily-budget-exhausted"
  | "kind-daily-budget-exhausted"
  | "policy-history-unavailable";

export interface SuggestionDecision {
  status: "delivered" | "suppressed";
  reason: SuggestionDecisionReason;
  explanation: string;
  kind: "desktop-inbox";
  suggestion: SuggestionRecord | null;
}

const DEFAULT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const DEFAULT_MINIMUM_CANDIDATE_COUNT = 3;
const LOW_BATTERY_PERCENT = 20;

/**
 * Produces non-invasive desktop-inbox suggestions. The caller decides when to
 * evaluate it; this module neither watches the desktop nor invokes actions.
 */
export class SuggestionEngine {
  private readonly cooldownMs: number;
  private readonly minimumCandidateCount: number;
  private readonly policy: SuggestionPolicy;

  constructor(
    private readonly store: SuggestionStore,
    private readonly clock: SuggestionClock = { now: () => new Date() },
    options: SuggestionEngineOptions = {}
  ) {
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.minimumCandidateCount = options.minimumCandidateCount ?? DEFAULT_MINIMUM_CANDIDATE_COUNT;
    this.policy = options.policy ?? {};
  }

  async evaluate(input: DesktopSuggestionEvaluation): Promise<SuggestionRecord | null> {
    return (await this.evaluateWithDecision(input)).suggestion;
  }

  async evaluateWithDecision(input: DesktopSuggestionEvaluation): Promise<SuggestionDecision> {
    const runtimePause = runtimePauseDecision(input.runtime);
    if (runtimePause) {
      return suppressed(runtimePause.reason, runtimePause.explanation);
    }

    const now = this.clock.now();
    const controls = await this.store.getDeliveryControls?.() ?? null;
    const deliveryPause = deliveryPauseDecision(controls, now.getTime());
    if (deliveryPause) {
      return suppressed(deliveryPause.reason, deliveryPause.explanation);
    }

    const policy = mergePolicy(this.policy, controls?.policy);
    if (isScheduledQuietHour(now, policy)) {
      return suppressed("scheduled-quiet-hours", "当前处于用户配置的免打扰时段。");
    }

    const candidates = eligibleCandidates(input.candidates);
    if (candidates.length < this.minimumCandidateCount) {
      return suppressed(
        "insufficient-candidates",
        `仅检测到 ${candidates.length} 个可整理文件，未达到 ${this.minimumCandidateCount} 个的触发门槛。`
      );
    }

    const fingerprint = createFingerprint(candidates);
    const existing = await this.store.getByFingerprint(fingerprint);
    if (existing) {
      return suppressed("duplicate-fingerprint", "相同文件批次已经生成过建议。");
    }

    const kind = "desktop-inbox";
    const kindPolicy = policy.perKind?.[kind];
    const dailyBudget = normalizeBudget(policy.dailyBudget);
    const kindDailyBudget = normalizeBudget(kindPolicy?.dailyBudget);
    if (dailyBudget !== null || kindDailyBudget !== null) {
      if (!this.store.getCreatedSince) {
        return suppressed("policy-history-unavailable", "每日投递预算已启用，但历史记录适配器不可用。");
      }

      const dayStartedAt = startOfPolicyDay(now, policy.timeZoneOffsetMinutes);
      const history = await this.store.getCreatedSince(dayStartedAt.toISOString());
      const deliveredToday = countHistoryWithin(history, dayStartedAt, now);
      if (dailyBudget !== null && deliveredToday >= dailyBudget) {
        return suppressed(
          "daily-budget-exhausted",
          `今日已投递 ${deliveredToday} 条建议，达到每日 ${dailyBudget} 条的预算。`
        );
      }

      const kindDeliveredToday = countHistoryWithin(history, dayStartedAt, now, kind);
      if (kindDailyBudget !== null && kindDeliveredToday >= kindDailyBudget) {
        return suppressed(
          "kind-daily-budget-exhausted",
          `${kind} 今日已投递 ${kindDeliveredToday} 条，达到该类型每日 ${kindDailyBudget} 条的预算。`
        );
      }
    }

    const kindCooldownMs = normalizeDuration(kindPolicy?.cooldownMs);
    if (kindCooldownMs !== null && kindCooldownMs > 0) {
      if (!this.store.getLatestCreatedAtForKind) {
        return suppressed("policy-history-unavailable", "按类型冷却策略已启用，但类型历史适配器不可用。");
      }

      const latestKindCreatedAt = await this.store.getLatestCreatedAtForKind(kind);
      if (isWithinCooldown(latestKindCreatedAt, now, kindCooldownMs)) {
        return suppressed("kind-cooldown", `${kind} 仍处于独立冷却周期。`);
      }
    }

    const latestCreatedAt = await this.store.getLatestCreatedAt();
    if (isWithinCooldown(latestCreatedAt, now, this.cooldownMs)) {
      return suppressed("global-cooldown", "距离上一条建议的时间不足全局冷却周期。");
    }

    const record: SuggestionRecord = {
      id: `desktop-inbox-${fingerprint}`,
      kind: "desktop-inbox",
      title: "桌面可以整理一下",
      detail: `检测到 ${candidates.length} 个可收纳的普通文件，确认后再执行整理。`,
      status: "ready",
      planId: null,
      createdAt: now.toISOString()
    };

    await this.store.save(record, fingerprint);
    return {
      status: "delivered",
      reason: "delivered",
      explanation: `已为 ${candidates.length} 个可整理文件生成桌面收纳建议。`,
      kind: "desktop-inbox",
      suggestion: record
    };
  }

  async snoozeUntil(until: Date): Promise<void> {
    await this.saveControls({ snoozedUntil: until.toISOString() });
  }

  async muteUntil(until: Date): Promise<void> {
    await this.saveControls({ mutedUntil: until.toISOString() });
  }

  async disable(): Promise<void> {
    await this.saveControls({ disabled: true });
  }

  async enable(): Promise<void> {
    await this.saveControls({ disabled: false });
  }

  private async saveControls(changes: SuggestionDeliveryControls): Promise<void> {
    if (!this.store.saveDeliveryControls) {
      throw new Error("Suggestion delivery controls require a persistent store adapter.");
    }

    const current = await this.store.getDeliveryControls?.() ?? {};
    await this.store.saveDeliveryControls({ ...current, ...changes });
  }
}

function eligibleCandidates(candidates: readonly DesktopSuggestionCandidate[]): DesktopSuggestionCandidate[] {
  return candidates
    .filter((candidate) => (
      Boolean(candidate.filename.trim())
      && Boolean(candidate.fullPath.trim())
      && candidate.isRegularFile !== false
      && !candidate.isDirectory
      && !candidate.isMissing
      && !candidate.isShortcut
    ))
    .sort((left, right) => stableCandidateKey(left).localeCompare(stableCandidateKey(right)));
}

function runtimePauseDecision(runtime: SuggestionRuntimeState): Pick<SuggestionDecision, "reason" | "explanation"> | null {
  if (runtime.quietHours === true) {
    return { reason: "runtime-quiet-hours", explanation: "运行时状态指示当前处于免打扰时段。" };
  }
  if (runtime.fullscreen === true) {
    return { reason: "runtime-fullscreen", explanation: "检测到全屏应用，建议暂不打扰。" };
  }
  if (runtime.batterySaver === true) {
    return { reason: "runtime-battery-saver", explanation: "系统处于节电模式，建议暂不推送。" };
  }
  if (
    runtime.isBatteryLow === true
    || (typeof runtime.batteryLevel === "number" && runtime.batteryLevel <= LOW_BATTERY_PERCENT)
  ) {
    return { reason: "runtime-low-battery", explanation: "设备电量较低，建议暂不推送。" };
  }
  return null;
}

function deliveryPauseDecision(
  controls: SuggestionDeliveryControls | null,
  now: number
): Pick<SuggestionDecision, "reason" | "explanation"> | null {
  if (controls?.disabled === true) {
    return { reason: "delivery-disabled", explanation: "用户已关闭建议推送。" };
  }
  if (isFutureTime(controls?.snoozedUntil, now)) {
    return { reason: "delivery-snoozed", explanation: "建议推送仍处于稍后提醒时段。" };
  }
  if (isFutureTime(controls?.mutedUntil, now)) {
    return { reason: "delivery-muted", explanation: "建议推送仍处于临时静音时段。" };
  }
  return null;
}

function mergePolicy(base: SuggestionPolicy, override: SuggestionPolicy | null | undefined): SuggestionPolicy {
  if (!override) {
    return base;
  }
  return {
    ...base,
    ...override,
    quietHours: override.quietHours === undefined
      ? base.quietHours
      : override.quietHours,
    perKind: mergePerKindPolicy(base.perKind, override.perKind)
  };
}

function mergePerKindPolicy(
  base: SuggestionPolicy["perKind"],
  override: SuggestionPolicy["perKind"]
): SuggestionPolicy["perKind"] {
  if (override === undefined) {
    return base;
  }
  if (override === null) {
    return null;
  }

  const merged: Record<string, SuggestionKindPolicy | undefined> = { ...(base ?? {}) };
  for (const [kind, policy] of Object.entries(override)) {
    merged[kind] = policy
      ? { ...(base?.[kind] ?? {}), ...policy }
      : policy;
  }
  return merged;
}

function isScheduledQuietHour(now: Date, policy: SuggestionPolicy): boolean {
  const schedule = policy.quietHours;
  if (!schedule || schedule.enabled === false) {
    return false;
  }

  const start = parseClockTime(schedule.start);
  const end = parseClockTime(schedule.end);
  if (start === null || end === null || start === end) {
    return false;
  }

  const current = minuteOfDay(now, policy.timeZoneOffsetMinutes);
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}

function parseClockTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
    ? hours * 60 + minutes
    : null;
}

function minuteOfDay(now: Date, offsetMinutes: number | undefined): number {
  if (typeof offsetMinutes !== "number" || !Number.isFinite(offsetMinutes)) {
    return now.getHours() * 60 + now.getMinutes();
  }
  const shifted = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

function startOfPolicyDay(now: Date, offsetMinutes: number | undefined): Date {
  if (typeof offsetMinutes !== "number" || !Number.isFinite(offsetMinutes)) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const shifted = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - offsetMinutes * 60 * 1000);
}

function normalizeBudget(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;
}

function normalizeDuration(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function isWithinCooldown(latestCreatedAt: string | null, now: Date, cooldownMs: number): boolean {
  if (!latestCreatedAt || cooldownMs <= 0) {
    return false;
  }
  const latest = Date.parse(latestCreatedAt);
  return Number.isFinite(latest) && now.getTime() - latest < cooldownMs;
}

function countHistoryWithin(
  history: readonly SuggestionDeliveryHistoryEntry[],
  start: Date,
  end: Date,
  kind?: string
): number {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return history.filter((entry) => {
    const createdAt = Date.parse(entry.createdAt);
    return (kind === undefined || entry.kind === kind)
      && Number.isFinite(createdAt)
      && createdAt >= startTime
      && createdAt <= endTime;
  }).length;
}

function suppressed(reason: SuggestionDecisionReason, explanation: string): SuggestionDecision {
  return {
    status: "suppressed",
    reason,
    explanation,
    kind: "desktop-inbox",
    suggestion: null
  };
}

function isFutureTime(value: string | null | undefined, now: number): boolean {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > now;
}

function createFingerprint(candidates: readonly DesktopSuggestionCandidate[]): string {
  let hash = 0x811c9dc5;
  for (const candidate of candidates) {
    for (const character of stableCandidateKey(candidate)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    hash ^= 0x1f;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function stableCandidateKey(candidate: DesktopSuggestionCandidate): string {
  return `${String(candidate.id)}\u0000${candidate.fullPath.toLocaleLowerCase()}\u0000${candidate.filename.toLocaleLowerCase()}`;
}

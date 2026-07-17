import type {
  EffectivePerformanceProfile,
  PerformanceMode,
  RuntimePauseReason,
  RuntimePauseSnapshot,
  ThermalState
} from "../shared/runtime.js";

export interface PauseArbiterInput {
  manual: boolean;
  externalFullscreen: boolean;
  screenLocked: boolean;
  suspended: boolean;
  onBattery: boolean;
  batteryLevel: number | null;
  thermalState: ThermalState;
  configuredMode: PerformanceMode;
}

const DEFAULT_INPUT: PauseArbiterInput = {
  manual: false,
  externalFullscreen: false,
  screenLocked: false,
  suspended: false,
  onBattery: false,
  batteryLevel: null,
  thermalState: "unknown",
  configuredMode: "auto"
};

export class PauseArbiter {
  private input: PauseArbiterInput;
  private snapshotValue: RuntimePauseSnapshot;

  constructor(
    initial: Partial<PauseArbiterInput> = {},
    private readonly onChange?: (snapshot: RuntimePauseSnapshot) => void,
    private readonly now: () => Date = () => new Date()
  ) {
    this.input = normalizeInput({ ...DEFAULT_INPUT, ...initial });
    this.snapshotValue = createSnapshot(this.input, this.now().toISOString());
  }

  get snapshot(): RuntimePauseSnapshot {
    return cloneSnapshot(this.snapshotValue);
  }

  update(patch: Partial<PauseArbiterInput>): RuntimePauseSnapshot {
    const nextInput = normalizeInput({ ...this.input, ...patch });
    const candidate = createSnapshot(nextInput, this.snapshotValue.changedAt);
    this.input = nextInput;
    if (sameRuntimeState(candidate, this.snapshotValue)) return this.snapshot;

    this.snapshotValue = { ...candidate, changedAt: this.now().toISOString() };
    const snapshot = this.snapshot;
    this.onChange?.(snapshot);
    return snapshot;
  }
}

function createSnapshot(input: PauseArbiterInput, changedAt: string): RuntimePauseSnapshot {
  const reasons: RuntimePauseReason[] = [];
  if (input.manual) reasons.push("manual");
  if (input.externalFullscreen) reasons.push("external-fullscreen");
  if (input.screenLocked) reasons.push("screen-locked");
  if (input.suspended) reasons.push("system-suspend");
  if (input.thermalState === "critical") reasons.push("thermal-critical");
  return {
    ...input,
    paused: reasons.length > 0,
    reasons,
    effectiveProfile: resolveEffectiveProfile(input),
    changedAt
  };
}

function resolveEffectiveProfile(input: PauseArbiterInput): EffectivePerformanceProfile {
  if (input.thermalState === "serious" || input.thermalState === "critical") return "batterySaver";
  if (input.configuredMode === "batterySaver") return "batterySaver";
  if (input.configuredMode === "quality") return input.onBattery && lowBattery(input.batteryLevel) ? "balanced" : "quality";
  if (input.configuredMode === "balanced") return input.onBattery && lowBattery(input.batteryLevel) ? "batterySaver" : "balanced";
  return input.onBattery ? "batterySaver" : "balanced";
}

function lowBattery(level: number | null): boolean {
  return level !== null && level <= 20;
}

function normalizeInput(input: PauseArbiterInput): PauseArbiterInput {
  const batteryLevel = typeof input.batteryLevel === "number" && Number.isFinite(input.batteryLevel)
    ? Math.max(0, Math.min(100, Math.round(input.batteryLevel)))
    : null;
  return { ...input, batteryLevel };
}

function sameRuntimeState(left: RuntimePauseSnapshot, right: RuntimePauseSnapshot): boolean {
  return JSON.stringify({ ...left, changedAt: "" }) === JSON.stringify({ ...right, changedAt: "" });
}

function cloneSnapshot(snapshot: RuntimePauseSnapshot): RuntimePauseSnapshot {
  return { ...snapshot, reasons: [...snapshot.reasons] };
}


export type PerformanceMode = "auto" | "quality" | "balanced" | "batterySaver";

export type EffectivePerformanceProfile = Exclude<PerformanceMode, "auto">;

export type RuntimePauseReason =
  | "manual"
  | "external-fullscreen"
  | "screen-locked"
  | "system-suspend"
  | "thermal-critical";

export type ThermalState = "unknown" | "nominal" | "fair" | "serious" | "critical";

export interface RuntimePauseSnapshot {
  paused: boolean;
  reasons: RuntimePauseReason[];
  manual: boolean;
  externalFullscreen: boolean;
  screenLocked: boolean;
  suspended: boolean;
  onBattery: boolean;
  batteryLevel: number | null;
  thermalState: ThermalState;
  configuredMode: PerformanceMode;
  effectiveProfile: EffectivePerformanceProfile;
  changedAt: string;
}

export interface RuntimeMetricSample {
  sampledAt: string;
  source: "main" | "renderer" | "gpu" | "utility" | "other";
  processId: number;
  cpuPercent: number;
  workingSetBytes: number;
  paused: boolean;
  profile: EffectivePerformanceProfile;
}

export interface RuntimeMetricsReport {
  generatedAt: string;
  sampleCount: number;
  windowMinutes: number;
  cpuMedianPercent: number;
  cpuP95Percent: number;
  peakWorkingSetBytes: number;
  memoryGrowthPercent: number;
  pausedSampleCount: number;
  samples: RuntimeMetricSample[];
}

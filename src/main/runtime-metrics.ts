import type { RuntimeMetricSample, RuntimeMetricsReport, RuntimePauseSnapshot } from "../shared/runtime.js";

export interface RuntimeProcessMetric {
  source: RuntimeMetricSample["source"];
  processId: number;
  cpuPercent: number;
  workingSetBytes: number;
}

export interface RuntimeMetricsDependencies {
  sampleProcesses: () => RuntimeProcessMetric[];
  getRuntimeState: () => RuntimePauseSnapshot;
  persistBatch?: (samples: RuntimeMetricSample[]) => void;
  now?: () => Date;
  intervalMs?: number;
  maxSamples?: number;
  flushSize?: number;
}

export class RuntimeMetricsService {
  private readonly samples: RuntimeMetricSample[] = [];
  private readonly pending: RuntimeMetricSample[] = [];
  private readonly now: () => Date;
  private readonly intervalMs: number;
  private readonly maxSamples: number;
  private readonly flushSize: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly deps: RuntimeMetricsDependencies) {
    this.now = deps.now ?? (() => new Date());
    this.intervalMs = deps.intervalMs ?? 15_000;
    this.maxSamples = deps.maxSamples ?? 8_000;
    this.flushSize = deps.flushSize ?? 20;
  }

  start(): void {
    if (this.timer) return;
    this.capture();
    this.timer = setInterval(() => this.capture(), this.intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.flush();
  }

  capture(): RuntimeMetricSample[] {
    const state = this.deps.getRuntimeState();
    const sampledAt = this.now().toISOString();
    const batch = this.deps.sampleProcesses().map((metric): RuntimeMetricSample => ({
      sampledAt,
      source: metric.source,
      processId: Math.max(0, Math.round(metric.processId)),
      cpuPercent: finiteNonNegative(metric.cpuPercent),
      workingSetBytes: Math.round(finiteNonNegative(metric.workingSetBytes)),
      paused: state.paused,
      profile: state.effectiveProfile
    }));
    this.samples.push(...batch);
    this.pending.push(...batch);
    if (this.samples.length > this.maxSamples) this.samples.splice(0, this.samples.length - this.maxSamples);
    if (this.pending.length >= this.flushSize) this.flush();
    return batch;
  }

  report(): RuntimeMetricsReport {
    return createRuntimeMetricsReport(this.samples, this.now());
  }

  private flush(): void {
    if (!this.pending.length || !this.deps.persistBatch) return;
    const batch = this.pending.splice(0, this.pending.length);
    this.deps.persistBatch(batch);
  }
}

export function createRuntimeMetricsReport(samples: readonly RuntimeMetricSample[], now = new Date()): RuntimeMetricsReport {
  const grouped = stableProcessGroups(groupByTimestamp(samples));
  const sortedCpu = grouped.map((sample) => sample.cpuPercent).sort((a, b) => a - b);
  const firstTotal = grouped[0]?.workingSetBytes ?? 0;
  const lastTotal = grouped.at(-1)?.workingSetBytes ?? 0;
  const startedAt = grouped[0] ? Date.parse(grouped[0].sampledAt) : now.getTime();
  return {
    generatedAt: now.toISOString(),
    sampleCount: samples.length,
    windowMinutes: Math.max(0, (now.getTime() - startedAt) / 60_000),
    cpuMedianPercent: percentile(sortedCpu, 0.5),
    cpuP95Percent: percentile(sortedCpu, 0.95),
    peakWorkingSetBytes: grouped.reduce((peak, sample) => Math.max(peak, sample.workingSetBytes), 0),
    memoryGrowthPercent: firstTotal > 0 ? ((lastTotal - firstTotal) / firstTotal) * 100 : 0,
    pausedSampleCount: samples.filter((sample) => sample.paused).length,
    samples: samples.map((sample) => ({ ...sample }))
  };
}

function groupByTimestamp(samples: readonly RuntimeMetricSample[]): Array<{ sampledAt: string; processCount: number; cpuPercent: number; workingSetBytes: number }> {
  const grouped = new Map<string, { sampledAt: string; processCount: number; cpuPercent: number; workingSetBytes: number }>();
  for (const sample of samples) {
    const current = grouped.get(sample.sampledAt) ?? { sampledAt: sample.sampledAt, processCount: 0, cpuPercent: 0, workingSetBytes: 0 };
    current.processCount += 1;
    current.cpuPercent += sample.cpuPercent;
    current.workingSetBytes += sample.workingSetBytes;
    grouped.set(sample.sampledAt, current);
  }
  return [...grouped.values()];
}

function stableProcessGroups<T extends { processCount: number }>(groups: T[]): T[] {
  const maximum = groups.reduce((value, group) => Math.max(value, group.processCount), 0);
  const stable = groups.filter((group) => group.processCount >= Math.max(1, Math.ceil(maximum * 0.6)));
  return stable.length ? stable : groups;
}

function percentile(sorted: readonly number[], ratio: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

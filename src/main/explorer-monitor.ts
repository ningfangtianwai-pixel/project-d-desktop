import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const EXPLORER_PROBE_TIMEOUT_MS = 8_000;

export type ExplorerProcessProbe = () => Promise<string | null>;

export class ExplorerProcessMonitor {
  private interval: NodeJS.Timeout | null = null;
  private running = false;
  private stopped = true;
  private lastProcessId: string | null = null;

  constructor(private readonly options: {
    probe?: ExplorerProcessProbe;
    intervalMs?: number;
    onRestart: (previousProcessId: string, currentProcessId: string) => void;
    onError?: (error: unknown) => void;
  }) {}

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    void this.poll();
    this.interval = setInterval(() => void this.poll(), Math.max(5_000, this.options.intervalMs ?? 10_000));
    this.interval.unref?.();
  }

  stop(): void {
    this.stopped = true;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async poll(): Promise<void> {
    if (this.stopped || this.running) return;
    this.running = true;
    try {
      const currentProcessId = await (this.options.probe ?? probeWindowsExplorerProcess)();
      if (currentProcessId) {
        if (this.lastProcessId && this.lastProcessId !== currentProcessId) {
          this.options.onRestart(this.lastProcessId, currentProcessId);
        }
        this.lastProcessId = currentProcessId;
      }
    } catch (error) {
      this.options.onError?.(error);
    } finally {
      this.running = false;
    }
  }
}

export async function probeWindowsExplorerProcess(): Promise<string | null> {
  if (process.platform !== "win32") return null;
  const { stdout } = await execFileAsync(
    "tasklist.exe",
    ["/FI", "IMAGENAME eq explorer.exe", "/FO", "CSV", "/NH"],
    { encoding: "utf8", windowsHide: true, timeout: EXPLORER_PROBE_TIMEOUT_MS, maxBuffer: 16 * 1024 }
  );
  const match = /"explorer\.exe","(\d+)"/i.exec(stdout);
  return match?.[1] ?? null;
}

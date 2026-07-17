import type { FeatureDecision, FeatureDefinition, RemoteConfigCursor, RemoteConfigEnvelope, VerifiedRemoteConfig, VersionDecision } from "../../shared/operations.js";
import { advanceRemoteConfigCursor, decideAsset, decideFeature, decideVersion, verifyRemoteConfig } from "./remote-config.js";

interface StateStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

interface OperationsLogger {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
}

export interface OperationsControlOptions {
  appVersion: string;
  configId: string;
  endpoint?: string | null;
  publicKey?: string | null;
  state: StateStore;
  logger: OperationsLogger;
  fetchConfig?: (url: string) => Promise<unknown>;
  refreshIntervalMs?: number;
}

const CONFIG_CACHE_KEY = "operations:verified-config";
const CONFIG_CURSOR_KEY = "operations:config-cursor";

export class OperationsControlService {
  private readonly endpoint: string | null;
  private readonly publicKey: string | null;
  private readonly fetchConfig: (url: string) => Promise<unknown>;
  private readonly refreshIntervalMs: number;
  private current: VerifiedRemoteConfig | null = null;
  private cursor: RemoteConfigCursor | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly options: OperationsControlOptions) {
    this.endpoint = validHttpsUrl(options.endpoint);
    this.publicKey = options.publicKey?.trim() || null;
    this.fetchConfig = options.fetchConfig ?? fetchOperationsConfig;
    this.refreshIntervalMs = Math.max(60_000, options.refreshIntervalMs ?? 15 * 60_000);
  }

  get configured(): boolean {
    return Boolean(this.endpoint && this.publicKey);
  }

  async initialize(): Promise<void> {
    this.loadPersistedState();
    if (!this.configured) return;
    await this.refresh().catch((error) => {
      this.options.logger.warn("operations config initial refresh failed", { message: errorMessage(error) });
    });
    this.timer = setInterval(() => {
      void this.refresh().catch((error) => {
        this.options.logger.warn("operations config refresh failed", { message: errorMessage(error) });
      });
    }, this.refreshIntervalMs);
    this.timer.unref?.();
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async refresh(): Promise<boolean> {
    if (!this.endpoint || !this.publicKey) return false;
    const raw = await this.fetchConfig(this.endpoint);
    const verified = verifyRemoteConfig(raw, {
      source: "remote",
      publicKey: this.publicKey,
      expectedConfigId: this.options.configId
    });
    const advance = advanceRemoteConfigCursor(this.cursor, verified);
    if (!advance.accepted) throw new Error(`Operations config rejected: ${advance.reason}`);
    this.cursor = advance.cursor;
    this.current = verified;
    this.options.state.set(CONFIG_CACHE_KEY, JSON.stringify(verified.envelope));
    this.options.state.set(CONFIG_CURSOR_KEY, JSON.stringify(advance.cursor));
    if (advance.changed) {
      this.options.logger.info("operations config accepted", {
        revision: advance.cursor.revision,
        expiresAt: advance.cursor.expiresAt
      });
    }
    return advance.changed;
  }

  feature(definition: FeatureDefinition): FeatureDecision {
    return decideFeature(definition, this.current);
  }

  assetAllowed(assetId: string): boolean {
    return decideAsset(assetId, this.current).allowed;
  }

  version(): VersionDecision {
    return decideVersion(this.options.appVersion, this.current);
  }

  private loadPersistedState(): void {
    if (!this.publicKey) return;

    const rawCursor = this.options.state.get(CONFIG_CURSOR_KEY);
    if (rawCursor) {
      try {
        this.cursor = parsePersistedCursor(rawCursor, this.options.configId);
      } catch (error) {
        this.options.logger.warn("persisted operations cursor rejected", { message: errorMessage(error) });
      }
    }

    const rawEnvelope = this.options.state.get(CONFIG_CACHE_KEY);
    if (!rawEnvelope) return;
    try {
      const verified = verifyRemoteConfig(JSON.parse(rawEnvelope) as RemoteConfigEnvelope, {
        source: "remote",
        publicKey: this.publicKey,
        expectedConfigId: this.options.configId
      });
      const advance = advanceRemoteConfigCursor(this.cursor, verified);
      if (!advance.accepted) throw new Error(`Persisted operations config rejected: ${advance.reason}`);
      this.current = verified;
      this.cursor = advance.cursor;
    } catch (error) {
      this.current = null;
      this.options.logger.warn("persisted operations config rejected", { message: errorMessage(error) });
    }
  }
}

function parsePersistedCursor(raw: string, expectedConfigId: string): RemoteConfigCursor {
  const value = JSON.parse(raw) as Partial<RemoteConfigCursor>;
  if (value.configId !== expectedConfigId) throw new Error("Cursor config ID mismatch");
  if (!Number.isInteger(value.revision) || (value.revision ?? 0) < 1) throw new Error("Cursor revision is invalid");
  if (!/^[a-f0-9]{64}$/i.test(value.payloadSha256 ?? "")) throw new Error("Cursor payload hash is invalid");
  if (!value.expiresAt || !Number.isFinite(Date.parse(value.expiresAt))) throw new Error("Cursor expiry is invalid");
  return value as RemoteConfigCursor;
}

function validHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function fetchOperationsConfig(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Operations config HTTP ${response.status}`);
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > 512 * 1024) throw new Error("Operations config exceeds 512 KiB");
    return JSON.parse(text) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

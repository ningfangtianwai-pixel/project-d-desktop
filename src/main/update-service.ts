import type { UpdateChannel, UpdateRecoveryState, UpdateStatus } from "../shared/update.js";

interface UpdateStateStore {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
}

interface UpdateLogger {
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
}

export interface UpdateServiceOptions {
  currentVersion: string;
  releasesUrl: string;
  state: UpdateStateStore;
  logger: UpdateLogger;
  openExternal: (url: string) => Promise<void>;
  onStatusChanged?: (status: UpdateStatus) => void;
  now?: () => Date;
  distributionAllowed?: () => boolean;
}

const CHANNEL_STATE_KEY = "update_channel";

export function normalizeUpdateChannel(value: string | null | undefined): UpdateChannel {
  return value === "beta" ? "beta" : "stable";
}

export function validateManualUpdateUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") return null;
    if (segments.length !== 3 || segments[2].toLowerCase() !== "releases") return null;
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export class UpdateService {
  private readonly currentVersion: string;
  private readonly releasesUrl: string | null;
  private readonly state: UpdateStateStore;
  private readonly logger: UpdateLogger;
  private readonly openExternal: (url: string) => Promise<void>;
  private readonly onStatusChanged?: (status: UpdateStatus) => void;
  private readonly now: () => Date;
  private readonly distributionAllowed: () => boolean;
  private channel: UpdateChannel;
  private status: UpdateStatus;

  constructor(options: UpdateServiceOptions) {
    this.currentVersion = options.currentVersion;
    this.releasesUrl = validateManualUpdateUrl(options.releasesUrl);
    this.state = options.state;
    this.logger = options.logger;
    this.openExternal = options.openExternal;
    this.onStatusChanged = options.onStatusChanged;
    this.now = options.now ?? (() => new Date());
    this.distributionAllowed = options.distributionAllowed ?? (() => true);
    this.channel = normalizeUpdateChannel(this.state.get(CHANNEL_STATE_KEY));
    this.status = this.makeStatus(
      this.releasesUrl ? "manual" : "disabled",
      this.releasesUrl ? "手动更新模式：在 GitHub Releases 查看新版本" : "未配置可信的 GitHub Releases 地址"
    );
  }

  getStatus(): UpdateStatus {
    return { ...this.status, recovery: this.status.recovery ? { ...this.status.recovery } : undefined };
  }

  setChannel(channel: UpdateChannel): UpdateStatus {
    this.channel = normalizeUpdateChannel(channel);
    this.state.set(CHANNEL_STATE_KEY, this.channel);
    return this.updateStatus(
      this.releasesUrl ? "manual" : "disabled",
      this.channel === "beta"
        ? "已选择 Beta；请在 GitHub Releases 手动下载预发布版本"
        : "已选择稳定版；请在 GitHub Releases 手动下载正式版本"
    );
  }

  async checkForUpdates(): Promise<UpdateStatus> {
    if (!this.releasesUrl) throw new Error("未配置可信的 GitHub Releases 地址");
    if (!this.distributionAllowed()) throw new Error("更新入口已由运维策略暂停");

    await this.openExternal(this.releasesUrl);
    this.logger.info("manual update page opened", { channel: this.channel, releasesUrl: this.releasesUrl });
    return this.updateStatus("manual", "已打开 GitHub Releases，请手动核对版本和 SHA256", {
      lastCheckedAt: this.now().toISOString()
    });
  }

  dispose(): void {
    // Manual mode owns no listeners, timers, downloads, or child processes.
  }

  private makeStatus(phase: UpdateStatus["phase"], message: string): UpdateStatus {
    return {
      phase,
      channel: this.channel,
      currentVersion: this.currentVersion,
      availableVersion: null,
      progressPercent: null,
      transferredBytes: null,
      totalBytes: null,
      lastCheckedAt: null,
      feedConfigured: Boolean(this.releasesUrl),
      stagedRolloutSupported: false,
      message,
      recovery: emptyRecoveryState(this.currentVersion, this.now().toISOString())
    };
  }

  private updateStatus(
    phase: UpdateStatus["phase"],
    message: string,
    patch: Partial<UpdateStatus> = {}
  ): UpdateStatus {
    this.status = { ...this.status, ...patch, phase, message, channel: this.channel };
    this.onStatusChanged?.(this.getStatus());
    return this.getStatus();
  }
}

function emptyRecoveryState(currentVersion: string, now: string): UpdateRecoveryState {
  return {
    schemaVersion: 1,
    failureCount: 0,
    maxFailureCount: 0,
    retryBlocked: false,
    lastFailureAt: null,
    lastFailureMessage: null,
    lastFailureOperation: null,
    lastSuccessfulVersion: currentVersion,
    lastSuccessfulAt: now,
    pendingInstallVersion: null,
    pendingInstallRequestedAt: null,
    pendingInstallFailureRecorded: false,
    recoveryAction: "none",
    recoveryReason: null,
    recoveryCreatedAt: null
  };
}

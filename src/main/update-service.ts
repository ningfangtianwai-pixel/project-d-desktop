import type { AppUpdater } from "electron-updater";
import type { UpdateChannel, UpdateStatus } from "../shared/update.js";

interface UpdateInfoLike {
  version: string;
}

interface ProgressInfoLike {
  percent: number;
  transferred: number;
  total: number;
}

interface UpdateStateStore {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
}

interface UpdateLogger {
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
}

export interface UpdateServiceOptions {
  updater: AppUpdater;
  currentVersion: string;
  isPackaged: boolean;
  feedUrl?: string | null;
  useBundledFeed?: boolean;
  state: UpdateStateStore;
  logger: UpdateLogger;
  onStatusChanged?: (status: UpdateStatus) => void;
  enableInDevelopment?: boolean;
}

const CHANNEL_STATE_KEY = "update_channel";

export function normalizeUpdateChannel(value: string | null | undefined): UpdateChannel {
  return value === "beta" ? "beta" : "stable";
}

export function validateUpdateFeedUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export class UpdateService {
  private readonly updater: AppUpdater;
  private readonly currentVersion: string;
  private readonly state: UpdateStateStore;
  private readonly logger: UpdateLogger;
  private readonly onStatusChanged?: (status: UpdateStatus) => void;
  private readonly feedUrl: string | null;
  private readonly enabled: boolean;
  private autoCheckTimer: NodeJS.Timeout | null = null;
  private channel: UpdateChannel;
  private status: UpdateStatus;

  constructor(options: UpdateServiceOptions) {
    this.updater = options.updater;
    this.currentVersion = options.currentVersion;
    this.state = options.state;
    this.logger = options.logger;
    this.onStatusChanged = options.onStatusChanged;
    this.feedUrl = validateUpdateFeedUrl(options.feedUrl);
    this.enabled = (Boolean(this.feedUrl) || options.useBundledFeed === true)
      && (options.isPackaged || options.enableInDevelopment === true);
    this.channel = normalizeUpdateChannel(this.state.get(CHANNEL_STATE_KEY));
    this.status = this.makeStatus(
      this.enabled ? "idle" : "disabled",
      this.enabled ? "已就绪，可检查更新" : "尚未配置正式更新服务器"
    );
    this.registerUpdaterEvents();
    if (this.enabled) this.configureUpdater();
  }

  getStatus(): UpdateStatus {
    return { ...this.status };
  }

  setChannel(channel: UpdateChannel): UpdateStatus {
    this.channel = normalizeUpdateChannel(channel);
    this.state.set(CHANNEL_STATE_KEY, this.channel);
    if (this.enabled) this.configureUpdater();
    return this.updateStatus(
      this.enabled ? "idle" : "disabled",
      this.channel === "beta" ? "已切换到灰度体验通道" : "已切换到稳定通道",
      { availableVersion: null, progressPercent: null, transferredBytes: null, totalBytes: null }
    );
  }

  async checkForUpdates(): Promise<UpdateStatus> {
    this.assertEnabled();
    this.updateStatus("checking", "正在检查更新", { lastCheckedAt: new Date().toISOString() });
    try {
      await this.updater.checkForUpdates();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
    return this.getStatus();
  }

  async downloadUpdate(): Promise<UpdateStatus> {
    this.assertEnabled();
    if (this.status.phase !== "available") throw new Error("当前没有可下载的更新");
    this.updateStatus("downloading", "正在下载更新", { progressPercent: 0 });
    try {
      await this.updater.downloadUpdate();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
    return this.getStatus();
  }

  installDownloadedUpdate(): void {
    this.assertEnabled();
    if (this.status.phase !== "downloaded") throw new Error("更新尚未下载完成");
    this.logger.info("installing downloaded update", { version: this.status.availableVersion, channel: this.channel });
    this.updater.quitAndInstall(false, true);
  }

  scheduleAutomaticCheck(delayMs = 30_000): void {
    if (!this.enabled || this.autoCheckTimer) return;
    this.autoCheckTimer = setTimeout(() => {
      this.autoCheckTimer = null;
      void this.checkForUpdates().catch((error) => {
        this.logger.warn("automatic update check failed", { message: toErrorMessage(error) });
      });
    }, Math.max(1_000, delayMs));
    this.autoCheckTimer.unref?.();
  }

  dispose(): void {
    if (this.autoCheckTimer) clearTimeout(this.autoCheckTimer);
    this.autoCheckTimer = null;
  }

  private configureUpdater(): void {
    const feedChannel = this.channel === "beta" ? "beta" : "latest";
    this.updater.autoDownload = false;
    this.updater.autoInstallOnAppQuit = false;
    this.updater.allowPrerelease = this.channel === "beta";
    this.updater.allowDowngrade = this.channel === "stable";
    this.updater.disableWebInstaller = true;
    this.updater.channel = feedChannel;
    if (this.feedUrl) {
      this.updater.setFeedURL({ provider: "generic", url: this.feedUrl, channel: feedChannel });
    }
    this.logger.info("update service configured", { channel: this.channel, feedChannel });
  }

  private registerUpdaterEvents(): void {
    this.updater.on("checking-for-update", () => {
      this.updateStatus("checking", "正在检查更新", { lastCheckedAt: new Date().toISOString() });
    });
    this.updater.on("update-available", (info: UpdateInfoLike) => {
      this.updateStatus("available", `发现新版本 ${info.version}`, { availableVersion: info.version });
    });
    this.updater.on("update-not-available", () => {
      this.updateStatus("not-available", "当前已是最新版本", { availableVersion: null, progressPercent: null });
    });
    this.updater.on("download-progress", (progress: ProgressInfoLike) => {
      this.updateStatus("downloading", `正在下载 ${Math.round(progress.percent)}%`, {
        progressPercent: Math.max(0, Math.min(100, progress.percent)),
        transferredBytes: progress.transferred,
        totalBytes: progress.total
      });
    });
    this.updater.on("update-downloaded", (info: UpdateInfoLike) => {
      this.updateStatus("downloaded", `版本 ${info.version} 已下载，等待安装`, {
        availableVersion: info.version,
        progressPercent: 100
      });
    });
    this.updater.on("error", (error: Error) => this.handleError(error));
  }

  private handleError(error: unknown): void {
    const message = toErrorMessage(error);
    this.logger.error("update operation failed", { message, channel: this.channel });
    this.updateStatus("error", `更新失败：${message}`);
  }

  private assertEnabled(): void {
    if (!this.enabled) throw new Error("正式更新服务器尚未配置");
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
      feedConfigured: this.enabled,
      stagedRolloutSupported: true,
      message
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

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

import type { AppUpdater } from "electron-updater";
import type {
  UpdateChannel,
  UpdateOperation,
  UpdateRecoveryAction,
  UpdateRecoveryState,
  UpdateStatus
} from "../shared/update.js";

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
  maxFailureCount?: number;
  now?: () => Date;
  distributionAllowed?: () => boolean;
}

const CHANNEL_STATE_KEY = "update_channel";
const RECOVERY_STATE_KEY = "update_recovery_state";
const DEFAULT_MAX_FAILURE_COUNT = 3;

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
  private readonly now: () => Date;
  private readonly distributionAllowed: () => boolean;
  private autoCheckTimer: NodeJS.Timeout | null = null;
  private activeOperation: UpdateOperation | null = null;
  private activeOperationFailureHandled = false;
  private channel: UpdateChannel;
  private recovery: UpdateRecoveryState;
  private status: UpdateStatus;

  constructor(options: UpdateServiceOptions) {
    this.updater = options.updater;
    this.currentVersion = options.currentVersion;
    this.state = options.state;
    this.logger = options.logger;
    this.onStatusChanged = options.onStatusChanged;
    this.now = options.now ?? (() => new Date());
    this.distributionAllowed = options.distributionAllowed ?? (() => true);
    this.feedUrl = validateUpdateFeedUrl(options.feedUrl);
    this.enabled = (Boolean(this.feedUrl) || options.useBundledFeed === true)
      && (options.isPackaged || options.enableInDevelopment === true);
    this.channel = normalizeUpdateChannel(this.state.get(CHANNEL_STATE_KEY));
    this.recovery = loadRecoveryState(
      this.state.get(RECOVERY_STATE_KEY),
      this.currentVersion,
      options.maxFailureCount ?? DEFAULT_MAX_FAILURE_COUNT,
      this.now().toISOString()
    );
    this.reconcilePendingInstall();
    this.status = this.makeStatus(
      this.enabled ? "idle" : "disabled",
      this.enabled ? "已就绪，可检查更新" : "尚未配置正式更新服务器"
    );
    this.registerUpdaterEvents();
    if (this.enabled) this.configureUpdater();
  }

  getStatus(): UpdateStatus {
    return { ...this.status, recovery: { ...this.recovery } };
  }

  setChannel(channel: UpdateChannel): UpdateStatus {
    this.channel = normalizeUpdateChannel(channel);
    this.state.set(CHANNEL_STATE_KEY, this.channel);
    this.clearFailureBudget();
    if (this.enabled) this.configureUpdater();
    return this.updateStatus(
      this.enabled ? "idle" : "disabled",
      this.channel === "beta" ? "已切换到灰度体验通道" : "已切换到稳定通道",
      { availableVersion: null, progressPercent: null, transferredBytes: null, totalBytes: null }
    );
  }

  async checkForUpdates(): Promise<UpdateStatus> {
    this.assertEnabled();
    this.assertRetryAllowed();
    this.beginOperation("check");
    this.updateStatus("checking", "正在检查更新", { lastCheckedAt: new Date().toISOString() });
    try {
      await this.updater.checkForUpdates();
    } catch (error) {
      this.handleError(error, "check");
      throw error;
    }
    return this.getStatus();
  }

  async downloadUpdate(): Promise<UpdateStatus> {
    this.assertEnabled();
    this.assertRetryAllowed();
    if (this.status.phase !== "available") throw new Error("当前没有可下载的更新");
    this.beginOperation("download");
    this.updateStatus("downloading", "正在下载更新", { progressPercent: 0 });
    try {
      await this.updater.downloadUpdate();
    } catch (error) {
      this.handleError(error, "download");
      throw error;
    }
    return this.getStatus();
  }

  installDownloadedUpdate(): void {
    this.assertEnabled();
    this.assertRetryAllowed();
    if (this.status.phase !== "downloaded") throw new Error("更新尚未下载完成");
    const version = this.status.availableVersion;
    if (!version) throw new Error("Downloaded update version is missing");
    const requestedAt = this.now().toISOString();
    this.recovery = {
      ...this.recovery,
      pendingInstallVersion: version,
      pendingInstallRequestedAt: requestedAt,
      pendingInstallFailureRecorded: false,
      recoveryAction: "restore-last-successful",
      recoveryReason: `Restore ${this.recovery.lastSuccessfulVersion ?? this.currentVersion} if ${version} does not start`,
      recoveryCreatedAt: requestedAt
    };
    this.persistRecovery();
    this.logger.info("installing downloaded update", {
      version,
      channel: this.channel,
      recoveryAction: this.recovery.recoveryAction,
      lastSuccessfulVersion: this.recovery.lastSuccessfulVersion
    });
    try {
      this.updater.quitAndInstall(false, true);
    } catch (error) {
      this.recovery = {
        ...this.recovery,
        pendingInstallVersion: null,
        pendingInstallRequestedAt: null,
        pendingInstallFailureRecorded: false
      };
      this.handleError(error, "install");
      throw error;
    }
  }

  scheduleAutomaticCheck(delayMs = 30_000): void {
    if (!this.enabled || this.autoCheckTimer || this.recovery.retryBlocked || !this.distributionAllowed()) {
      if (this.recovery.retryBlocked) {
        this.logger.warn("automatic update check suppressed by retry budget", {
          failureCount: this.recovery.failureCount,
          maxFailureCount: this.recovery.maxFailureCount,
          recoveryAction: this.recovery.recoveryAction
        });
      }
      return;
    }
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
      this.completeOperation();
      this.updateStatus("available", `发现新版本 ${info.version}`, { availableVersion: info.version });
    });
    this.updater.on("update-not-available", () => {
      this.completeOperation(this.currentVersion);
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
      this.completeOperation();
      this.updateStatus("downloaded", `版本 ${info.version} 已下载，等待安装`, {
        availableVersion: info.version,
        progressPercent: 100
      });
    });
    this.updater.on("error", (error: Error) => this.handleError(error, this.activeOperation ?? "check"));
  }

  private handleError(error: unknown, operation: UpdateOperation): void {
    if (this.activeOperationFailureHandled) return;
    this.activeOperationFailureHandled = true;
    const message = toErrorMessage(error);
    this.recordFailure(operation, message);
    this.logger.error("update operation failed", {
      message,
      operation,
      channel: this.channel,
      failureCount: this.recovery.failureCount,
      retryBlocked: this.recovery.retryBlocked,
      recoveryAction: this.recovery.recoveryAction
    });
    this.updateStatus("error", `更新失败：${message}`, { recovery: { ...this.recovery } });
  }

  private assertEnabled(): void {
    if (!this.enabled) throw new Error("正式更新服务器尚未配置");
    if (!this.distributionAllowed()) throw new Error("更新分发已由运维策略暂停");
  }

  private assertRetryAllowed(): void {
    if (!this.recovery.retryBlocked) return;
    throw new Error(
      `Update retry budget exhausted (${this.recovery.failureCount}/${this.recovery.maxFailureCount}); manual intervention required`
    );
  }

  private beginOperation(operation: UpdateOperation): void {
    this.activeOperation = operation;
    this.activeOperationFailureHandled = false;
  }

  private completeOperation(successfulVersion?: string): void {
    this.activeOperation = null;
    this.activeOperationFailureHandled = false;
    this.recovery = {
      ...this.recovery,
      failureCount: 0,
      retryBlocked: false,
      recoveryAction: "none",
      recoveryReason: null,
      recoveryCreatedAt: null,
      ...(successfulVersion
        ? { lastSuccessfulVersion: successfulVersion, lastSuccessfulAt: this.now().toISOString() }
        : {})
    };
    this.persistRecovery();
  }

  private clearFailureBudget(): void {
    this.recovery = {
      ...this.recovery,
      failureCount: 0,
      retryBlocked: false,
      recoveryAction: "none",
      recoveryReason: null,
      recoveryCreatedAt: null
    };
    this.persistRecovery();
  }

  private recordFailure(operation: UpdateOperation, message: string): void {
    const failureCount = Math.min(this.recovery.failureCount + 1, this.recovery.maxFailureCount);
    const retryBlocked = failureCount >= this.recovery.maxFailureCount;
    const createdAt = this.now().toISOString();
    const retryAction: UpdateRecoveryAction = operation === "download" ? "retry-download" : "retry-check";
    this.recovery = {
      ...this.recovery,
      failureCount,
      retryBlocked,
      lastFailureAt: createdAt,
      lastFailureMessage: message,
      lastFailureOperation: operation,
      recoveryAction: retryBlocked ? "manual-intervention" : retryAction,
      recoveryReason: retryBlocked
        ? `Retry budget exhausted after ${failureCount} consecutive failures`
        : `Retry ${operation} after operator or scheduler backoff`,
      recoveryCreatedAt: createdAt
    };
    this.persistRecovery();
  }

  private reconcilePendingInstall(): void {
    const targetVersion = this.recovery.pendingInstallVersion;
    if (!targetVersion) {
      this.persistRecovery();
      return;
    }
    if (targetVersion === this.currentVersion) {
      const succeededAt = this.now().toISOString();
      this.recovery = {
        ...this.recovery,
        failureCount: 0,
        retryBlocked: false,
        lastSuccessfulVersion: this.currentVersion,
        lastSuccessfulAt: succeededAt,
        pendingInstallVersion: null,
        pendingInstallRequestedAt: null,
        pendingInstallFailureRecorded: false,
        recoveryAction: "none",
        recoveryReason: null,
        recoveryCreatedAt: null
      };
      this.persistRecovery();
      this.logger.info("update installation reconciled", { version: this.currentVersion, succeededAt });
      return;
    }
    if (this.recovery.pendingInstallFailureRecorded) return;

    const message = `Requested version ${targetVersion} did not start; current version is ${this.currentVersion}`;
    this.recordFailure("startup", message);
    this.recovery = {
      ...this.recovery,
      pendingInstallFailureRecorded: true,
      recoveryAction: this.recovery.retryBlocked ? "manual-intervention" : "restore-last-successful",
      recoveryReason: `Keep last successful version ${this.recovery.lastSuccessfulVersion ?? this.currentVersion}; ${message}`
    };
    this.persistRecovery();
    this.logger.warn("pending update did not reconcile", {
      targetVersion,
      currentVersion: this.currentVersion,
      failureCount: this.recovery.failureCount,
      recoveryAction: this.recovery.recoveryAction
    });
  }

  private persistRecovery(): void {
    this.state.set(RECOVERY_STATE_KEY, JSON.stringify(this.recovery));
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
      message,
      recovery: { ...this.recovery }
    };
  }

  private updateStatus(
    phase: UpdateStatus["phase"],
    message: string,
    patch: Partial<UpdateStatus> = {}
  ): UpdateStatus {
    this.status = {
      ...this.status,
      ...patch,
      phase,
      message,
      channel: this.channel,
      recovery: { ...this.recovery }
    };
    this.onStatusChanged?.(this.getStatus());
    return this.getStatus();
  }
}

function loadRecoveryState(
  raw: string | null,
  currentVersion: string,
  requestedMaxFailureCount: number,
  now: string
): UpdateRecoveryState {
  const maxFailureCount = Math.max(1, Math.floor(requestedMaxFailureCount));
  const defaults: UpdateRecoveryState = {
    schemaVersion: 1,
    failureCount: 0,
    maxFailureCount,
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
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<UpdateRecoveryState>;
    const failureCount = clampInteger(parsed.failureCount, 0, maxFailureCount);
    return {
      ...defaults,
      ...parsed,
      schemaVersion: 1,
      failureCount,
      maxFailureCount,
      retryBlocked: failureCount >= maxFailureCount,
      lastFailureOperation: isUpdateOperation(parsed.lastFailureOperation) ? parsed.lastFailureOperation : null,
      recoveryAction: isRecoveryAction(parsed.recoveryAction) ? parsed.recoveryAction : "none"
    };
  } catch {
    return defaults;
  }
}

function clampInteger(value: unknown, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, Math.floor(value)));
}

function isUpdateOperation(value: unknown): value is UpdateOperation {
  return value === "startup" || value === "check" || value === "download" || value === "install";
}

function isRecoveryAction(value: unknown): value is UpdateRecoveryAction {
  return value === "none"
    || value === "retry-check"
    || value === "retry-download"
    || value === "restore-last-successful"
    || value === "manual-intervention";
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

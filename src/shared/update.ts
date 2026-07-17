export type UpdateChannel = "stable" | "beta";

export type UpdatePhase =
  | "disabled"
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export type UpdateOperation = "startup" | "check" | "download" | "install";

export type UpdateRecoveryAction =
  | "none"
  | "retry-check"
  | "retry-download"
  | "restore-last-successful"
  | "manual-intervention";

export interface UpdateRecoveryState {
  schemaVersion: 1;
  failureCount: number;
  maxFailureCount: number;
  retryBlocked: boolean;
  lastFailureAt: string | null;
  lastFailureMessage: string | null;
  lastFailureOperation: UpdateOperation | null;
  lastSuccessfulVersion: string | null;
  lastSuccessfulAt: string | null;
  pendingInstallVersion: string | null;
  pendingInstallRequestedAt: string | null;
  pendingInstallFailureRecorded: boolean;
  recoveryAction: UpdateRecoveryAction;
  recoveryReason: string | null;
  recoveryCreatedAt: string | null;
}

export interface UpdateStatus {
  phase: UpdatePhase;
  channel: UpdateChannel;
  currentVersion: string;
  availableVersion: string | null;
  progressPercent: number | null;
  transferredBytes: number | null;
  totalBytes: number | null;
  lastCheckedAt: string | null;
  feedConfigured: boolean;
  stagedRolloutSupported: boolean;
  message: string;
  recovery?: UpdateRecoveryState;
}

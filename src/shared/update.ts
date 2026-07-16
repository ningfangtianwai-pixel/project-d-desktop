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
}

export type UpdateChannel = "stable" | "beta";

export type UpdatePhase = "disabled" | "manual";

export interface UpdateStatus {
  phase: UpdatePhase;
  channel: UpdateChannel;
  currentVersion: string;
  lastCheckedAt: string | null;
  feedConfigured: boolean;
  message: string;
}

import type { PrivacyNetworkState } from "../shared/types.js";

export const PRIVACY_NETWORK_PAUSED_KEY = "privacy_network_paused";
export const PRIVACY_NETWORK_CHANGED_AT_KEY = "privacy_network_changed_at";

export interface PrivacyStateStore {
  getAppState(key: string): string | null;
  setAppState(key: string, value: string): void;
}

export function getPrivacyNetworkState(store: Pick<PrivacyStateStore, "getAppState">): PrivacyNetworkState {
  return {
    paused: store.getAppState(PRIVACY_NETWORK_PAUSED_KEY) === "true",
    changedAt: store.getAppState(PRIVACY_NETWORK_CHANGED_AT_KEY)
  };
}

export function setPrivacyNetworkPaused(store: PrivacyStateStore, paused: boolean, now = new Date()): PrivacyNetworkState {
  const changedAt = now.toISOString();
  store.setAppState(PRIVACY_NETWORK_PAUSED_KEY, paused ? "true" : "false");
  store.setAppState(PRIVACY_NETWORK_CHANGED_AT_KEY, changedAt);
  return { paused, changedAt };
}

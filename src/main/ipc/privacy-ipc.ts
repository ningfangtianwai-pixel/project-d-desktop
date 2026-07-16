import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { PrivacyNetworkState } from "../../shared/types.js";

export interface PrivacyIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: (event: IpcMainInvokeEvent, routes?: readonly string[]) => void;
  exportData: () => Promise<{ cancelled: boolean; filename: string | null }>;
  resetData: () => Promise<void>;
  getNetworkState: () => PrivacyNetworkState;
  setNetworkPaused: (paused: boolean) => PrivacyNetworkState;
}

export function registerPrivacyIpcHandlers(deps: PrivacyIpcDependencies): void {
  deps.ipc.handle(IPC_CHANNELS.PRIVACY_EXPORT_DATA, (event) => {
    deps.assertTrustedSender(event, ["#/settings"]);
    return deps.exportData();
  });
  deps.ipc.handle(IPC_CHANNELS.PRIVACY_RESET_ALL, (event) => {
    deps.assertTrustedSender(event, ["#/settings"]);
    return deps.resetData();
  });
  deps.ipc.handle(IPC_CHANNELS.PRIVACY_GET_NETWORK_STATE, (event) => {
    deps.assertTrustedSender(event, ["#/settings"]);
    return deps.getNetworkState();
  });
  deps.ipc.handle(IPC_CHANNELS.PRIVACY_SET_NETWORK_PAUSED, (event, paused: unknown) => {
    deps.assertTrustedSender(event, ["#/settings"]);
    if (typeof paused !== "boolean") throw new Error("Invalid privacy network state");
    return deps.setNetworkPaused(paused);
  });
}

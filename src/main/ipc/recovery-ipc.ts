import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { RecoverySystemStatus } from "../../shared/types.js";

export interface RecoveryIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: (event: IpcMainInvokeEvent, routes?: readonly string[]) => void;
  getSystemStatus: () => Promise<RecoverySystemStatus>;
}

export function registerRecoveryIpcHandlers(deps: RecoveryIpcDependencies): void {
  deps.ipc.handle(IPC_CHANNELS.RECOVERY_GET_SYSTEM_STATUS, (event) => {
    deps.assertTrustedSender(event, ["#/settings"]);
    return deps.getSystemStatus();
  });
}

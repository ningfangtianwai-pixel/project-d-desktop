import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { UpdateChannel, UpdateStatus } from "../../shared/update.js";

type TrustedSenderGuard = (event: IpcMainInvokeEvent, routes?: string[]) => void;

export interface UpdateIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: TrustedSenderGuard;
  getStatus: () => UpdateStatus;
  setChannel: (channel: UpdateChannel) => UpdateStatus;
  checkForUpdates: () => Promise<UpdateStatus>;
  downloadUpdate: () => Promise<UpdateStatus>;
  installDownloadedUpdate: () => void;
}

export function registerUpdateIpcHandlers(deps: UpdateIpcDependencies): void {
  const trustedSettings = (event: IpcMainInvokeEvent) => deps.assertTrustedSender(event, ["#/settings"]);

  deps.ipc.handle(IPC_CHANNELS.UPDATE_GET_STATUS, (event) => {
    trustedSettings(event);
    return deps.getStatus();
  });
  deps.ipc.handle(IPC_CHANNELS.UPDATE_SET_CHANNEL, (event, channel: UpdateChannel) => {
    trustedSettings(event);
    if (channel !== "stable" && channel !== "beta") throw new Error("无效的更新通道");
    return deps.setChannel(channel);
  });
  deps.ipc.handle(IPC_CHANNELS.UPDATE_CHECK, async (event) => {
    trustedSettings(event);
    return deps.checkForUpdates();
  });
  deps.ipc.handle(IPC_CHANNELS.UPDATE_DOWNLOAD, async (event) => {
    trustedSettings(event);
    return deps.downloadUpdate();
  });
  deps.ipc.handle(IPC_CHANNELS.UPDATE_INSTALL, (event) => {
    trustedSettings(event);
    deps.installDownloadedUpdate();
  });
}

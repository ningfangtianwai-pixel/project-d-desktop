import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { AppInfo } from "../../shared/types.js";

type TrustedSenderGuard = (event: IpcMainInvokeEvent, routes?: string[]) => void;

export interface WindowIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: TrustedSenderGuard;
  getAppInfo: () => AppInfo;
  showMainWindow: () => void;
  showMainWindowAndFocusSearch: () => void;
  createSettingsWindow: () => void;
  openLogs: () => Promise<void>;
}

export function registerWindowIpcHandlers(deps: WindowIpcDependencies): void {
  const { ipc, assertTrustedSender } = deps;

  ipc.handle(IPC_CHANNELS.APP_INFO, (event): AppInfo => {
    assertTrustedSender(event, ["", "#/settings"]);
    return deps.getAppInfo();
  });

  ipc.handle(IPC_CHANNELS.WINDOW_SHOW_MAIN, (event): void => {
    assertTrustedSender(event, ["#/pet"]);
    deps.showMainWindow();
  });

  ipc.handle(IPC_CHANNELS.WINDOW_OPEN_SETTINGS, (event) => {
    assertTrustedSender(event);
    deps.createSettingsWindow();
  });

  ipc.handle(IPC_CHANNELS.LOGS_OPEN, async (event): Promise<void> => {
    assertTrustedSender(event, ["#/settings"]);
    await deps.openLogs();
  });
}

import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";

export interface ShortcutIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: (event: IpcMainInvokeEvent, routes?: readonly string[]) => void;
  setPeekShortcut: (accelerator: unknown) => Promise<{ success: boolean; accelerator: string }>;
}

export function registerShortcutIpcHandlers(deps: ShortcutIpcDependencies): void {
  deps.ipc.handle(IPC_CHANNELS.SHORTCUT_SET_PEEK, (event, accelerator: unknown) => {
    deps.assertTrustedSender(event, ["#/settings"]);
    return deps.setPeekShortcut(accelerator);
  });
}

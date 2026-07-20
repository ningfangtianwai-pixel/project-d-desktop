import type { IpcMain } from "electron";

export interface IpcHandlerRegistry {
  ipc: IpcMain;
  dispose: () => void;
}

export function createIpcHandlerRegistry(ipcMain: IpcMain): IpcHandlerRegistry {
  const channels = new Set<string>();
  const trackedIpc = new Proxy(ipcMain, {
    get(target, property, receiver) {
      if (property === "handle") {
        return (channel: string, listener: Parameters<IpcMain["handle"]>[1]) => {
          target.handle(channel, listener);
          channels.add(channel);
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });

  return {
    ipc: trackedIpc,
    dispose: () => {
      for (const channel of channels) ipcMain.removeHandler(channel);
      channels.clear();
    }
  };
}

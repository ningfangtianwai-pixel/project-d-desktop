import path from "node:path";
import { BrowserWindow, dialog, shell, type IpcMain, type IpcMainInvokeEvent, type OpenDialogOptions } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { PortalConfig, PortalResource } from "../../shared/types.js";
import type { PortalService } from "./portal-service.js";

type TrustedSenderGuard = (event: IpcMainInvokeEvent, routes?: string[]) => void;

export interface PortalIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: TrustedSenderGuard;
  getService: () => PortalService | null;
  approvedSelections: Map<string, number>;
  syncWatcher: () => void;
  broadcastUpdated: () => void;
  log: (message: string, data: Record<string, unknown>) => void;
  now?: () => number;
}

export function registerPortalIpcHandlers(deps: PortalIpcDependencies): void {
  const { ipc, assertTrustedSender } = deps;
  const now = deps.now ?? Date.now;

  ipc.handle(IPC_CHANNELS.PORTALS_CHOOSE_FOLDER, async (event): Promise<string | null> => {
    assertTrustedSender(event, ["#/settings", "#/overlay"]);
    const options: OpenDialogOptions = { title: "选择要以只读方式展示的文件夹", properties: ["openDirectory"] };
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    const result = senderWindow && !senderWindow.isDestroyed()
      ? await dialog.showOpenDialog(senderWindow, options)
      : await dialog.showOpenDialog(options);
    const selectedPath = result.canceled ? null : result.filePaths[0] ?? null;
    if (selectedPath) deps.approvedSelections.set(path.resolve(selectedPath), now());
    return selectedPath;
  });

  ipc.handle(IPC_CHANNELS.PORTALS_GET_ALL, (event): PortalConfig[] => {
    assertTrustedSender(event, ["#/settings", "#/overlay"]);
    return deps.getService()?.list() ?? [];
  });

  ipc.handle(IPC_CHANNELS.PORTALS_ADD, async (event, folderPath: unknown, name: unknown): Promise<PortalConfig> => {
    assertTrustedSender(event, ["#/settings", "#/overlay"]);
    const service = deps.getService();
    if (!service || typeof folderPath !== "string" || typeof name !== "string" || folderPath.length > 500 || name.length > 60) {
      throw new Error("Invalid folder portal input");
    }
    const resolvedPath = path.resolve(folderPath);
    const approvedAt = deps.approvedSelections.get(resolvedPath);
    deps.approvedSelections.delete(resolvedPath);
    if (!approvedAt || now() - approvedAt > 60_000) {
      throw new Error("Folder portal must be selected from the native folder picker");
    }
    const portal = await service.add(resolvedPath, name);
    deps.syncWatcher();
    deps.broadcastUpdated();
    deps.log("folder portal granted", { portalId: portal.id, path: portal.path });
    return portal;
  });

  ipc.handle(IPC_CHANNELS.PORTALS_REMOVE, (event, portalId: unknown): void => {
    assertTrustedSender(event, ["#/settings", "#/overlay"]);
    const service = deps.getService();
    if (!service || typeof portalId !== "string" || portalId.length < 8 || portalId.length > 80) {
      throw new Error("Invalid folder portal id");
    }
    service.remove(portalId);
    deps.syncWatcher();
    deps.broadcastUpdated();
    deps.log("folder portal revoked", { portalId });
  });

  ipc.handle(IPC_CHANNELS.PORTALS_GET_RESOURCES, async (event, portalId: unknown): Promise<PortalResource[]> => {
    assertTrustedSender(event, ["#/settings", "#/overlay"]);
    const service = deps.getService();
    if (!service || typeof portalId !== "string" || portalId.length < 8 || portalId.length > 80) {
      throw new Error("Invalid folder portal id");
    }
    return service.getResources(portalId);
  });

  ipc.handle(IPC_CHANNELS.PORTALS_OPEN_RESOURCE, async (event, portalId: unknown, relativePath: unknown): Promise<void> => {
    assertTrustedSender(event, ["#/settings", "#/overlay"]);
    const service = deps.getService();
    if (!service || typeof portalId !== "string" || typeof relativePath !== "string") {
      throw new Error("Invalid folder portal resource");
    }
    const result = await shell.openPath(await service.resolveResourcePath(portalId, relativePath));
    if (result) throw new Error(result);
  });
}

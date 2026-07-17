import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { ContainerWithFiles, DatabaseStatus, DesktopFileRecord, DesktopStatus, FilePreviewData, LayoutRecord, ScanResult } from "../../shared/types.js";
import { isContainerAccent, type ContainerAccent } from "../../shared/container-accents.js";

type TrustedSenderGuard = (event: IpcMainInvokeEvent, routes?: string[]) => void;

export interface DesktopIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: TrustedSenderGuard;
  getDesktopController: () => { getStatus(): DesktopStatus; activate(): Promise<DesktopStatus>; deactivate(): Promise<DesktopStatus> } | null;
  getFileScanner: () => { scanDesktop(): Promise<ScanResult> } | null;
  getDatabase: () => { getStatus(): DatabaseStatus; getDesktopFileById(id: number): DesktopFileRecord | null; getContainers(): unknown[]; getLayouts(): LayoutRecord[]; moveFileToContainer(fileId: number, containerId: number): void; renameFileAlias(fileId: number, displayName: string): void; hideFile(fileId: number): void; updateContainerPosition(id: number, x: number, y: number, width: number, height: number, isCollapsed?: boolean): void; updateContainerAccent(id: number, accent: ContainerAccent): void; applyLayout(layoutId: number): void } | null;
  getContainersWithIcons: () => Promise<ContainerWithFiles[]>;
  readFilePreview: (fileId: number) => Promise<FilePreviewData>;
  updateDesktopStatus: (mode: DesktopStatus["mode"]) => DesktopStatus;
  createOverlayWindow: (safeMode: boolean) => void;
  closeOverlayWindow: () => void;
  showMainWindow: () => void;
  hideMainWindow: () => void;
  enterCleanDesktop: () => Promise<DesktopStatus>;
  exitCleanDesktop: () => Promise<DesktopStatus>;
  broadcastDesktopFiles: () => void;
}

export function registerDesktopIpcHandlers(deps: DesktopIpcDependencies): void {
  const { ipc, assertTrustedSender, getDatabase } = deps;

  ipc.handle(IPC_CHANNELS.DESKTOP_STATUS, (event): DesktopStatus => {
    assertTrustedSender(event, ["", "#/overlay"]);
    return deps.getDesktopController()?.getStatus() ?? deps.updateDesktopStatus("idle");
  });

  ipc.handle(IPC_CHANNELS.DESKTOP_ACTIVATE, async (event): Promise<DesktopStatus> => {
    assertTrustedSender(event);
    const status = (await deps.getDesktopController()?.activate()) ?? deps.updateDesktopStatus("safe-mode");
    deps.createOverlayWindow(status.mode === "safe-mode");
    deps.hideMainWindow();
    return status;
  });

  ipc.handle(IPC_CHANNELS.DESKTOP_DEACTIVATE, async (event): Promise<DesktopStatus> => {
    assertTrustedSender(event, ["", "#/settings"]);
    const status = (await deps.getDesktopController()?.deactivate()) ?? deps.updateDesktopStatus("idle");
    deps.closeOverlayWindow();
    deps.showMainWindow();
    return status;
  });

  ipc.handle(IPC_CHANNELS.DESKTOP_ENTER_CLEAN, async (event): Promise<DesktopStatus> => {
    assertTrustedSender(event);
    return deps.enterCleanDesktop();
  });

  ipc.handle(IPC_CHANNELS.DESKTOP_EXIT_CLEAN, async (event): Promise<DesktopStatus> => {
    assertTrustedSender(event);
    return deps.exitCleanDesktop();
  });

  ipc.handle(IPC_CHANNELS.DESKTOP_SCAN, async (event) => {
    assertTrustedSender(event, ["", "#/overlay"]);
    const scanner = deps.getFileScanner();
    if (!scanner) throw new Error("File scanner is not initialized");
    return scanner.scanDesktop();
  });

  ipc.handle(IPC_CHANNELS.DESKTOP_GET_FILES, async (event) => {
    assertTrustedSender(event, ["", "#/overlay"]);
    return deps.getContainersWithIcons();
  });

  ipc.handle(IPC_CHANNELS.DESKTOP_OPEN_FILE, async (event, fileId: unknown) => {
    assertTrustedSender(event, ["", "#/overlay"]);
    if (typeof fileId !== "number" || !Number.isInteger(fileId) || fileId <= 0) throw new Error("Invalid file id");
    const file = getDatabase()?.getDesktopFileById(fileId);
    if (!file) throw new Error("File record was not found");
    const { shell } = await import("electron");
    await shell.openPath(file.fullPath);
  });

  ipc.handle(IPC_CHANNELS.DESKTOP_OPEN_FILE_LOCATION, (event, fileId: unknown) => {
    assertTrustedSender(event, ["", "#/overlay"]);
    if (typeof fileId !== "number" || !Number.isInteger(fileId) || fileId <= 0) throw new Error("Invalid file id");
    const file = getDatabase()?.getDesktopFileById(fileId);
    if (!file) throw new Error("File record was not found");
    import("electron").then(({ shell }) => shell.showItemInFolder(file.fullPath)).catch(() => {});
  });

  ipc.handle(IPC_CHANNELS.DESKTOP_MOVE_FILE, (event, fileId: unknown, containerId: unknown) => {
    assertTrustedSender(event, ["", "#/overlay"]);
    if (typeof fileId !== "number" || !Number.isInteger(fileId) || fileId <= 0) throw new Error("Invalid file id");
    if (typeof containerId !== "number" || !Number.isInteger(containerId) || containerId <= 0) throw new Error("Invalid container id");
    getDatabase()?.moveFileToContainer(fileId, containerId);
    deps.broadcastDesktopFiles();
  });

  ipc.handle(IPC_CHANNELS.DESKTOP_RENAME_ALIAS, (event, fileId: unknown, displayName: unknown) => {
    assertTrustedSender(event, ["", "#/overlay"]);
    if (typeof fileId !== "number" || !Number.isInteger(fileId) || fileId <= 0) throw new Error("Invalid file id");
    if (typeof displayName !== "string" || displayName.length > 120) throw new Error("Invalid display name");
    getDatabase()?.renameFileAlias(fileId, displayName);
    deps.broadcastDesktopFiles();
  });

  ipc.handle(IPC_CHANNELS.DESKTOP_HIDE_FILE, (event, fileId: unknown) => {
    assertTrustedSender(event, ["", "#/overlay"]);
    if (typeof fileId !== "number" || !Number.isInteger(fileId) || fileId <= 0) throw new Error("Invalid file id");
    getDatabase()?.hideFile(fileId);
    deps.broadcastDesktopFiles();
  });

  ipc.handle(IPC_CHANNELS.DATABASE_STATUS, (event) => {
    assertTrustedSender(event);
    return getDatabase()?.getStatus();
  });

  ipc.handle(IPC_CHANNELS.CONTAINERS_GET_ALL, (event) => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay"]);
    return getDatabase()?.getContainers() ?? [];
  });

  ipc.handle(IPC_CHANNELS.CONTAINERS_UPDATE_POSITION, (event, containerId: unknown, x: unknown, y: unknown, width: unknown, height: unknown, isCollapsed: unknown) => {
    assertTrustedSender(event, ["", "#/overlay"]);
    if (typeof containerId !== "number" || !Number.isInteger(containerId) || containerId <= 0) throw new Error("Invalid container id");
    if (typeof x !== "number" || !Number.isFinite(x)) throw new Error("Invalid x");
    if (typeof y !== "number" || !Number.isFinite(y)) throw new Error("Invalid y");
    if (typeof width !== "number" || !Number.isFinite(width)) throw new Error("Invalid width");
    if (typeof height !== "number" || !Number.isFinite(height)) throw new Error("Invalid height");
    getDatabase()?.updateContainerPosition(containerId, x, y, width, height, isCollapsed === true);
  });

  ipc.handle(IPC_CHANNELS.CONTAINERS_UPDATE_ACCENT, (event, containerId: unknown, accentColor: unknown) => {
    assertTrustedSender(event, ["", "#/overlay"]);
    if (typeof containerId !== "number" || !Number.isInteger(containerId) || containerId <= 0) throw new Error("Invalid container id");
    if (!isContainerAccent(accentColor)) throw new Error("Invalid container accent");
    getDatabase()?.updateContainerAccent(containerId, accentColor);
    deps.broadcastDesktopFiles();
  });

  ipc.handle(IPC_CHANNELS.LAYOUTS_GET_ALL, (event) => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay"]);
    return getDatabase()?.getLayouts() ?? [];
  });

  ipc.handle(IPC_CHANNELS.LAYOUTS_APPLY, (event, layoutId: unknown) => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay"]);
    if (typeof layoutId !== "number" || !Number.isInteger(layoutId) || layoutId <= 0) throw new Error("Invalid layout id");
    getDatabase()?.applyLayout(layoutId);
  });

  ipc.handle(IPC_CHANNELS.PREVIEW_FILE, async (event, fileId: unknown): Promise<FilePreviewData> => {
    assertTrustedSender(event, ["", "#/overlay"]);
    if (typeof fileId !== "number" || !Number.isInteger(fileId) || fileId <= 0) throw new Error("Invalid file id");
    return deps.readFilePreview(fileId);
  });
}

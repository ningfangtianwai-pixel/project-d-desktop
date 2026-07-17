import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { WallpaperDisplayInfo } from "../../shared/types.js";

type TrustedSenderGuard = (event: IpcMainInvokeEvent, routes?: string[]) => void;

export interface WallpaperIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: TrustedSenderGuard;
  getDisplays: () => WallpaperDisplayInfo[];
  assignDisplay: (displayId: string, wallpaperId: string | null) => WallpaperDisplayInfo[];
}

export function registerWallpaperIpcHandlers(deps: WallpaperIpcDependencies): void {
  deps.ipc.handle(IPC_CHANNELS.WALLPAPER_DISPLAYS_GET, (event) => {
    deps.assertTrustedSender(event, ["", "#/settings", "#/overlay", "#/wallpaper"]);
    return deps.getDisplays();
  });

  deps.ipc.handle(IPC_CHANNELS.WALLPAPER_DISPLAY_ASSIGN, (event, displayId: unknown, wallpaperId: unknown) => {
    deps.assertTrustedSender(event, ["", "#/settings", "#/overlay"]);
    if (typeof displayId !== "string" || displayId.length > 80) throw new Error("Invalid display id");
    if (wallpaperId !== null && (typeof wallpaperId !== "string" || wallpaperId.length > 80)) {
      throw new Error("Invalid wallpaper id");
    }
    return deps.assignDisplay(displayId, wallpaperId as string | null);
  });
}


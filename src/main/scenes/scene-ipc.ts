import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { SettingsSnapshot, WorkspaceScene } from "../../shared/types.js";
import type { SceneService } from "./scene-service.js";

type TrustedSenderGuard = (event: IpcMainInvokeEvent, routes?: string[]) => void;

export interface SceneIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: TrustedSenderGuard;
  getService: () => SceneService | null;
  getSettings: () => SettingsSnapshot | null;
  applyWallpaper: (wallpaperId: string) => SettingsSnapshot;
  syncWindows: (settings: SettingsSnapshot) => void;
  syncPortalWatcher: () => void;
  broadcastPortals: () => void;
  broadcastSettings: () => void;
  broadcastDesktopFiles: () => void;
  log: (message: string, data: Record<string, unknown>) => void;
}

export function registerSceneIpcHandlers(deps: SceneIpcDependencies): void {
  const { ipc, assertTrustedSender } = deps;

  ipc.handle(IPC_CHANNELS.SCENES_GET_ALL, (event): WorkspaceScene[] => {
    assertTrustedSender(event, ["#/settings", "#/overlay"]);
    return deps.getService()?.list() ?? [];
  });

  ipc.handle(IPC_CHANNELS.SCENES_SAVE, (event, name: unknown): WorkspaceScene => {
    assertTrustedSender(event, ["#/settings", "#/overlay"]);
    const service = deps.getService();
    if (!service || typeof name !== "string" || name.trim().length === 0 || name.length > 40) {
      throw new Error("Invalid scene name");
    }
    const scene = service.save(name);
    deps.log("workspace scene saved", { sceneId: scene.id, name: scene.name });
    return scene;
  });

  ipc.handle(IPC_CHANNELS.SCENES_APPLY, (event, sceneId: unknown): WorkspaceScene => {
    assertTrustedSender(event, ["#/settings", "#/overlay"]);
    const service = deps.getService();
    if (!service || typeof sceneId !== "string" || sceneId.length < 8 || sceneId.length > 80) {
      throw new Error("Invalid scene id");
    }
    const scene = service.apply(sceneId);
    deps.syncPortalWatcher();
    deps.broadcastPortals();
    if ((scene.wallpaperDynamic ?? Boolean(scene.wallpaperId)) && scene.wallpaperId) {
      deps.applyWallpaper(scene.wallpaperId);
    } else {
      const settings = deps.getSettings();
      if (settings) deps.syncWindows(settings);
    }
    deps.broadcastSettings();
    deps.broadcastDesktopFiles();
    deps.log("workspace scene applied", { sceneId: scene.id, name: scene.name });
    return scene;
  });
}

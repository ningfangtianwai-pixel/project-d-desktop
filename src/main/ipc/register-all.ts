import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { registerDesktopIpcHandlers, type DesktopIpcDependencies } from "./desktop-ipc.js";
import { registerSettingsIpcHandlers, type SettingsIpcDependencies } from "./settings-ipc.js";
import { registerWindowIpcHandlers, type WindowIpcDependencies } from "./window-ipc.js";
import { registerPetIpcHandlers, type PetIpcDependencies } from "./pet-ipc.js";
import { registerSuggestionIpcHandlers, type SuggestionIpcDependencies } from "./suggestion-ipc.js";
import { registerActionIpcHandlers, type ActionIpcDependencies } from "../actions/action-ipc.js";
import { registerSearchIpcHandlers, type SearchIpcDependencies } from "../search/search-ipc.js";
import { registerSceneIpcHandlers, type SceneIpcDependencies } from "../scenes/scene-ipc.js";
import { registerPortalIpcHandlers, type PortalIpcDependencies } from "../portals/portal-ipc.js";
import { registerPrivacyIpcHandlers, type PrivacyIpcDependencies } from "./privacy-ipc.js";
import { registerShortcutIpcHandlers, type ShortcutIpcDependencies } from "./shortcut-ipc.js";
import { registerAutoRulesIpcHandlers, type AutoRulesIpcDependencies } from "../auto-rules/auto-rules-ipc.js";
import { registerRecoveryIpcHandlers, type RecoveryIpcDependencies } from "./recovery-ipc.js";
import { registerUpdateIpcHandlers, type UpdateIpcDependencies } from "./update-ipc.js";
import { registerRuntimeIpcHandlers, type RuntimeIpcDependencies } from "./runtime-ipc.js";
import { registerWallpaperIpcHandlers, type WallpaperIpcDependencies } from "./wallpaper-ipc.js";

type HandlerDependencies<T> = Omit<T, "ipc" | "assertTrustedSender">;

export interface ServiceDeps {
  assertTrustedSender: (event: IpcMainInvokeEvent, allowedHashes?: readonly string[]) => void;
  desktop: HandlerDependencies<DesktopIpcDependencies>;
  settings: HandlerDependencies<SettingsIpcDependencies>;
  window: HandlerDependencies<WindowIpcDependencies>;
  pet: HandlerDependencies<PetIpcDependencies>;
  suggestions: HandlerDependencies<SuggestionIpcDependencies>;
  actions: HandlerDependencies<ActionIpcDependencies>;
  search: HandlerDependencies<SearchIpcDependencies>;
  scenes: HandlerDependencies<SceneIpcDependencies>;
  portals: HandlerDependencies<PortalIpcDependencies>;
  privacy: HandlerDependencies<PrivacyIpcDependencies>;
  recovery: HandlerDependencies<RecoveryIpcDependencies>;
  shortcuts: HandlerDependencies<ShortcutIpcDependencies>;
  autoRules: HandlerDependencies<AutoRulesIpcDependencies>;
  updates: HandlerDependencies<UpdateIpcDependencies>;
  runtime: HandlerDependencies<RuntimeIpcDependencies>;
  wallpaper: HandlerDependencies<WallpaperIpcDependencies>;
}

export function registerAllIpcHandlers(deps: ServiceDeps): void {
  const assertTrustedSender = deps.assertTrustedSender;
  registerDesktopIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.desktop });
  registerSettingsIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.settings });
  registerWindowIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.window });
  registerPetIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.pet });
  registerSuggestionIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.suggestions });
  registerActionIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.actions });
  registerSearchIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.search });
  registerSceneIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.scenes });
  registerPortalIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.portals });
  registerPrivacyIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.privacy });
  registerRecoveryIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.recovery });
  registerShortcutIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.shortcuts });
  registerAutoRulesIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.autoRules });
  registerUpdateIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.updates });
  registerRuntimeIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.runtime });
  registerWallpaperIpcHandlers({ ipc: ipcMain, assertTrustedSender, ...deps.wallpaper });
}

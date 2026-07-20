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
import { createIpcHandlerRegistry } from "./handler-registry.js";

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

export function registerAllIpcHandlers(deps: ServiceDeps): () => void {
  const assertTrustedSender = deps.assertTrustedSender;
  const registry = createIpcHandlerRegistry(ipcMain);
  const ipc = registry.ipc;
  try {
    registerDesktopIpcHandlers({ ipc, assertTrustedSender, ...deps.desktop });
    registerSettingsIpcHandlers({ ipc, assertTrustedSender, ...deps.settings });
    registerWindowIpcHandlers({ ipc, assertTrustedSender, ...deps.window });
    registerPetIpcHandlers({ ipc, assertTrustedSender, ...deps.pet });
    registerSuggestionIpcHandlers({ ipc, assertTrustedSender, ...deps.suggestions });
    registerActionIpcHandlers({ ipc, assertTrustedSender, ...deps.actions });
    registerSearchIpcHandlers({ ipc, assertTrustedSender, ...deps.search });
    registerSceneIpcHandlers({ ipc, assertTrustedSender, ...deps.scenes });
    registerPortalIpcHandlers({ ipc, assertTrustedSender, ...deps.portals });
    registerPrivacyIpcHandlers({ ipc, assertTrustedSender, ...deps.privacy });
    registerRecoveryIpcHandlers({ ipc, assertTrustedSender, ...deps.recovery });
    registerShortcutIpcHandlers({ ipc, assertTrustedSender, ...deps.shortcuts });
    registerAutoRulesIpcHandlers({ ipc, assertTrustedSender, ...deps.autoRules });
    registerUpdateIpcHandlers({ ipc, assertTrustedSender, ...deps.updates });
    registerRuntimeIpcHandlers({ ipc, assertTrustedSender, ...deps.runtime });
    registerWallpaperIpcHandlers({ ipc, assertTrustedSender, ...deps.wallpaper });
    return registry.dispose;
  } catch (error) {
    registry.dispose();
    throw error;
  }
}

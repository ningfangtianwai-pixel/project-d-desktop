import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { registerDesktopIpcHandlers } from "./desktop-ipc.js";
import { registerSettingsIpcHandlers } from "./settings-ipc.js";
import { registerWindowIpcHandlers } from "./window-ipc.js";
import { registerPetIpcHandlers } from "./pet-ipc.js";
import { registerSuggestionIpcHandlers } from "./suggestion-ipc.js";
import { registerActionIpcHandlers } from "../actions/action-ipc.js";
import { registerSearchIpcHandlers } from "../search/search-ipc.js";
import { registerSceneIpcHandlers } from "../scenes/scene-ipc.js";
import { registerPortalIpcHandlers } from "../portals/portal-ipc.js";
import { registerPrivacyIpcHandlers } from "./privacy-ipc.js";
import { registerShortcutIpcHandlers } from "./shortcut-ipc.js";
import { registerAutoRulesIpcHandlers } from "../auto-rules/auto-rules-ipc.js";
import { registerRecoveryIpcHandlers } from "./recovery-ipc.js";
import { registerUpdateIpcHandlers } from "./update-ipc.js";
import { registerRuntimeIpcHandlers } from "./runtime-ipc.js";
import { registerWallpaperIpcHandlers } from "./wallpaper-ipc.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ServiceDeps {
  assertTrustedSender: (event: IpcMainInvokeEvent, allowedHashes?: readonly string[]) => void;
  showMain: () => void;
  showMainFocus: () => void;
  createSettings: () => void;
  openLogs: () => Promise<void>;
  desktopCtrl: any;
  fileScanner: any;
  database: any;
  getContainersIcons: () => Promise<any>;
  readFilePreview: (fileId: number) => Promise<any>;
  updateStatus: (mode: string) => any;
  createOverlay: (safe: boolean) => void;
  closeOverlay: () => void;
  hideMain: () => void;
  enterClean: () => Promise<any>;
  exitClean: () => Promise<any>;
  broadcastFiles: () => void;
  getWeather: () => Promise<any>;
  wallpaperList: () => any[];
  applyWallpaper: (id: string) => any;
  broadcastSettings: () => void;
  syncWindows: (settings: any) => void;
  aiService: any;
  currentPetBounds: () => any;
  movePet: (dx: number, dy: number) => any;
  resetPet: () => any;
  setPetInteract: (active: boolean) => void;
  showPetMenu: () => void;
  showPet: () => void;
  hidePet: () => void;
  getPetSettings: () => any;
  setOnboardingActive: (active: boolean) => void;
  latestSuggestion: () => any;
  suggestionControls: () => any;
  serializeOp: (op: () => Promise<any>) => Promise<any>;
  dismissSuggestion: (id: string) => Promise<void>;
  snoozeSuggestions: (min: number) => Promise<void>;
  setSuggestionEnabled: (on: boolean) => Promise<void>;
  updateSuggestionPolicy: (p: any) => Promise<any>;
  diagnosticsReport: () => any;
  exportDiagnostics: (sel: any) => Promise<any>;
  actionEngine: any;
  interruptedRecoveries: () => any[];
  searchService: any;
  presentResult: (r: any) => any;
  resolvePath: (id: string) => Promise<string>;
  pinToScene?: (resultId: string, sceneId: string) => Promise<void>;
  authorizePortal?: (resultId: string) => Promise<any>;
  sceneService: any;
  portalService: any;
  portalWatcher: any;
  syncPortals: () => void;
  approvedSelections: Map<string, number>;
  broadcastPortals: () => void;
  saveSuggestion: (s: any) => void;
  appInfo: () => any;
  logger: any;
  rescan: () => Promise<void>;
  exportData: () => Promise<{ cancelled: boolean; filename: string | null }>;
  resetData: () => Promise<void>;
  getPrivacyNetworkState: () => any;
  setPrivacyNetworkPaused: (paused: boolean) => any;
  getRecoverySystemStatus: () => Promise<any>;
  setPeekShortcut: (accelerator: unknown) => Promise<{ success: boolean; accelerator: string }>;
  updateService: any;
  getRuntimeState: () => any;
  setRuntimeManualPaused: (paused: boolean) => any;
  getRuntimeMetrics: () => any;
  getWallpaperDisplays: () => any[];
  assignWallpaperToDisplay: (displayId: string, wallpaperId: string | null) => any[];
}

export function registerAllIpcHandlers(deps: ServiceDeps): void {
  const assertTrustedSender = deps.assertTrustedSender;
  /* Desktop */
  registerDesktopIpcHandlers({
    ipc: ipcMain, assertTrustedSender,
    getDesktopController: () => deps.desktopCtrl,
    getFileScanner: () => deps.fileScanner,
    getDatabase: () => deps.database,
    getContainersWithIcons: deps.getContainersIcons,
    readFilePreview: deps.readFilePreview,
    updateDesktopStatus: deps.updateStatus,
    createOverlayWindow: deps.createOverlay,
    closeOverlayWindow: deps.closeOverlay,
    showMainWindow: deps.showMain,
    hideMainWindow: deps.hideMain,
    enterCleanDesktop: deps.enterClean,
    exitCleanDesktop: deps.exitClean,
    broadcastDesktopFiles: deps.broadcastFiles
  });

  /* Settings */
  registerSettingsIpcHandlers({
    ipc: ipcMain, assertTrustedSender,
    getDatabase: () => deps.database,
    getWeather: deps.getWeather,
    getWallpaperLibrary: deps.wallpaperList,
    applyWallpaper: deps.applyWallpaper,
    broadcastSettings: deps.broadcastSettings,
    syncWindows: deps.syncWindows,
    validateSettingsPatch: deps.database?.validateSettingsPatch || ((p: any) => p),
    tryAiReply: deps.aiService?.tryProviderReply?.bind(deps.aiService) ?? (async () => null),
    createLocalAiReply: deps.aiService?.createLocalReply?.bind(deps.aiService) ?? (() => ""),
    sendChatMessage: deps.aiService?.sendMessage?.bind(deps.aiService) ?? (async () => { throw new Error("AI service is unavailable"); })
  });

  /* Window */
  registerWindowIpcHandlers({
    ipc: ipcMain, assertTrustedSender,
    getAppInfo: deps.appInfo,
    showMainWindow: deps.showMain,
    showMainWindowAndFocusSearch: deps.showMainFocus,
    createSettingsWindow: deps.createSettings,
    openLogs: deps.openLogs
  });

  /* Pet */
  registerPetIpcHandlers({
    ipc: ipcMain, assertTrustedSender,
    getPetBounds: deps.currentPetBounds,
    movePet: deps.movePet,
    resetPet: deps.resetPet,
    setPetInteractive: deps.setPetInteract,
    showPetMenu: deps.showPetMenu,
    showPet: deps.showPet,
    hidePet: deps.hidePet,
    getSettings: deps.getPetSettings,
    setOnboardingActive: deps.setOnboardingActive
  });

  /* Suggestions */
  registerSuggestionIpcHandlers({
    ipc: ipcMain, assertTrustedSender,
    getLatestSuggestion: deps.latestSuggestion,
    getSuggestionControls: deps.suggestionControls,
    serializeOp: deps.serializeOp,
    dismissSuggestion: deps.dismissSuggestion,
    snoozeSuggestions: deps.snoozeSuggestions,
    setSuggestionEnabled: deps.setSuggestionEnabled,
    updateSuggestionPolicy: deps.updateSuggestionPolicy,
    getDiagnosticsReport: deps.diagnosticsReport,
    exportDiagnostics: deps.exportDiagnostics
  });

  /* Action */
  registerActionIpcHandlers({
    ipc: ipcMain, assertTrustedSender,
    getEngine: () => deps.actionEngine,
    getDesktopFiles: () => deps.database?.getDesktopFiles?.() ?? [],
    getLatestSuggestion: deps.latestSuggestion,
    saveLatestSuggestion: deps.saveSuggestion,
    isPlanAvailable: () => Boolean(deps.database),
    isRescanAvailable: () => Boolean(deps.fileScanner),
    rescanDesktop: deps.rescan,
    broadcastDesktopFiles: deps.broadcastFiles,
    getInterruptedRecoveries: deps.interruptedRecoveries
  });

  /* Search */
  registerSearchIpcHandlers({
    ipc: ipcMain, assertTrustedSender,
    getService: () => deps.searchService,
    presentResult: deps.presentResult,
    resolveResultPath: deps.resolvePath,
    pinToScene: deps.pinToScene ?? (async () => { throw new Error("Scene pinning is unavailable"); }),
    authorizePortal: deps.authorizePortal ?? (async () => { throw new Error("Portal action is unavailable"); })
  });

  /* Scene */
  registerSceneIpcHandlers({
    ipc: ipcMain, assertTrustedSender,
    getService: () => deps.sceneService,
    getSettings: () => deps.database?.getSettings?.() ?? null,
    applyWallpaper: deps.applyWallpaper,
    syncWindows: deps.syncWindows,
    syncPortalWatcher: deps.syncPortals,
    broadcastPortals: deps.broadcastPortals,
    broadcastSettings: deps.broadcastSettings,
    broadcastDesktopFiles: deps.broadcastFiles,
    log: (msg: string, data: any) => deps.logger?.info?.("app", msg, data)
  });

  /* Portal */
  registerPortalIpcHandlers({
    ipc: ipcMain, assertTrustedSender,
    getService: () => deps.portalService,
    approvedSelections: deps.approvedSelections || new Map(),
    syncWatcher: deps.syncPortals,
    broadcastUpdated: deps.broadcastPortals,
    log: (msg: string, data: any) => deps.logger?.info?.("app", msg, data)
  });

  registerPrivacyIpcHandlers({
    ipc: ipcMain,
    assertTrustedSender,
    exportData: deps.exportData,
    resetData: deps.resetData,
    getNetworkState: deps.getPrivacyNetworkState,
    setNetworkPaused: deps.setPrivacyNetworkPaused
  });

  registerRecoveryIpcHandlers({
    ipc: ipcMain,
    assertTrustedSender,
    getSystemStatus: deps.getRecoverySystemStatus
  });

  registerShortcutIpcHandlers({
    ipc: ipcMain,
    assertTrustedSender,
    setPeekShortcut: deps.setPeekShortcut
  });

  registerAutoRulesIpcHandlers({
    ipc: ipcMain,
    assertTrustedSender,
    getStore: () => deps.database
  });

  registerUpdateIpcHandlers({
    ipc: ipcMain,
    assertTrustedSender,
    getStatus: () => deps.updateService.getStatus(),
    setChannel: (channel) => deps.updateService.setChannel(channel),
    checkForUpdates: () => deps.updateService.checkForUpdates(),
    downloadUpdate: () => deps.updateService.downloadUpdate(),
    installDownloadedUpdate: () => deps.updateService.installDownloadedUpdate()
  });

  registerRuntimeIpcHandlers({
    ipc: ipcMain,
    assertTrustedSender,
    getState: deps.getRuntimeState,
    setManualPaused: deps.setRuntimeManualPaused,
    getMetrics: deps.getRuntimeMetrics
  });

  registerWallpaperIpcHandlers({
    ipc: ipcMain,
    assertTrustedSender,
    getDisplays: deps.getWallpaperDisplays,
    assignDisplay: deps.assignWallpaperToDisplay
  });
}

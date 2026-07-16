import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type MenuCommand } from "../shared/ipc.js";
import type { ProjectDApi } from "../shared/types.js";

const api: ProjectDApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_INFO),
  showMain: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SHOW_MAIN),
  setOnboardingActive: (active) => ipcRenderer.invoke(IPC_CHANNELS.ONBOARDING_SET_ACTIVE, active),
  getDesktopStatus: () => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_STATUS),
  activateDesktop: () => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_ACTIVATE),
  deactivateDesktop: () => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_DEACTIVATE),
  enterCleanDesktop: () => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_ENTER_CLEAN),
  exitCleanDesktop: () => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_EXIT_CLEAN),
  scanDesktop: () => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_SCAN),
  getDesktopFiles: () => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_GET_FILES),
  openFile: (fileId) => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_OPEN_FILE, fileId),
  openFileLocation: (fileId) => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_OPEN_FILE_LOCATION, fileId),
  moveFileToContainer: (fileId, containerId) => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_MOVE_FILE, fileId, containerId),
  renameFileAlias: (fileId, displayName) => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_RENAME_ALIAS, fileId, displayName),
  hideFile: (fileId) => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_HIDE_FILE, fileId),
  createDesktopInboxPlan: () => ipcRenderer.invoke(IPC_CHANNELS.ACTION_PLAN_INBOX),
  executeActionPlan: (planId) => ipcRenderer.invoke(IPC_CHANNELS.ACTION_EXECUTE, planId),
  undoActionExecution: (executionId) => ipcRenderer.invoke(IPC_CHANNELS.ACTION_UNDO, executionId),
  resumeActionExecution: (executionId) => ipcRenderer.invoke(IPC_CHANNELS.ACTION_RESUME, executionId),
  rollbackActionExecution: (executionId) => ipcRenderer.invoke(IPC_CHANNELS.ACTION_ROLLBACK, executionId),
  getActionHistory: () => ipcRenderer.invoke(IPC_CHANNELS.ACTION_HISTORY),
  getInterruptedActionRecoveries: () => ipcRenderer.invoke(IPC_CHANNELS.ACTIONS_GET_INTERRUPTED),
  getAutoRules: () => ipcRenderer.invoke(IPC_CHANNELS.AUTO_RULES_GET),
  saveAutoRule: (rule) => ipcRenderer.invoke(IPC_CHANNELS.AUTO_RULES_SAVE, rule),
  deleteAutoRule: (ruleId) => ipcRenderer.invoke(IPC_CHANNELS.AUTO_RULES_DELETE, ruleId),
  previewAutoRules: () => ipcRenderer.invoke(IPC_CHANNELS.AUTO_RULES_PREVIEW),
  searchWorkspace: (query, limit) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_QUERY, query, limit),
  openWorkspaceSearchResult: (resultId) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_OPEN_RESULT, resultId),
  revealWorkspaceSearchResult: (resultId) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_REVEAL_RESULT, resultId),
  copyWorkspaceSearchResultPath: (resultId) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_COPY_PATH, resultId),
  pinSearchResultToScene: (resultId, sceneId) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_PIN_TO_SCENE, resultId, sceneId),
  addSearchResultToPortal: (resultId) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_ADD_TO_PORTAL, resultId),
  resolveSearchResultPath: (resultId) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_RESOLVE_PATH, resultId),
  getLatestSuggestion: () => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_GET_LATEST),
  dismissSuggestion: (suggestionId) => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_DISMISS, suggestionId),
  getSuggestionDeliveryControls: () => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_GET_CONTROLS),
  snoozeSuggestions: (minutes) => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_SNOOZE, minutes),
  setSuggestionsEnabled: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_SET_ENABLED, enabled),
  updateSuggestionPolicy: (policy) => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_UPDATE_POLICY, policy),
  getDiagnosticsReport: () => ipcRenderer.invoke(IPC_CHANNELS.DIAGNOSTICS_GET_REPORT),
  exportDiagnosticsReport: (selection) => ipcRenderer.invoke(IPC_CHANNELS.DIAGNOSTICS_EXPORT_REPORT, selection),
  getWorkspaceScenes: () => ipcRenderer.invoke(IPC_CHANNELS.SCENES_GET_ALL),
  saveWorkspaceScene: (name) => ipcRenderer.invoke(IPC_CHANNELS.SCENES_SAVE, name),
  applyWorkspaceScene: (sceneId) => ipcRenderer.invoke(IPC_CHANNELS.SCENES_APPLY, sceneId),
  chooseFolderPortal: () => ipcRenderer.invoke(IPC_CHANNELS.PORTALS_CHOOSE_FOLDER),
  addFolderPortal: (folderPath, name) => ipcRenderer.invoke(IPC_CHANNELS.PORTALS_ADD, folderPath, name),
  removeFolderPortal: (portalId) => ipcRenderer.invoke(IPC_CHANNELS.PORTALS_REMOVE, portalId),
  getFolderPortals: () => ipcRenderer.invoke(IPC_CHANNELS.PORTALS_GET_ALL),
  getFolderPortalResources: (portalId) => ipcRenderer.invoke(IPC_CHANNELS.PORTALS_GET_RESOURCES, portalId),
  openFolderPortalResource: (portalId, relativePath) => ipcRenderer.invoke(IPC_CHANNELS.PORTALS_OPEN_RESOURCE, portalId, relativePath),
  getDatabaseStatus: () => ipcRenderer.invoke(IPC_CHANNELS.DATABASE_STATUS),
  getContainers: () => ipcRenderer.invoke(IPC_CHANNELS.CONTAINERS_GET_ALL),
  updateContainerPosition: (containerId, x, y, width, height, isCollapsed) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTAINERS_UPDATE_POSITION, containerId, x, y, width, height, isCollapsed),
  updateContainerAccent: (containerId, accentColor) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTAINERS_UPDATE_ACCENT, containerId, accentColor),
  getLayouts: () => ipcRenderer.invoke(IPC_CHANNELS.LAYOUTS_GET_ALL),
  applyLayout: (layoutId) => ipcRenderer.invoke(IPC_CHANNELS.LAYOUTS_APPLY, layoutId),
  getFilePreview: (fileId) => ipcRenderer.invoke(IPC_CHANNELS.PREVIEW_FILE, fileId),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
  updateSettings: (patch) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, patch),
  getWallpaperLibrary: () => ipcRenderer.invoke(IPC_CHANNELS.WALLPAPER_LIBRARY_GET),
  applyWallpaper: (wallpaperId) => ipcRenderer.invoke(IPC_CHANNELS.WALLPAPER_APPLY, wallpaperId),
  getCurrentWeather: () => ipcRenderer.invoke(IPC_CHANNELS.WEATHER_GET_CURRENT),
  sendChatMessage: (content) => ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT_SEND, content),
  getChatHistory: () => ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT_HISTORY),
  clearChatHistory: () => ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT_CLEAR),
  exportAllData: () => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_EXPORT_DATA),
  resetAllData: () => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_RESET_ALL),
  getPrivacyNetworkState: () => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_GET_NETWORK_STATE),
  setPrivacyNetworkPaused: (paused) => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_SET_NETWORK_PAUSED, paused),
  getRecoverySystemStatus: () => ipcRenderer.invoke(IPC_CHANNELS.RECOVERY_GET_SYSTEM_STATUS),
  getState: (key) => ipcRenderer.invoke(IPC_CHANNELS.STATE_GET, key),
  setState: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.STATE_SET, key, value),
  getPetWindowBounds: () => ipcRenderer.invoke(IPC_CHANNELS.PET_GET_WINDOW_BOUNDS),
  movePetWindow: (deltaX, deltaY) => ipcRenderer.invoke(IPC_CHANNELS.PET_MOVE_WINDOW, deltaX, deltaY),
  resetPetWindow: () => ipcRenderer.invoke(IPC_CHANNELS.PET_RESET_WINDOW),
  setPetInteractive: (interactive) => ipcRenderer.invoke(IPC_CHANNELS.PET_SET_INTERACTIVE, interactive),
  showPetContextMenu: () => ipcRenderer.invoke(IPC_CHANNELS.PET_CONTEXT_MENU),
  showPet: () => ipcRenderer.invoke(IPC_CHANNELS.PET_SHOW),
  hidePet: () => ipcRenderer.invoke(IPC_CHANNELS.PET_HIDE),
  openLogs: () => ipcRenderer.invoke(IPC_CHANNELS.LOGS_OPEN),
  openSettings: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_OPEN_SETTINGS),
  setPeekShortcut: (accelerator: string) => ipcRenderer.invoke(IPC_CHANNELS.SHORTCUT_SET_PEEK, accelerator),
  getUpdateStatus: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_GET_STATUS),
  setUpdateChannel: (channel) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SET_CHANNEL, channel),
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK),
  downloadUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_DOWNLOAD),
  installDownloadedUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INSTALL),
  onMenuCommand: (handler) => {
    const listener = (_event: Electron.IpcRendererEvent, command: MenuCommand) => {
      handler(command);
    };

    ipcRenderer.on(IPC_CHANNELS.MENU_COMMAND, listener);

    return () => {
      ipcRenderer.off(IPC_CHANNELS.MENU_COMMAND, listener);
    };
  },
  onDesktopFilesUpdated: (handler) => {
    const listener = () => {
      handler();
    };

    ipcRenderer.on(IPC_CHANNELS.DESKTOP_FILES_UPDATED, listener);

    return () => {
      ipcRenderer.off(IPC_CHANNELS.DESKTOP_FILES_UPDATED, listener);
    };
  },
  onPortalsUpdated: (handler) => {
    const listener = () => {
      handler();
    };

    ipcRenderer.on(IPC_CHANNELS.PORTALS_UPDATED, listener);
    return () => {
      ipcRenderer.off(IPC_CHANNELS.PORTALS_UPDATED, listener);
    };
  },
  onSuggestionCreated: (handler) => {
    const listener = (_event: Electron.IpcRendererEvent, suggestion: Parameters<typeof handler>[0]) => {
      handler(suggestion);
    };

    ipcRenderer.on(IPC_CHANNELS.SUGGESTIONS_CREATED, listener);
    return () => {
      ipcRenderer.off(IPC_CHANNELS.SUGGESTIONS_CREATED, listener);
    };
  },
  onFocusWorkspaceSearch: (handler) => {
    const listener = () => {
      handler();
    };

    ipcRenderer.on(IPC_CHANNELS.WINDOW_FOCUS_SEARCH, listener);
    return () => {
      ipcRenderer.off(IPC_CHANNELS.WINDOW_FOCUS_SEARCH, listener);
    };
  },
  onSettingsUpdated: (handler) => {
    const listener = () => {
      handler();
    };

    ipcRenderer.on(IPC_CHANNELS.SETTINGS_UPDATED, listener);

    return () => {
      ipcRenderer.off(IPC_CHANNELS.SETTINGS_UPDATED, listener);
    };
  },
  onUpdateStatusChanged: (handler) => {
    const listener = (_event: Electron.IpcRendererEvent, status: Parameters<typeof handler>[0]) => {
      handler(status);
    };
    ipcRenderer.on(IPC_CHANNELS.UPDATE_STATUS_CHANGED, listener);
    return () => {
      ipcRenderer.off(IPC_CHANNELS.UPDATE_STATUS_CHANGED, listener);
    };
  }
};

contextBridge.exposeInMainWorld("projectD", api);

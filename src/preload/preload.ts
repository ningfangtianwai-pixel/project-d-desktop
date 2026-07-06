import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type MenuCommand } from "../shared/ipc.js";
import type { ProjectDApi } from "../shared/types.js";

const api: ProjectDApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_INFO),
  showMain: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SHOW_MAIN),
  getDesktopStatus: () => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_STATUS),
  activateDesktop: () => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_ACTIVATE),
  deactivateDesktop: () => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_DEACTIVATE),
  scanDesktop: () => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_SCAN),
  getDesktopFiles: () => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_GET_FILES),
  openFile: (fileId) => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_OPEN_FILE, fileId),
  openFileLocation: (fileId) => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_OPEN_FILE_LOCATION, fileId),
  moveFileToContainer: (fileId, containerId) => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_MOVE_FILE, fileId, containerId),
  renameFileAlias: (fileId, displayName) => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_RENAME_ALIAS, fileId, displayName),
  hideFile: (fileId) => ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_HIDE_FILE, fileId),
  getDatabaseStatus: () => ipcRenderer.invoke(IPC_CHANNELS.DATABASE_STATUS),
  getContainers: () => ipcRenderer.invoke(IPC_CHANNELS.CONTAINERS_GET_ALL),
  updateContainerPosition: (containerId, x, y, width, height) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTAINERS_UPDATE_POSITION, containerId, x, y, width, height),
  getLayouts: () => ipcRenderer.invoke(IPC_CHANNELS.LAYOUTS_GET_ALL),
  applyLayout: (layoutId) => ipcRenderer.invoke(IPC_CHANNELS.LAYOUTS_APPLY, layoutId),
  getFilePreview: (fileId) => ipcRenderer.invoke(IPC_CHANNELS.PREVIEW_FILE, fileId),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
  updateSettings: (patch) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, patch),
  getCurrentWeather: () => ipcRenderer.invoke(IPC_CHANNELS.WEATHER_GET_CURRENT),
  sendChatMessage: (content) => ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT_SEND, content),
  getChatHistory: () => ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT_HISTORY),
  getState: (key) => ipcRenderer.invoke(IPC_CHANNELS.STATE_GET, key),
  setState: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.STATE_SET, key, value),
  getPetWindowBounds: () => ipcRenderer.invoke(IPC_CHANNELS.PET_GET_WINDOW_BOUNDS),
  movePetWindow: (deltaX, deltaY) => ipcRenderer.invoke(IPC_CHANNELS.PET_MOVE_WINDOW, deltaX, deltaY),
  resetPetWindow: () => ipcRenderer.invoke(IPC_CHANNELS.PET_RESET_WINDOW),
  showPet: () => ipcRenderer.invoke(IPC_CHANNELS.PET_SHOW),
  hidePet: () => ipcRenderer.invoke(IPC_CHANNELS.PET_HIDE),
  openLogs: () => ipcRenderer.invoke(IPC_CHANNELS.LOGS_OPEN),
  openSettings: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_OPEN_SETTINGS),
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
  }
};

contextBridge.exposeInMainWorld("projectD", api);

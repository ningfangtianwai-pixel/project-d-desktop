import type { MenuCommand } from "./ipc.js";

export type DesktopMode = "idle" | "activating" | "active" | "deactivating" | "safe-mode" | "error";

export interface AppInfo {
  name: string;
  version: string;
  platform: NodeJS.Platform;
  isPackaged: boolean;
}

export interface DesktopStatus {
  mode: DesktopMode;
  lastChangedAt: string;
  message?: string;
}

export interface DatabaseStatus {
  path: string;
  initialized: boolean;
  createdNow: boolean;
  containerCount: number;
  layoutCount: number;
}

export interface ContainerRecord {
  id: number;
  name: string;
  icon: string;
  categoryFilter: string[];
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  sortOrder: number;
  isCollapsed: boolean;
  isVisible: boolean;
  layoutGroup: number;
}

export type FileCategory = "program" | "document" | "image" | "media" | "code" | "archive" | "folder" | "design" | "other";

export interface DesktopFileRecord {
  id: number;
  filename: string;
  displayName: string | null;
  fullPath: string;
  extension: string | null;
  category: FileCategory;
  sizeBytes: number;
  modifiedAt: string;
  isShortcut: boolean;
  customCategory: string | null;
  containerId: number | null;
  sortOrder: number;
  isMissing: boolean;
}

export interface ScanResult {
  desktopPath: string;
  scannedAt: string;
  totalEntries: number;
  insertedOrUpdated: number;
  markedMissing: number;
  durationMs: number;
}

export interface ContainerWithFiles extends ContainerRecord {
  files: DesktopFileRecord[];
}

export interface SettingsSnapshot {
  wallpaper: {
    currentStyle: string;
    currentIndex: number;
    borderStyle: string;
    borderColor: string;
    borderWidth: number;
    isDynamic: boolean;
    dynamicId: string | null;
    autoRotate: boolean;
    rotateInterval: number;
  };
  weather: {
    mode: string;
    manualWeather: string;
    city: string | null;
    particleIntensity: number;
    enableBorderInteraction: boolean;
    apiKeyConfigured: boolean;
  };
  pet: {
    characterId: string;
    currentOutfit: string;
    positionX: number;
    positionY: number;
    scale: number;
    isVisible: boolean;
    personality: string;
    autoOutfit: boolean;
    actionInterval: number;
    talkFrequency: string;
  };
  ai: {
    provider: string;
    apiEndpoint: string;
    model: string;
    temperature: number;
    maxTokens: number;
    dailyCount: number;
    dailyLimit: number;
    enabled: boolean;
    apiKeyConfigured: boolean;
  };
}

export interface SettingsPatch {
  wallpaper?: Partial<SettingsSnapshot["wallpaper"]>;
  weather?: Partial<SettingsSnapshot["weather"]> & {
    apiKey?: string | null;
  };
  pet?: Partial<SettingsSnapshot["pet"]>;
  ai?: Partial<SettingsSnapshot["ai"]> & {
    apiKey?: string | null;
  };
  appState?: Record<string, string>;
}

export interface CurrentWeather {
  mode: string;
  condition: string;
  city: string | null;
  temperatureC: number | null;
  humidity: number | null;
  windSpeed: number | null;
  fetchedAt: string;
  source: "manual" | "cache" | "openweathermap" | "open-meteo" | "fallback";
  error?: string;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatResponse {
  message: ChatMessage;
  provider: string;
  fallback: boolean;
}

export interface PetWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutRecord {
  id: number;
  name: string;
  columns: number;
  isActive: boolean;
}

export interface FilePreviewData {
  type: "text" | "image" | "unsupported";
  content: string;
  filename: string;
  sizeLabel: string;
  modifiedAt: string;
}

export interface ProjectDApi {
  getAppInfo: () => Promise<AppInfo>;
  showMain: () => Promise<void>;
  getDesktopStatus: () => Promise<DesktopStatus>;
  activateDesktop: () => Promise<DesktopStatus>;
  deactivateDesktop: () => Promise<DesktopStatus>;
  scanDesktop: () => Promise<ScanResult>;
  getDesktopFiles: () => Promise<ContainerWithFiles[]>;
  openFile: (fileId: number) => Promise<void>;
  openFileLocation: (fileId: number) => Promise<void>;
  moveFileToContainer: (fileId: number, containerId: number) => Promise<void>;
  renameFileAlias: (fileId: number, displayName: string) => Promise<void>;
  hideFile: (fileId: number) => Promise<void>;
  getDatabaseStatus: () => Promise<DatabaseStatus>;
  getContainers: () => Promise<ContainerRecord[]>;
  updateContainerPosition: (containerId: number, x: number, y: number, width: number, height: number) => Promise<void>;
  getLayouts: () => Promise<LayoutRecord[]>;
  applyLayout: (layoutId: number) => Promise<void>;
  getFilePreview: (fileId: number) => Promise<FilePreviewData>;
  getSettings: () => Promise<SettingsSnapshot>;
  updateSettings: (patch: SettingsPatch) => Promise<SettingsSnapshot>;
  getCurrentWeather: () => Promise<CurrentWeather>;
  sendChatMessage: (content: string) => Promise<ChatResponse>;
  getChatHistory: () => Promise<ChatMessage[]>;
  getState: (key: string) => Promise<string | null>;
  setState: (key: string, value: string) => Promise<void>;
  getPetWindowBounds: () => Promise<PetWindowBounds>;
  movePetWindow: (deltaX: number, deltaY: number) => Promise<PetWindowBounds>;
  resetPetWindow: () => Promise<PetWindowBounds>;
  showPet: () => Promise<void>;
  hidePet: () => Promise<void>;
  openLogs: () => Promise<void>;
  openSettings: () => Promise<void>;
  onMenuCommand: (handler: (command: MenuCommand) => void) => () => void;
  onDesktopFilesUpdated: (handler: () => void) => () => void;
}

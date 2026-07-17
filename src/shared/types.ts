import type { MenuCommand } from "./ipc.js";
import type { AutoRule, AutoRuleExecution } from "./auto-rules.js";
import type { ContainerAccent } from "./container-accents.js";
import type { RuntimePauseSnapshot } from "./runtime.js";
import type { RuntimeMetricsReport } from "./runtime.js";

export type DesktopMode = "idle" | "activating" | "active" | "deactivating" | "safe-mode" | "error";

export interface AppInfo {
  name: string;
  version: string;
  platform: NodeJS.Platform;
  isPackaged: boolean;
}

export interface UpdateConfig {
  enabled: boolean;
  channel: "stable" | "beta";
  lastCheckedAt: string | null;
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
  accentColor: ContainerAccent;
}

export type FileCategory = "program" | "document" | "image" | "media" | "code" | "archive" | "folder" | "design" | "other";

export interface DesktopFileRecord {
  id: number;
  filename: string;
  displayName: string | null;
  fullPath: string;
  iconDataUrl?: string | null;
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

export interface WallpaperLibraryItem {
  id: string;
  label: string;
  style: "anime" | "landscape" | "cinematic" | "cyberpunk" | "minimalist" | "seasonal";
  type: "image" | "video";
  file: string;
  aliases: string[];
}

export interface WallpaperDisplayInfo {
  id: string;
  label: string;
  isPrimary: boolean;
  bounds: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
  wallpaperId: string | null;
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

export interface PrivacyNetworkState {
  paused: boolean;
  changedAt: string | null;
}

export type RecoveryHealthCode = "ready" | "degraded" | "unavailable" | "checking";

export interface RecoveryHealthItem {
  status: RecoveryHealthCode;
  detail: string;
}

export interface RecoverySystemStatus {
  checkedAt: string;
  explorer: RecoveryHealthItem;
  wallpaperHost: RecoveryHealthItem;
  shortcut: RecoveryHealthItem;
  runtimeRecovery: RecoveryHealthItem;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface LunaIntentPreview {
  kind: "desktop-inbox-preview";
  title: string;
  detail: string;
}

export interface ChatResponse {
  message: ChatMessage;
  provider: string;
  fallback: boolean;
  intentPreview?: LunaIntentPreview;
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

export type ActionRiskLevel = "L0" | "L1" | "L2" | "L3";
export type ActionPlanStatus = "ready" | "executing" | "completed" | "partial" | "undone" | "failed";
export type ActionItemStatus = "pending" | "completed" | "skipped" | "failed" | "undone" | "contested" | "abandoned";

export interface FileIdentity {
  size: number;
  mtimeMs: number;
  birthtimeMs: number;
  dev: string;
  ino: string;
}

export interface ActionPlanItem {
  id: string;
  kind: "move";
  sourcePath: string;
  targetPath: string;
  label: string;
  category: FileCategory;
  sizeBytes: number;
  status: ActionItemStatus;
  conflict?: "target-exists" | "source-missing" | "unsafe-path";
  error?: string;
  journalPreIdentity?: FileIdentity;
  journalPostIdentity?: FileIdentity;
}

export interface ActionPlan {
  id: string;
  source: "desktop-inbox" | "luna" | "manual";
  riskLevel: ActionRiskLevel;
  status: ActionPlanStatus;
  summary: string;
  createdAt: string;
  items: ActionPlanItem[];
}

export interface ActionExecution {
  id: string;
  planId: string;
  status: ActionPlanStatus;
  startedAt: string;
  completedAt: string | null;
  undoable: boolean;
  summary: string;
  items: ActionPlanItem[];
}

export interface DesktopResourceRef {
  origin: "desktop" | "portal" | "external";
  portalId?: string;
  fileId?: number;
  provider?: "everything" | "windows-search";
  path: string;
  label: string;
}

export interface DisplayWorkAreaSnapshot {
  displayId: string;
  sceneId: string;
  scaleFactor: number;
  isPrimary: boolean;
  bounds: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
}

export type SceneContainerRect = Pick<ContainerRecord, "id" | "positionX" | "positionY" | "width" | "height" | "isCollapsed"> & {
  accentColor?: ContainerAccent;
  displayId?: string;
  scaleFactor?: number;
  workAreaWidth?: number;
  workAreaHeight?: number;
};

export interface WorkspaceScene {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  layoutId: number | null;
  wallpaperId: string | null;
  wallpaperDynamic?: boolean;
  performanceMode: string;
  petVisible: boolean;
  containerLayout: SceneContainerRect[];
  portalIds?: string[];
  weatherState?: Pick<SettingsSnapshot["weather"], "particleIntensity" | "enableBorderInteraction">;
  petState?: Pick<SettingsSnapshot["pet"], "currentOutfit" | "scale" | "personality" | "autoOutfit" | "actionInterval" | "talkFrequency">;
  suggestionControls?: SuggestionDeliveryControls | null;
  pinnedResources?: DesktopResourceRef[];
  displayAssignments?: DisplayWorkAreaSnapshot[];
  todoSummary?: { total: number; active: number };
}

export interface PortalConfig {
  id: string;
  name: string;
  path: string;
  realPath: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortalResource {
  portalId: string;
  name: string;
  relativePath: string;
  fullPath: string;
  category: FileCategory;
  isDirectory: boolean;
  sizeBytes: number;
  modifiedAt: string;
  status: "ready" | "offline" | "permission-denied" | "too-large";
}

export interface SuggestionRecord {
  id: string;
  kind: "desktop-inbox";
  title: string;
  detail: string;
  status: "ready" | "dismissed" | "completed";
  planId: string | null;
  createdAt: string;
  reasonCode?: string;
  explanation?: string;
}

export interface SuggestionDeliveryControls {
  snoozedUntil: string | null;
  mutedUntil: string | null;
  disabled: boolean;
  policy: SuggestionPolicy;
}

export interface SuggestionPolicy {
  timeZoneOffsetMinutes: number;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  dailyBudget: number;
  perKind: {
    "desktop-inbox": {
      cooldownMs: number;
      dailyBudget: number;
    };
  };
}

export interface SupportDiagnosticsReport {
  generatedAt: string;
  app: {
    version: string;
    platform: string;
    architecture: string | null;
  };
  health: "healthy" | "degraded" | "unhealthy";
  counts: {
    desktopFiles: number;
    portals: number;
    recentErrors: number;
    configuredProviders: number;
    schemaVersion: number | null;
    migrationCount: number | null;
  };
  statusCodes: {
    database: "ok" | "degraded" | "unavailable" | "not-configured";
    desktop: "ok" | "degraded" | "unavailable" | "not-configured";
    wallpaperHost: "ok" | "degraded" | "unavailable" | "not-configured";
    aiProvider: "ok" | "degraded" | "unavailable" | "not-configured";
  };
  recentErrors: Array<{
    code: string;
    summary: string;
    occurredAt: string | null;
  }>;
}

export interface DiagnosticsExportResult {
  status: "saved" | "cancelled";
  filename: string | null;
}

export interface DiagnosticsExportSelection {
  consent: boolean;
  includeRecentErrors: boolean;
}

export type WorkspaceSearchOrigin = "desktop" | "portal" | "everything" | "windows-search";

export interface WorkspaceSearchResult {
  id: string;
  title: string;
  origin: WorkspaceSearchOrigin;
  category: FileCategory;
  modifiedAt: string;
}

export type InterruptedActionItemState = "completed" | "resumable" | "conflicted" | "missing";

export interface InterruptedActionRecovery {
  executionId: string;
  counts: Record<InterruptedActionItemState, number>;
  canResumeSafely: boolean;
  canRollbackSafely: boolean;
  items: Array<{
    id: string;
    label: string;
    state: InterruptedActionItemState;
  }>;
}

export interface ProjectDApi {
  getAppInfo: () => Promise<AppInfo>;
  showMain: () => Promise<void>;
  setOnboardingActive: (active: boolean) => Promise<void>;
  getDesktopStatus: () => Promise<DesktopStatus>;
  activateDesktop: () => Promise<DesktopStatus>;
  deactivateDesktop: () => Promise<DesktopStatus>;
  enterCleanDesktop: () => Promise<DesktopStatus>;
  exitCleanDesktop: () => Promise<DesktopStatus>;
  scanDesktop: () => Promise<ScanResult>;
  getDesktopFiles: () => Promise<ContainerWithFiles[]>;
  openFile: (fileId: number) => Promise<void>;
  openFileLocation: (fileId: number) => Promise<void>;
  moveFileToContainer: (fileId: number, containerId: number) => Promise<void>;
  renameFileAlias: (fileId: number, displayName: string) => Promise<void>;
  hideFile: (fileId: number) => Promise<void>;
  createDesktopInboxPlan: () => Promise<ActionPlan>;
  executeActionPlan: (planId: string) => Promise<ActionExecution>;
  undoActionExecution: (executionId: string) => Promise<ActionExecution>;
  resumeActionExecution: (executionId: string) => Promise<ActionExecution>;
  rollbackActionExecution: (executionId: string) => Promise<ActionExecution>;
  getActionHistory: () => Promise<ActionExecution[]>;
  getInterruptedActionRecoveries: () => Promise<InterruptedActionRecovery[]>;
  getAutoRules: () => Promise<AutoRule[]>;
  saveAutoRule: (rule: AutoRule) => Promise<AutoRule>;
  deleteAutoRule: (ruleId: string) => Promise<void>;
  previewAutoRules: () => Promise<AutoRuleExecution[]>;
  searchWorkspace: (query: string, limit?: number) => Promise<WorkspaceSearchResult[]>;
  openWorkspaceSearchResult: (resultId: string) => Promise<void>;
  revealWorkspaceSearchResult: (resultId: string) => Promise<void>;
  copyWorkspaceSearchResultPath: (resultId: string) => Promise<void>;
  pinSearchResultToScene: (resultId: string, sceneId: string) => Promise<void>;
  addSearchResultToPortal: (resultId: string) => Promise<PortalConfig | null>;
  resolveSearchResultPath: (resultId: string) => Promise<string>;
  getLatestSuggestion: () => Promise<SuggestionRecord | null>;
  dismissSuggestion: (suggestionId: string) => Promise<void>;
  getSuggestionDeliveryControls: () => Promise<SuggestionDeliveryControls>;
  snoozeSuggestions: (minutes: number) => Promise<void>;
  setSuggestionsEnabled: (enabled: boolean) => Promise<void>;
  updateSuggestionPolicy: (policy: SuggestionPolicy) => Promise<SuggestionDeliveryControls>;
  getDiagnosticsReport: () => Promise<SupportDiagnosticsReport>;
  exportDiagnosticsReport: (selection: DiagnosticsExportSelection) => Promise<DiagnosticsExportResult>;
  getWorkspaceScenes: () => Promise<WorkspaceScene[]>;
  saveWorkspaceScene: (name: string) => Promise<WorkspaceScene>;
  applyWorkspaceScene: (sceneId: string) => Promise<WorkspaceScene>;
  chooseFolderPortal: () => Promise<string | null>;
  addFolderPortal: (path: string, name: string) => Promise<PortalConfig>;
  removeFolderPortal: (portalId: string) => Promise<void>;
  getFolderPortals: () => Promise<PortalConfig[]>;
  getFolderPortalResources: (portalId: string) => Promise<PortalResource[]>;
  openFolderPortalResource: (portalId: string, relativePath: string) => Promise<void>;
  getDatabaseStatus: () => Promise<DatabaseStatus>;
  getContainers: () => Promise<ContainerRecord[]>;
  updateContainerPosition: (
    containerId: number,
    x: number,
    y: number,
    width: number,
    height: number,
    isCollapsed?: boolean
  ) => Promise<void>;
  updateContainerAccent: (containerId: number, accentColor: ContainerAccent) => Promise<void>;
  getLayouts: () => Promise<LayoutRecord[]>;
  applyLayout: (layoutId: number) => Promise<void>;
  getFilePreview: (fileId: number) => Promise<FilePreviewData>;
  getSettings: () => Promise<SettingsSnapshot>;
  updateSettings: (patch: SettingsPatch) => Promise<SettingsSnapshot>;
  getWallpaperLibrary: () => Promise<WallpaperLibraryItem[]>;
  applyWallpaper: (wallpaperId: string) => Promise<SettingsSnapshot>;
  getWallpaperDisplays: () => Promise<WallpaperDisplayInfo[]>;
  assignWallpaperToDisplay: (displayId: string, wallpaperId: string | null) => Promise<WallpaperDisplayInfo[]>;
  getCurrentWeather: () => Promise<CurrentWeather>;
  sendChatMessage: (content: string) => Promise<ChatResponse>;
  getChatHistory: () => Promise<ChatMessage[]>;
  clearChatHistory: () => Promise<void>;
  exportAllData: () => Promise<{ cancelled: boolean; filename: string | null }>;
  resetAllData: () => Promise<void>;
  getPrivacyNetworkState: () => Promise<PrivacyNetworkState>;
  setPrivacyNetworkPaused: (paused: boolean) => Promise<PrivacyNetworkState>;
  getRecoverySystemStatus: () => Promise<RecoverySystemStatus>;
  getState: (key: string) => Promise<string | null>;
  setState: (key: string, value: string) => Promise<void>;
  getPetWindowBounds: () => Promise<PetWindowBounds>;
  movePetWindow: (deltaX: number, deltaY: number) => Promise<PetWindowBounds>;
  resetPetWindow: () => Promise<PetWindowBounds>;
  setPetInteractive: (interactive: boolean) => Promise<void>;
  showPetContextMenu: () => Promise<void>;
  showPet: () => Promise<void>;
  hidePet: () => Promise<void>;
  openLogs: () => Promise<void>;
  openSettings: () => Promise<void>;
  setPeekShortcut: (accelerator: string) => Promise<{ success: boolean; accelerator: string }>;
  getUpdateStatus: () => Promise<import("./update.js").UpdateStatus>;
  setUpdateChannel: (channel: import("./update.js").UpdateChannel) => Promise<import("./update.js").UpdateStatus>;
  checkForUpdates: () => Promise<import("./update.js").UpdateStatus>;
  downloadUpdate: () => Promise<import("./update.js").UpdateStatus>;
  installDownloadedUpdate: () => Promise<void>;
  getRuntimeState: () => Promise<RuntimePauseSnapshot>;
  setRuntimeManualPaused: (paused: boolean) => Promise<RuntimePauseSnapshot>;
  getRuntimeMetrics: () => Promise<RuntimeMetricsReport>;
  onMenuCommand: (handler: (command: MenuCommand) => void) => () => void;
  onDesktopFilesUpdated: (handler: () => void) => () => void;
  onPortalsUpdated: (handler: () => void) => () => void;
  onSuggestionCreated: (handler: (suggestion: SuggestionRecord) => void) => () => void;
  onFocusWorkspaceSearch: (handler: () => void) => () => void;
  onSettingsUpdated: (handler: () => void) => () => void;
  onUpdateStatusChanged: (handler: (status: import("./update.js").UpdateStatus) => void) => () => void;
  onRuntimeStateChanged: (handler: (state: RuntimePauseSnapshot) => void) => () => void;
}

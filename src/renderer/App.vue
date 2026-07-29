<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import {
  AppWindow,
  Archive,
  ArrowRight,
  Code2,
  ExternalLink,
  EyeOff,
  FileQuestion,
  FileText,
  Film,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Palette,
  Pencil,
  RefreshCcw,
  Sparkles,
  X
} from "lucide-vue-next";
import SettingsPage from "@settings/SettingsPage.vue";
import OverlayPage from "./views/OverlayPage.vue";
import WallpaperStage from "./components/WallpaperStage.vue";
import PetPage from "./views/PetPage.vue";
import WallpaperPage from "./views/WallpaperPage.vue";
import OnboardingFlow from "./components/OnboardingFlow.vue";
import EdgeRail from "./components/EdgeRail.vue";
import AmbientStatus from "./components/AmbientStatus.vue";
import SceneSurface from "./components/SceneSurface.vue";
import SearchSurface from "./components/SearchSurface.vue";
import AssistantSurface from "./components/AssistantSurface.vue";
import OrganizerSurface from "./components/OrganizerSurface.vue";
import CompatibilitySurface from "./components/CompatibilitySurface.vue";
import { wallpaperDisplayLabel } from "@shared/wallpaper-library";
import { containerAccentOption } from "@shared/container-accents";
import { readOnboardingState, shouldShowOnboarding } from "@shared/onboarding";
import {
  closeDesktopSurface as closeDesktopSurfaceState,
  DEFAULT_DESKTOP_EXPERIENCE,
  enterClean as enterCleanState,
  enterImmersive as enterImmersiveState,
  enterNative as enterNativeState,
  enterSafe as enterSafeState,
  modeForDesktopStatus,
  openDesktopSurface as openDesktopSurfaceState,
  type DesktopTaskSurface,
  type DesktopExperienceMode
} from "@shared/desktop-experience";

const appVersionFallback = __PROJECTD_VERSION__;
import type { ActionExecution, ActionPlan, AppInfo, ContainerWithFiles, CurrentWeather, DatabaseStatus, DesktopFileRecord, DesktopStatus, ScanResult, SettingsSnapshot, SuggestionRecord, WallpaperLibraryItem, WorkspaceScene, WorkspaceSearchResult } from "@shared/types";

const appInfo = ref<AppInfo | null>(null);
const databaseStatus = ref<DatabaseStatus | null>(null);
const containers = ref<ContainerWithFiles[]>([]);
const scanResult = ref<ScanResult | null>(null);
const selectedFile = ref<DesktopFileRecord | null>(null);
const settings = ref<SettingsSnapshot | null>(null);
const contextMenu = ref<{ file: DesktopFileRecord; x: number; y: number } | null>(null);
const recoveryNotice = ref("");
const wallpaperHost = ref("unknown");
const weatherLocationSource = ref("unknown");
const currentWeather = ref<CurrentWeather | null>(null);
const wallpaperLibrary = ref<WallpaperLibraryItem[]>([]);
const inboxPlan = ref<ActionPlan | null>(null);
const actionHistory = ref<ActionExecution[]>([]);
const actionMessage = ref("");
const actionBusy = ref(false);
const latestSuggestion = ref<SuggestionRecord | null>(null);
const workspaceSearchQuery = ref("");
const workspaceSearchResults = ref<WorkspaceSearchResult[]>([]);
const workspaceSearchStatus = ref("");
const searchActionResultId = ref<string | null>(null);
const searchSurfaceRef = ref<InstanceType<typeof SearchSurface> | null>(null);
const compatibilitySurfaceRef = ref<InstanceType<typeof CompatibilitySurface> | null>(null);
const searchScenes = ref<WorkspaceScene[]>([]);
const searchScenePickerResultId = ref<string | null>(null);
const desktopStatus = ref<DesktopStatus>({
  mode: "idle",
  lastChangedAt: new Date().toISOString()
});
const route = ref(window.location.hash);
const showOnboarding = ref(!route.value && shouldShowOnboarding(readOnboardingState(localStorage, 5)));
const activityLog = ref<string[]>(["Project D shell ready"]);
const experienceMode = ref<DesktopExperienceMode>(DEFAULT_DESKTOP_EXPERIENCE.mode);
const activeTaskSurface = ref<DesktopTaskSurface>(DEFAULT_DESKTOP_EXPERIENCE.activeSurface);
const fileIconMap = {
  program: AppWindow,
  document: FileText,
  image: ImageIcon,
  media: Film,
  code: Code2,
  archive: Archive,
  folder: Folder,
  design: Palette,
  other: FileQuestion
};
let unsubscribeMenu: (() => void) | null = null;
let unsubscribeDesktopUpdate: (() => void) | null = null;
let unsubscribeSettingsUpdate: (() => void) | null = null;
let unsubscribeSearchFocus: (() => void) | null = null;
let unsubscribeSuggestionUpdate: (() => void) | null = null;

const isSettingsRoute = computed(() => route.value === "#/settings");
const isOverlayRoute = computed(() => route.value === "#/overlay");
const isPetRoute = computed(() => route.value === "#/pet");
const isWallpaperRoute = computed(() => route.value === "#/wallpaper");
const experienceModeLabel = computed(() => {
  if (experienceMode.value === "native") return "原生桌面";
  if (experienceMode.value === "immersive") return "沉浸空间";
  if (experienceMode.value === "task") return taskSurfaceLabel.value || "任务面";
  if (experienceMode.value === "clean") return "纯净桌面";
  return "安全恢复";
});
const totalFiles = computed(() => containers.value.reduce((total, container) => total + container.files.length, 0));
const currentWallpaper = computed(() => wallpaperLibrary.value.find((item) => item.id === settings.value?.wallpaper.dynamicId) ?? null);
const currentWallpaperLabel = computed(() => {
  const currentId = settings.value?.wallpaper.dynamicId;
  return wallpaperDisplayLabel(wallpaperLibrary.value.find((item) => item.id === currentId));
});
const wallpaperHostLabel = computed(() => {
  if (wallpaperHost.value === "WorkerW") return "WorkerW 桌面层";
  if (wallpaperHost.value === "Progman") return "Progman 桌面层";
  if (wallpaperHost.value.includes("fallback")) return "安全回退";
  return "检测中";
});
const weatherSourceLabel = computed(() => {
  const labels: Record<string, string> = {
    ipwhois: "公网 IP 定位",
    manual: "手动城市",
    cache: "本地缓存",
    openweathermap: "OpenWeatherMap",
    "open-meteo": "Open-Meteo"
  };
  return labels[weatherLocationSource.value] ?? weatherLocationSource.value;
});
const movableInboxItems = computed(() => inboxPlan.value?.items.filter((item) => item.status === "pending" && !item.conflict).length ?? 0);
const latestUndoableExecution = computed(() => actionHistory.value.find((item) => item.undoable) ?? null);
const taskSurfaceLabel = computed(() => {
  const labels: Record<Exclude<DesktopTaskSurface, null>, string> = {
    search: "搜索工作区",
    organize: "桌面整理",
    scene: "场景与壁纸",
    assistant: "AI 助手",
  };
  return activeTaskSurface.value ? labels[activeTaskSurface.value] : "";
});
const searchActionNotice = computed(() => {
  const resultId = searchActionResultId.value;
  const message = workspaceSearchStatus.value;
  if (!resultId || !message) return null;
  const tone: "neutral" | "success" | "error" = /正在|等待|搜索中|查询中/.test(message)
    ? "neutral"
    : /失败|无法|不可|拒绝|错误/.test(message)
      ? "error"
      : "success";
  return { resultId, tone, message };
});
function containerVisualStyle(container: ContainerWithFiles): Record<string, string> {
  return { "--container-accent": containerAccentOption(container.accentColor).rgb };
}

function pushLog(message: string): void {
  activityLog.value = [message, ...activityLog.value].slice(0, 5);
}

async function refreshStatus(): Promise<void> {
  const [nextDesktopStatus, nextDatabaseStatus, nextContainers, nextSettings, nextWallpaperHost, nextLocationSource, nextWallpaperLibrary, nextSuggestion, nextThemeMode] = await Promise.all([
    window.projectD.getDesktopStatus(),
    window.projectD.getDatabaseStatus(),
    window.projectD.getDesktopFiles(),
    window.projectD.getSettings(),
    window.projectD.getState("wallpaper_host"),
    window.projectD.getState("weather_location_source"),
    window.projectD.getWallpaperLibrary(),
    window.projectD.getLatestSuggestion(),
    window.projectD.getState("theme_mode").catch(() => "dark")
  ]);
  const resolvedTheme = nextThemeMode === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : nextThemeMode === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = resolvedTheme;
  desktopStatus.value = nextDesktopStatus;
  if (nextDesktopStatus.mode === "safe-mode" || nextDesktopStatus.mode === "error") {
    const next = enterSafeState();
    experienceMode.value = next.mode;
    activeTaskSurface.value = next.activeSurface;
  } else if (!activeTaskSurface.value && experienceMode.value === "native") {
    experienceMode.value = modeForDesktopStatus(nextDesktopStatus.mode);
  }
  databaseStatus.value = nextDatabaseStatus;
  containers.value = nextContainers;
  settings.value = nextSettings;
  wallpaperHost.value = nextWallpaperHost ?? "unknown";
  weatherLocationSource.value = nextLocationSource ?? "unknown";
  wallpaperLibrary.value = nextWallpaperLibrary;
  latestSuggestion.value = nextSuggestion;
  try {
    currentWeather.value = await window.projectD.getCurrentWeather();
  } catch {
    currentWeather.value = null;
  }
}

function openDesktopSurface(surface: Exclude<DesktopTaskSurface, null>): void {
  if (experienceMode.value === "native") {
    experienceMode.value = enterImmersiveState().mode;
  }
  const next = openDesktopSurfaceState(surface);
  experienceMode.value = next.mode;
  activeTaskSurface.value = next.activeSurface;
  if (surface === "search") {
    void focusWorkspaceSearch();
  }
}

function closeDesktopSurface(): void {
  const next = closeDesktopSurfaceState();
  experienceMode.value = next.mode;
  activeTaskSurface.value = next.activeSurface;
  contextMenu.value = null;
}

function wakeImmersive(): void {
  const next = enterImmersiveState();
  experienceMode.value = next.mode;
  activeTaskSurface.value = next.activeSurface;
  pushLog("已进入沉浸空间");
}

function leaveImmersive(): void {
  if (activeTaskSurface.value) {
    closeDesktopSurface();
    return;
  }
  const next = enterNativeState();
  experienceMode.value = next.mode;
  activeTaskSurface.value = next.activeSurface;
  pushLog("已返回原生桌面");
}

function openWallpaperPage(): void {
  window.location.hash = "#/wallpaper";
}

function handleExperienceKeydown(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;
  if (experienceMode.value === "clean") {
    void window.projectD.exitCleanDesktop().then((nextStatus) => {
      desktopStatus.value = nextStatus;
      const next = nextStatus.mode === "safe-mode" ? enterSafeState() : enterImmersiveState();
      experienceMode.value = next.mode;
      activeTaskSurface.value = next.activeSurface;
    });
    return;
  }
  if (activeTaskSurface.value) {
    closeDesktopSurface();
    return;
  }
  if (experienceMode.value === "immersive") {
    leaveImmersive();
  }
}

async function loadRecoveryNotice(): Promise<void> {
  const raw = await window.projectD.getState("boot_recovery_notice");
  if (!raw) {
    recoveryNotice.value = "";
    return;
  }

  try {
    const parsed = JSON.parse(raw) as { message?: string; recoveredAt?: string };
    recoveryNotice.value = parsed.message
      ? `${parsed.message}${parsed.recoveredAt ? `（${new Date(parsed.recoveredAt).toLocaleTimeString()}）` : ""}`
      : "";
  } catch {
    recoveryNotice.value = raw;
  }
}

async function dismissRecoveryNotice(): Promise<void> {
  await window.projectD.setState("boot_recovery_notice", "");
  recoveryNotice.value = "";
}

async function activateDesktop(): Promise<void> {
  desktopStatus.value = await window.projectD.activateDesktop();
  openDesktopSurface("organize");
  pushLog("已进入整理预备状态");
}

async function deactivateDesktop(): Promise<void> {
  desktopStatus.value = await window.projectD.deactivateDesktop();
  const next = desktopStatus.value.mode === "safe-mode" ? enterSafeState() : enterNativeState();
  experienceMode.value = next.mode;
  activeTaskSurface.value = next.activeSurface;
  pushLog("桌面已安全归位");
}

async function enterCleanDesktop(): Promise<void> {
  desktopStatus.value = await window.projectD.enterCleanDesktop();
  const next = desktopStatus.value.mode === "safe-mode" ? enterSafeState() : enterCleanState();
  experienceMode.value = next.mode;
  activeTaskSurface.value = next.activeSurface;
  pushLog("已进入纯净桌面");
}

function openSettings(): void {
  void window.projectD.openSettings();
}

async function switchWallpaperStyle(): Promise<void> {
  if (wallpaperLibrary.value.length === 0) return;
  const currentId = settings.value?.wallpaper.dynamicId;
  const index = wallpaperLibrary.value.findIndex((item) => item.id === currentId);
  const next = wallpaperLibrary.value[(index + 1 + wallpaperLibrary.value.length) % wallpaperLibrary.value.length] ?? wallpaperLibrary.value[0];
  settings.value = await window.projectD.applyWallpaper(next.id);
  pushLog(`拉绳切换壁纸：${wallpaperDisplayLabel(next)}`);
}

async function scanDesktop(): Promise<void> {
  scanResult.value = await window.projectD.scanDesktop();
  containers.value = await window.projectD.getDesktopFiles();
  databaseStatus.value = await window.projectD.getDatabaseStatus();
  selectedFile.value = null;
  contextMenu.value = null;
  pushLog(`扫描完成：${scanResult.value.insertedOrUpdated} 个条目`);
}

async function prepareDesktopInbox(): Promise<void> {
  actionBusy.value = true;
  actionMessage.value = "正在审查桌面根目录文件";
  try {
    inboxPlan.value = await window.projectD.createDesktopInboxPlan();
    actionMessage.value = inboxPlan.value.summary;
  } catch (error) {
    actionMessage.value = `无法生成方案：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    actionBusy.value = false;
  }
}

async function prepareSuggestedInbox(): Promise<void> {
  await prepareDesktopInbox();
  latestSuggestion.value = null;
}

async function snoozeSuggestion(): Promise<void> {
  if (!latestSuggestion.value) return;
  await window.projectD.snoozeSuggestions(120);
  latestSuggestion.value = null;
  pushLog("已在两小时后再提示桌面整理建议");
}

async function disableSuggestions(): Promise<void> {
  if (!latestSuggestion.value) return;
  await window.projectD.setSuggestionsEnabled(false);
  latestSuggestion.value = null;
  pushLog("已关闭桌面整理建议，可在设置中重新开启");
}

async function openLatestSuggestionTask(): Promise<void> {
  if (!latestSuggestion.value) return;
  openDesktopSurface("organize");
  await prepareSuggestedInbox();
}

async function dismissLatestSuggestion(): Promise<void> {
  if (!latestSuggestion.value) return;
  const suggestionId = latestSuggestion.value.id;
  latestSuggestion.value = null;
  try {
    await window.projectD.dismissSuggestion(suggestionId);
  } catch {
    pushLog("建议已从当前桌面收起");
  }
}

async function focusWorkspaceSearch(): Promise<void> {
  if (route.value) {
    window.location.hash = "";
    route.value = "";
  }
  await nextTick();
  if (experienceMode.value === "safe") {
    await compatibilitySurfaceRef.value?.focusSearch();
  } else {
    await searchSurfaceRef.value?.focus();
  }
}

async function searchWorkspace(): Promise<void> {
  const query = workspaceSearchQuery.value.trim();
  searchScenePickerResultId.value = null;
  searchActionResultId.value = null;
  if (!query) {
    workspaceSearchResults.value = [];
    workspaceSearchStatus.value = "";
    return;
  }
  workspaceSearchStatus.value = "正在搜索已授权内容";
  try {
    workspaceSearchResults.value = await window.projectD.searchWorkspace(query, 8);
    workspaceSearchStatus.value = workspaceSearchResults.value.length > 0
      ? `找到 ${workspaceSearchResults.value.length} 项`
      : "没有找到匹配内容";
  } catch (error) {
    workspaceSearchResults.value = [];
    workspaceSearchStatus.value = `搜索失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

function clearWorkspaceSearch(): void {
  workspaceSearchQuery.value = "";
  workspaceSearchResults.value = [];
  workspaceSearchStatus.value = "";
  searchScenePickerResultId.value = null;
  searchActionResultId.value = null;
}

async function openSearchResult(result: WorkspaceSearchResult): Promise<void> {
  searchActionResultId.value = result.id;
  try {
    await window.projectD.openWorkspaceSearchResult(result.id);
    workspaceSearchStatus.value = `已打开：${result.title}`;
    pushLog(`已打开：${result.title}`);
  } catch {
    workspaceSearchStatus.value = `无法打开：${result.title}，结果可能已失效`;
  }
}

async function revealSearchResult(result: WorkspaceSearchResult): Promise<void> {
  searchActionResultId.value = result.id;
  try {
    await window.projectD.revealWorkspaceSearchResult(result.id);
    workspaceSearchStatus.value = `已定位：${result.title}`;
  } catch {
    workspaceSearchStatus.value = `无法定位：${result.title}，结果可能已失效`;
  }
}

async function copySearchResultPath(result: WorkspaceSearchResult): Promise<void> {
  searchActionResultId.value = result.id;
  try {
    await window.projectD.copyWorkspaceSearchResultPath(result.id);
    workspaceSearchStatus.value = `已复制路径：${result.title}`;
  } catch {
    workspaceSearchStatus.value = `无法复制路径：${result.title}，结果可能已失效`;
  }
}

async function addSearchResultToPortal(result: WorkspaceSearchResult): Promise<void> {
  searchActionResultId.value = result.id;
  workspaceSearchStatus.value = `等待授权：${result.title}`;
  try {
    const portal = await window.projectD.addSearchResultToPortal(result.id);
    workspaceSearchStatus.value = portal ? `已授权只读门户：${portal.name}` : "已取消门户授权";
  } catch (error) {
    workspaceSearchStatus.value = error instanceof Error ? error.message : `无法授权门户：${result.title}`;
  }
}

async function toggleSearchScenePicker(result: WorkspaceSearchResult): Promise<void> {
  searchActionResultId.value = null;
  if (searchScenePickerResultId.value === result.id) {
    searchScenePickerResultId.value = null;
    return;
  }
  try {
    searchScenes.value = await window.projectD.getWorkspaceScenes();
  } catch {
    workspaceSearchStatus.value = "场景列表暂时不可用，请稍后重试";
    return;
  }
  if (searchScenes.value.length === 0) {
    workspaceSearchStatus.value = "没有可用场景，请先在场景面创建一个场景";
    return;
  }
  searchScenePickerResultId.value = result.id;
}

async function pinSearchResultToScene(result: WorkspaceSearchResult, scene: WorkspaceScene): Promise<void> {
  searchActionResultId.value = result.id;
  try {
    await window.projectD.pinSearchResultToScene(result.id, scene.id);
    searchScenePickerResultId.value = null;
    workspaceSearchStatus.value = `已将“${result.title}”钉到场景“${scene.name}”`;
  } catch {
    workspaceSearchStatus.value = `无法钉到场景：${result.title}，结果可能已失效`;
  }
}

async function executeInboxPlan(): Promise<void> {
  if (!inboxPlan.value || movableInboxItems.value === 0 || actionBusy.value) return;
  const approved = window.confirm(`将移动 ${movableInboxItems.value} 项桌面文件到“Project D 收纳”，不会覆盖同名文件。执行后可一键撤销。继续吗？`);
  if (!approved) return;
  actionBusy.value = true;
  try {
    const execution = await window.projectD.executeActionPlan(inboxPlan.value.id);
    actionHistory.value = [execution, ...actionHistory.value.filter((item) => item.id !== execution.id)];
    actionMessage.value = execution.summary;
    inboxPlan.value = null;
    await refreshStatus();
  } catch (error) {
    actionMessage.value = `整理未执行：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    actionBusy.value = false;
  }
}

async function undoLatestAction(): Promise<void> {
  const execution = latestUndoableExecution.value;
  if (!execution || actionBusy.value) return;
  actionBusy.value = true;
  try {
    const restored = await window.projectD.undoActionExecution(execution.id);
    actionHistory.value = [restored, ...actionHistory.value.filter((item) => item.id !== restored.id)];
    actionMessage.value = restored.summary;
    await refreshStatus();
  } catch (error) {
    actionMessage.value = `恢复未完成：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    actionBusy.value = false;
  }
}

async function openFile(fileId: number): Promise<void> {
  contextMenu.value = null;
  await window.projectD.openFile(fileId);
}

async function openFileLocation(fileId: number): Promise<void> {
  contextMenu.value = null;
  await window.projectD.openFileLocation(fileId);
}

async function moveFileToContainer(fileId: number, containerId: number): Promise<void> {
  await window.projectD.moveFileToContainer(fileId, containerId);
  contextMenu.value = null;
  await refreshStatus();
}

async function renameFileAlias(file: DesktopFileRecord): Promise<void> {
  const nextName = window.prompt("Project D 内部显示名", file.displayName ?? file.filename);
  if (nextName === null) {
    return;
  }
  await window.projectD.renameFileAlias(file.id, nextName);
  contextMenu.value = null;
  await refreshStatus();
}

async function hideFile(fileId: number): Promise<void> {
  await window.projectD.hideFile(fileId);
  selectedFile.value = null;
  contextMenu.value = null;
  await refreshStatus();
}

function selectFile(file: DesktopFileRecord): void {
  selectedFile.value = file;
  contextMenu.value = null;
}

function showFileMenu(event: MouseEvent, file: DesktopFileRecord): void {
  event.preventDefault();
  selectedFile.value = file;
  contextMenu.value = { file, x: event.clientX, y: event.clientY };
}

function fileIcon(file: DesktopFileRecord) {
  return fileIconMap[file.category] ?? FileQuestion;
}

function fileKindLabel(file: DesktopFileRecord): string {
  if (file.category === "folder") {
    return "文件夹";
  }
  return file.extension?.replace(".", "").toUpperCase() || file.category;
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function handleHashChange(): void {
  route.value = window.location.hash;
}

async function dismissOnboarding(): Promise<void> {
  showOnboarding.value = false;
  await window.projectD.setOnboardingActive(false);
}

onMounted(async () => {
  window.addEventListener("hashchange", handleHashChange);
  window.addEventListener("keydown", handleExperienceKeydown);
  if (route.value) return;

  if (showOnboarding.value) await window.projectD.setOnboardingActive(true);

  appInfo.value = await window.projectD.getAppInfo();
  await refreshStatus();
  await loadRecoveryNotice();
  actionHistory.value = await window.projectD.getActionHistory();

  unsubscribeMenu = window.projectD.onMenuCommand((command) => {
    if (command === "activate-desktop") {
      desktopStatus.value = { mode: "active", lastChangedAt: new Date().toISOString() };
      pushLog("托盘触发启动整理");
    }
    if (command === "deactivate-desktop") {
      desktopStatus.value = { mode: "idle", lastChangedAt: new Date().toISOString() };
      pushLog("托盘触发安全归位");
    }
    if (command === "open-settings") {
      pushLog("设置窗口已打开");
    }
  });
  unsubscribeDesktopUpdate = window.projectD.onDesktopFilesUpdated(() => {
    void refreshStatus();
    pushLog("桌面文件已更新");
  });
  unsubscribeSettingsUpdate = window.projectD.onSettingsUpdated(() => {
    void refreshStatus();
  });
  unsubscribeSearchFocus = window.projectD.onFocusWorkspaceSearch(() => {
    void focusWorkspaceSearch();
  });
  unsubscribeSuggestionUpdate = window.projectD.onSuggestionCreated((suggestion) => {
    latestSuggestion.value = suggestion;
    pushLog("Luna 生成了一条桌面建议");
  });
});

onUnmounted(() => {
  window.removeEventListener("hashchange", handleHashChange);
  window.removeEventListener("keydown", handleExperienceKeydown);
  unsubscribeMenu?.();
  unsubscribeDesktopUpdate?.();
  unsubscribeSettingsUpdate?.();
  unsubscribeSearchFocus?.();
  unsubscribeSuggestionUpdate?.();
  if (showOnboarding.value && !route.value) void window.projectD.setOnboardingActive(false);
});
</script>

<template>
  <SettingsPage v-if="isSettingsRoute" />
  <OverlayPage v-else-if="isOverlayRoute" />
  <PetPage v-else-if="isPetRoute" />
  <WallpaperPage v-else-if="isWallpaperRoute" />

  <main v-else class="app-shell" :data-experience-mode="experienceMode" :data-task-surface="activeTaskSurface || undefined">
    <OnboardingFlow v-if="showOnboarding" @completed="dismissOnboarding" @skipped="dismissOnboarding" />
    <WallpaperStage />
    <EdgeRail
      :mode="experienceMode"
      :active-surface="activeTaskSurface"
      @wake="wakeImmersive"
      @open-surface="openDesktopSurface"
      @enter-clean="enterCleanDesktop"
      @open-settings="openSettings"
    />
    <AmbientStatus
      :mode="experienceMode"
      :wallpaper-label="currentWallpaperLabel"
      :city="currentWeather?.city || '自动定位'"
      :host-label="wallpaperHostLabel"
      :task-label="taskSurfaceLabel"
      :active-surface="activeTaskSurface"
      @wake="wakeImmersive"
      @close-task="closeDesktopSurface"
      @leave-immersive="leaveImmersive"
    />
    <section v-if="latestSuggestion && experienceMode === 'immersive' && !activeTaskSurface" class="ambient-suggestion" aria-live="polite">
      <span class="ambient-suggestion-icon"><Sparkles :size="16" /></span>
      <div>
        <span>桌宠提醒</span>
        <strong>{{ latestSuggestion.title }}</strong>
        <small>{{ latestSuggestion.detail }}</small>
      </div>
      <button type="button" @click="openLatestSuggestionTask">查看整理</button>
      <button type="button" class="ambient-suggestion-dismiss" title="收起提醒" aria-label="收起提醒" @click="dismissLatestSuggestion"><X :size="15" /></button>
    </section>
    <section class="desktop-band" :data-visible="Boolean(activeTaskSurface || !['native', 'immersive', 'clean'].includes(experienceMode))">
      <div v-if="activeTaskSurface" class="task-surface-heading">
        <div>
          <span>当前任务面</span>
          <strong>{{ taskSurfaceLabel }}</strong>
        </div>
      </div>
      <header class="topbar">
        <div class="brand-lockup">
          <span class="brand-mark">D</span>
          <div>
            <strong>Project D</strong>
            <span>桌面空间</span>
          </div>
        </div>
        <div class="topbar-state">
          <span class="host-state">{{ wallpaperHostLabel }}</span>
          <div class="status-pill" :data-mode="experienceMode">
            <span></span>
            {{ experienceModeLabel }}
          </div>
        </div>
      </header>
      <button class="wallpaper-pull-cord" type="button" title="切换到下一张壁纸" @click="switchWallpaperStyle">
        <span></span>
        {{ currentWallpaperLabel }}
      </button>
      <div v-if="desktopStatus.message && desktopStatus.mode !== 'idle'" class="recovery-banner">
        {{ desktopStatus.message }}
      </div>
      <div v-if="recoveryNotice" class="recovery-banner recovery-banner-persistent">
        <span>{{ recoveryNotice }}</span>
        <button type="button" @click="dismissRecoveryNotice">知道了</button>
      </div>

      <AssistantSurface
        v-if="activeTaskSurface === 'assistant'"
        @request-inbox-plan="prepareDesktopInbox"
      />
      <SearchSurface
        v-if="activeTaskSurface === 'search'"
        ref="searchSurfaceRef"
        :query="workspaceSearchQuery"
        :results="workspaceSearchResults"
        :status="workspaceSearchStatus"
        :scenes="searchScenes"
        :picker-result-id="searchScenePickerResultId"
        :action-notice="searchActionNotice"
        @update:query="workspaceSearchQuery = $event"
        @search="searchWorkspace"
        @clear="clearWorkspaceSearch"
        @open="openSearchResult"
        @reveal="revealSearchResult"
        @copy="copySearchResultPath"
        @portal="addSearchResultToPortal"
        @toggle-scene="toggleSearchScenePicker"
        @pin-scene="pinSearchResultToScene"
      />
      <OrganizerSurface
        v-if="activeTaskSurface === 'organize'"
        :containers="containers"
        :total-files="totalFiles"
        :selected-file="selectedFile"
        :action-message="actionMessage"
        :action-busy="actionBusy"
        :inbox-plan="inboxPlan"
        :movable-inbox-items="movableInboxItems"
        :latest-undoable-execution="latestUndoableExecution"
        :file-icon="fileIcon"
        :file-kind-label="fileKindLabel"
        :container-visual-style="containerVisualStyle"
        :format-bytes="formatBytes"
        @select-file="selectFile"
        @open-file="openFile"
        @show-file-menu="showFileMenu"
        @restore="deactivateDesktop"
        @scan="scanDesktop"
        @clean="enterCleanDesktop"
        @settings="openSettings"
        @prepare-inbox="prepareDesktopInbox"
        @execute-inbox="executeInboxPlan"
        @undo-latest="undoLatestAction"
        @cancel-inbox="inboxPlan = null"
      />

      <CompatibilitySurface
        v-if="experienceMode === 'safe'"
        ref="compatibilitySurfaceRef"
        :containers="containers"
        :total-files="totalFiles"
        :selected-file="selectedFile"
        :action-message="actionMessage"
        :action-busy="actionBusy"
        :inbox-plan="inboxPlan"
        :movable-inbox-items="movableInboxItems"
        :latest-undoable-execution="latestUndoableExecution"
        :app-info="appInfo"
        :database-status="databaseStatus"
        :app-version="appVersionFallback"
        :wallpaper-host-label="wallpaperHostLabel"
        :current-weather="currentWeather"
        :weather-source-label="weatherSourceLabel"
        :latest-suggestion="latestSuggestion"
        :workspace-search-query="workspaceSearchQuery"
        :workspace-search-results="workspaceSearchResults"
        :workspace-search-status="workspaceSearchStatus"
        :search-scenes="searchScenes"
        :search-scene-picker-result-id="searchScenePickerResultId"
        :file-icon="fileIcon"
        :file-kind-label="fileKindLabel"
        :container-visual-style="containerVisualStyle"
        :format-bytes="formatBytes"
        @select-file="selectFile"
        @open-file="openFile"
        @show-file-menu="showFileMenu"
        @activate="activateDesktop"
        @restore="deactivateDesktop"
        @clean="enterCleanDesktop"
        @scan="scanDesktop"
        @settings="openSettings"
        @update:query="workspaceSearchQuery = $event"
        @search="searchWorkspace"
        @clear="clearWorkspaceSearch"
        @open="openSearchResult"
        @reveal="revealSearchResult"
        @copy="copySearchResultPath"
        @portal="addSearchResultToPortal"
        @toggle-scene="toggleSearchScenePicker"
        @pin-scene="pinSearchResultToScene"
        @prepare-inbox="prepareDesktopInbox"
        @execute-inbox="executeInboxPlan"
        @undo-latest="undoLatestAction"
        @cancel-inbox="inboxPlan = null"
        @snooze-suggestion="snoozeSuggestion"
        @disable-suggestions="disableSuggestions"
      />
      <SceneSurface
        v-if="activeTaskSurface === 'scene'"
        :wallpaper-label="currentWallpaperLabel"
        :city="currentWeather?.city || '自动定位'"
        :host-label="wallpaperHostLabel"
        :weather-mode="settings?.weather.mode || 'auto'"
        :weather-label="currentWeather?.condition || settings?.weather.manualWeather || 'clear'"
        :weather-intensity="settings?.weather.particleIntensity ?? 0.55"
        :pet-position="{ x: settings?.pet.positionX ?? 36, y: settings?.pet.positionY ?? 36 }"
        :safe-region="currentWallpaper?.safeRegion"
        :wallpapers="wallpaperLibrary"
        @next-wallpaper="switchWallpaperStyle"
        @open-library="openWallpaperPage"
        @applied="refreshStatus"
      />
    </section>

    <div v-if="contextMenu" class="context-menu" :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }">
      <button type="button" @click="openFile(contextMenu.file.id)"><ExternalLink :size="15" />打开</button>
      <button type="button" @click="openFileLocation(contextMenu.file.id)"><FolderOpen :size="15" />打开所在位置</button>
      <button
        v-for="container in containers"
        :key="container.id"
        type="button"
        @click="moveFileToContainer(contextMenu!.file.id, container.id)"
      >
        <ArrowRight :size="15" />移动到：{{ container.name }}
      </button>
      <button type="button" @click="renameFileAlias(contextMenu.file)"><Pencil :size="15" />重命名显示名</button>
      <button type="button" @click="hideFile(contextMenu.file.id)"><EyeOff :size="15" />从 Project D 隐藏</button>
      <button type="button" @click="scanDesktop"><RefreshCcw :size="15" />刷新文件信息</button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  Bot,
  CloudSun,
  Download,
  FileText,
  FolderPlus,
  FolderOpen,
  History,
  Image as ImageIcon,
  Info,
  KeyRound,
  LayoutGrid,
  Layers3,
  ListChecks,
  MonitorCog,
  Palette,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  LockKeyhole,
  PlayCircle,
  SlidersHorizontal,
  Trash2,
  Wifi,
  WifiOff
} from "lucide-vue-next";
import { resetOnboarding } from "@shared/onboarding";
import type { ActionExecution, AppInfo, ContainerRecord, CurrentWeather, InterruptedActionRecovery, LayoutRecord, PortalConfig, PortalResource, PrivacyNetworkState, RecoverySystemStatus, SettingsSnapshot, SuggestionDeliveryControls, SuggestionSuppressionHistoryEntry, SupportDiagnosticsReport, WallpaperDisplayInfo, WallpaperLibraryItem, WorkspaceScene } from "@shared/types";
import type { RuntimeMetricsReport, RuntimePauseSnapshot } from "@shared/runtime";
import type { UpdateChannel, UpdateStatus } from "@shared/update";
import type { AutoRule, AutoRuleAction, AutoRuleCondition, AutoRuleExecution } from "@shared/auto-rules";
import { PET_PERSONALITIES, petSentence } from "@shared/pet-behavior";

const appVersionFallback = __PROJECTD_VERSION__;
import { PET_CHARACTERS } from "@shared/pet-characters";
import { WALLPAPER_STYLES } from "@shared/wallpaper-library";

type SettingsTab = "general" | "layout" | "rules" | "portal" | "privacy" | "wallpaper" | "weather" | "pet" | "ai" | "recovery" | "about";

const tabs = [
  { id: "general", label: "通用", icon: MonitorCog },
  { id: "layout", label: "布局", icon: LayoutGrid },
  { id: "rules", label: "自动规则", icon: ListChecks },
  { id: "portal", label: "文件门户", icon: FolderPlus },
  { id: "privacy", label: "隐私中心", icon: LockKeyhole },
  { id: "wallpaper", label: "壁纸", icon: Palette },
  { id: "weather", label: "天气", icon: CloudSun },
  { id: "pet", label: "桌宠", icon: Bot },
  { id: "ai", label: "AI 对话", icon: KeyRound },
  { id: "recovery", label: "恢复中心", icon: History },
  { id: "about", label: "关于", icon: Info }
] as const;

const activeTab = ref<SettingsTab>("general");
const appInfo = ref<AppInfo | null>(null);
const settings = ref<SettingsSnapshot | null>(null);
const layouts = ref<LayoutRecord[]>([]);
const containers = ref<ContainerRecord[]>([]);
const autoRules = ref<AutoRule[]>([]);
const rulePreview = ref<AutoRuleExecution[]>([]);
const ruleName = ref("");
const ruleField = ref<AutoRuleCondition["field"]>("extension");
const ruleOperator = ref<AutoRuleCondition["operator"]>("equals");
const ruleValue = ref(".pdf");
const ruleActionType = ref<AutoRuleAction["type"]>("move-to-container");
const ruleActionTarget = ref("");
const wallpaperLibrary = ref<WallpaperLibraryItem[]>([]);
const wallpaperDisplays = ref<WallpaperDisplayInfo[]>([]);
const currentWeather = ref<CurrentWeather | null>(null);
const wallpaperHost = ref("unknown");
const weatherLocationSource = ref("unknown");
const recoveryScriptPath = ref("");
const portals = ref<PortalConfig[]>([]);
const portalResources = ref<PortalResource[]>([]);
const selectedPortalId = ref<string | null>(null);
const scenes = ref<WorkspaceScene[]>([]);
const actionHistory = ref<ActionExecution[]>([]);
const interruptedRecoveries = ref<InterruptedActionRecovery[]>([]);
const suggestionSuppressionHistory = ref<SuggestionSuppressionHistoryEntry[]>([]);
const diagnosticsReport = ref<SupportDiagnosticsReport | null>(null);
const diagnosticsBusy = ref(false);
const diagnosticsConsent = ref(false);
const diagnosticsIncludeErrors = ref(true);
const privacyStatus = ref("数据仅保留在本机");
const privacyBusy = ref(false);
const privacyNetwork = ref<PrivacyNetworkState>({ paused: false, changedAt: null });
const recoverySystemStatus = ref<RecoverySystemStatus | null>(null);
let unsubscribePortals: (() => void) | null = null;
let unsubscribeUpdateStatus: (() => void) | null = null;
let unsubscribeRuntimeState: (() => void) | null = null;

const peekShortcut = ref("Control+Alt+Space");
const peekShortcutRecording = ref(false);
const peekShortcutError = ref("");
const peekShortcutModifiers = ref<Set<string>>(new Set());
let peekShortcutOriginal = "";
function formatAccelerator(key: string, modifiers: Set<string>): string {
  const order = ["Control", "Alt", "Shift", "Meta"];
  const parts: string[] = [];
  for (const mod of order) {
    if (modifiers.has(mod)) parts.push(mod);
  }
  if (key && !modifiers.has(key)) parts.push(key);
  return parts.join("+");
}
function startPeekShortcutRecording(): void {
  peekShortcutOriginal = peekShortcut.value;
  peekShortcutRecording.value = true;
  peekShortcutError.value = "";
  peekShortcutModifiers.value = new Set();
}
function onPeekShortcutKeydown(event: KeyboardEvent): void {
  event.preventDefault();
  event.stopPropagation();

  const modifierKeys = ["Control", "Alt", "Shift", "Meta"];
  if (modifierKeys.includes(event.key)) {
    const next = new Set(peekShortcutModifiers.value);
    if (next.has(event.key)) {
      next.delete(event.key);
    } else {
      next.add(event.key);
    }
    peekShortcutModifiers.value = next;
    return;
  }

  if (event.key === "Escape") {
    peekShortcut.value = peekShortcutOriginal;
    peekShortcutRecording.value = false;
    peekShortcutError.value = "";
    return;
  }

  if (event.key === "Enter") {
    const accelerator = formatAccelerator("Enter", peekShortcutModifiers.value);
    confirmPeekShortcut(accelerator);
    return;
  }

  const keyMap: Record<string, string> = {
    " ": "Space",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    "+": "Plus"
  };
  const key = keyMap[event.key] ?? (event.key.length === 1 ? event.key.toUpperCase() : event.key);
  const accelerator = formatAccelerator(key, peekShortcutModifiers.value);
  confirmPeekShortcut(accelerator);
}
async function confirmPeekShortcut(accelerator: string): Promise<void> {
  peekShortcutRecording.value = false;
  peekShortcutError.value = "";
  try {
    await window.projectD.setPeekShortcut(accelerator);
    peekShortcut.value = accelerator;
    saveStatus.value = `快捷键已设置为 ${accelerator}`;
  } catch {
    peekShortcut.value = peekShortcutOriginal;
    peekShortcutError.value = "快捷键冲突，请换一个组合";
  }
}

const autoActivate = ref(false);
const launchAtLogin = ref(false);
const coverAllDisplays = ref(false);
const performanceMode = ref("auto");
const cleanDesktopExitShortcut = ref("Escape");
const themeMode = ref<"dark" | "light" | "system">("dark");
const runtimeState = ref<RuntimePauseSnapshot | null>(null);
const runtimeMetrics = ref<RuntimeMetricsReport | null>(null);
const runtimePauseDetail = computed(() => {
  if (!runtimeState.value?.paused) return `运行中 · ${runtimeState.value?.effectiveProfile ?? "balanced"}`;
  const labels: Record<string, string> = {
    manual: "手动暂停",
    "external-fullscreen": "全屏应用",
    "screen-locked": "屏幕锁定",
    "system-suspend": "系统休眠",
    "thermal-critical": "设备过热"
  };
  return runtimeState.value.reasons.map((reason) => labels[reason] ?? reason).join("、");
});

async function setManualRuntimePause(paused: boolean): Promise<void> {
  runtimeState.value = await window.projectD.setRuntimeManualPaused(paused);
}
const particleIntensity = ref(55);
const petEnabled = ref(true);
const petCharacterId = ref("luna-q");
const petPersonality = ref("gentle");
const petPersonalityPreview = ref("");
const petTalkFrequency = ref("normal");
const petScale = ref(100);
const petAutoOutfit = ref(true);
const petCurrentOutfit = ref("default");
const petActionInterval = ref(120);
const petStudioCanvas = ref<HTMLCanvasElement | null>(null);
const petStudioSource = ref("");
const petStudioThreshold = ref(54);
const petStudioStatus = ref("上传一张背景相对干净的人像或动物图片");
const wallpaperDynamic = ref(true);
const wallpaperStyle = ref("anime");
const selectedWallpaperId = ref("");
const wallpaperStyleFilter = ref("all");
const wallpaperSearch = ref("");
const wallpaperSaveOriginal = ref(false);
const wallpaperStudioCanvas = ref<HTMLCanvasElement | null>(null);
const wallpaperStudioSource = ref("");
const wallpaperStudioSignature = ref("");
const wallpaperStudioSticker = ref<"none" | "sparkles" | "heart" | "moon">("none");
const wallpaperStudioStatus = ref("选择一张图片开始创作");
const weatherMode = ref("manual");
const manualWeather = ref("clear");
const city = ref("");
const weatherApiKey = ref("");
const provider = ref("local-fallback");
const aiEnabled = ref(true);
const aiApiKey = ref("");
const aiEndpoint = ref("");
const aiModel = ref("");
const aiTemperature = ref(80);
const aiMaxTokens = ref(150);
const saveStatus = ref("正在载入");
const updateBusy = ref(false);
const updateStatus = ref<UpdateStatus>({
  phase: "disabled",
  channel: "stable",
  currentVersion: "0.0.0",
  lastCheckedAt: null,
  feedConfigured: false,
  message: "正在载入更新状态"
});
const weatherTestStatus = ref("");
const aiTestStatus = ref("");
const deepSeekModels = [
  ["deepseek-v4-flash", "V4 Flash（推荐，响应更快）"],
  ["deepseek-v4-pro", "V4 Pro（能力更强）"]
] as const;
const suggestionDelivery = ref<SuggestionDeliveryControls>({
  snoozedUntil: null,
  mutedUntil: null,
  disabled: false,
  policy: {
    timeZoneOffsetMinutes: -new Date().getTimezoneOffset(),
    quietHours: { enabled: true, start: "22:00", end: "08:00" },
    dailyBudget: 3,
    perKind: { "desktop-inbox": { cooldownMs: 21_600_000, dailyBudget: 2 } }
  }
});

const activeTabMeta = computed(() => tabs.find((tab) => tab.id === activeTab.value) ?? tabs[0]);
const activeLayout = computed(() => layouts.value.find((layout) => layout.isActive) ?? null);
const wallpaperHostLabel = computed(() => {
  if (wallpaperHost.value === "WorkerW") return "WorkerW";
  if (wallpaperHost.value === "Progman") return "Progman";
  if (wallpaperHost.value.includes("fallback")) return "安全回退";
  return "检测中";
});
const locationSourceLabel = computed(() => {
  const labels: Record<string, string> = {
    ipwhois: "公网 IP",
    manual: "手动城市",
    cache: "缓存",
    openweathermap: "OpenWeatherMap",
    "open-meteo": "Open-Meteo"
  };
  return labels[weatherLocationSource.value] ?? weatherLocationSource.value;
});

const personalities = PET_PERSONALITIES;
const petCharacters = PET_CHARACTERS;
const baseUrl = import.meta.env.BASE_URL;
const filteredWallpapers = computed(() => {
  const query = wallpaperSearch.value.trim().toLowerCase();
  return wallpaperLibrary.value.filter((wallpaper) => {
    if (wallpaperStyleFilter.value !== "all" && wallpaper.style !== wallpaperStyleFilter.value) return false;
    if (!query) return true;
    return [wallpaper.label, wallpaper.style, ...wallpaper.aliases]
      .some((value) => value.toLowerCase().includes(query));
  });
});

function applyTheme(mode: "dark" | "light" | "system"): void {
  const resolved = mode === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : mode;
  document.documentElement.dataset.theme = resolved;
}
const recoverySystemItems = computed(() => {
  const snapshot = recoverySystemStatus.value;
  if (!snapshot) return [];
  return [
    { id: "explorer", label: "Windows Explorer", ...snapshot.explorer },
    { id: "wallpaper", label: "壁纸宿主", ...snapshot.wallpaperHost },
    { id: "shortcut", label: "全局快捷键", ...snapshot.shortcut },
    { id: "runtime", label: "运行时恢复", ...snapshot.runtimeRecovery }
  ];
});

const suppressionReasonLabels: Record<string, string> = {
  "runtime-quiet-hours": "系统静默时段",
  "runtime-fullscreen": "全屏应用运行中",
  "runtime-battery-saver": "省电模式",
  "runtime-low-battery": "电量较低",
  "delivery-disabled": "建议已关闭",
  "delivery-snoozed": "建议已暂缓",
  "delivery-muted": "建议已静音",
  "scheduled-quiet-hours": "免打扰时段",
  "insufficient-candidates": "候选文件不足",
  "duplicate-fingerprint": "相同批次已处理",
  "global-cooldown": "提醒冷却中",
  "kind-cooldown": "同类提醒冷却中",
  "daily-budget-exhausted": "今日提醒额度已用完",
  "kind-daily-budget-exhausted": "今日整理建议额度已用完",
  "policy-history-unavailable": "策略历史不可用"
};

function suppressionReasonLabel(reason: string): string {
  return suppressionReasonLabels[reason] ?? "建议暂未显示";
}

function formatSuppressionTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

async function loadSettings(): Promise<void> {
  const [nextLibrary, nextDisplays, nextSettings, nextLayouts, nextContainers, nextAutoRules, nextAppInfo, nextHost, nextLocationSource, nextRecoveryPath, nextPerformance, nextAutoActivate, nextLaunchAtLogin, nextCoverAllDisplays, nextCleanDesktopExitShortcut, nextThemeMode, nextWallpaperSaveOriginal, nextRuntimeState, nextPortals, nextScenes, nextActionHistory, nextInterruptedRecoveries, nextSuggestionDelivery, nextSuppressionHistory, nextPrivacyNetwork, nextRecoverySystemStatus, nextUpdateStatus] = await Promise.all([
    window.projectD.getWallpaperLibrary(),
    window.projectD.getWallpaperDisplays(),
    window.projectD.getSettings(),
    window.projectD.getLayouts(),
    window.projectD.getContainers(),
    window.projectD.getAutoRules(),
    window.projectD.getAppInfo(),
    window.projectD.getState("wallpaper_host").catch(() => null),
    window.projectD.getState("weather_location_source").catch(() => null),
    window.projectD.getState("recovery_script_path").catch(() => null),
    window.projectD.getState("performance_mode").catch(() => null),
    window.projectD.getState("auto_activate_on_start").catch(() => null),
    window.projectD.getState("launch_at_login").catch(() => null),
    window.projectD.getState("cover_all_displays").catch(() => null),
    window.projectD.getState("clean_desktop_exit_shortcut").catch(() => null),
    window.projectD.getState("theme_mode").catch(() => null),
    window.projectD.getState("wallpaper_save_original").catch(() => null),
    window.projectD.getRuntimeState(),
    window.projectD.getFolderPortals(),
    window.projectD.getWorkspaceScenes(),
    window.projectD.getActionHistory(),
    window.projectD.getInterruptedActionRecoveries(),
    window.projectD.getSuggestionDeliveryControls(),
    window.projectD.getSuggestionSuppressionHistory().catch(() => []),
    window.projectD.getPrivacyNetworkState(),
    window.projectD.getRecoverySystemStatus().catch(() => null),
    window.projectD.getUpdateStatus()
  ]);

  wallpaperLibrary.value = nextLibrary;
  wallpaperDisplays.value = nextDisplays;
  settings.value = nextSettings;
  layouts.value = nextLayouts;
  containers.value = nextContainers;
  autoRules.value = nextAutoRules;
  if (!ruleActionTarget.value) ruleActionTarget.value = String(nextContainers[0]?.id ?? "");
  appInfo.value = nextAppInfo;
  wallpaperHost.value = nextHost ?? "unknown";
  weatherLocationSource.value = nextLocationSource ?? "unknown";
  recoveryScriptPath.value = nextRecoveryPath ?? "";
  privacyNetwork.value = nextPrivacyNetwork;
  recoverySystemStatus.value = nextRecoverySystemStatus;
  updateStatus.value = nextUpdateStatus;
  performanceMode.value = nextPerformance ?? "auto";
  autoActivate.value = nextAutoActivate === "true";
  launchAtLogin.value = nextLaunchAtLogin === "true";
  coverAllDisplays.value = nextCoverAllDisplays === "true";
  cleanDesktopExitShortcut.value = nextCleanDesktopExitShortcut ?? "Escape";
  themeMode.value = nextThemeMode === "light" || nextThemeMode === "system" ? nextThemeMode : "dark";
  wallpaperSaveOriginal.value = nextWallpaperSaveOriginal === "true";
  applyTheme(themeMode.value);
  runtimeState.value = nextRuntimeState;
  portals.value = nextPortals;
  scenes.value = nextScenes;
  actionHistory.value = nextActionHistory;
  interruptedRecoveries.value = nextInterruptedRecoveries;
  suggestionDelivery.value = nextSuggestionDelivery;
  suggestionSuppressionHistory.value = nextSuppressionHistory;

  particleIntensity.value = Math.round(nextSettings.weather.particleIntensity * 100);
  petEnabled.value = nextSettings.pet.isVisible;
  petCharacterId.value = nextSettings.pet.characterId === "default" ? "luna-q" : nextSettings.pet.characterId;
  petPersonality.value = nextSettings.pet.personality;
  petPersonalityPreview.value = petSentence(nextSettings.pet.personality, () => 0);
  petTalkFrequency.value = nextSettings.pet.talkFrequency;
  petScale.value = Math.round(nextSettings.pet.scale * 100);
  petAutoOutfit.value = nextSettings.pet.autoOutfit;
  petCurrentOutfit.value = nextSettings.pet.currentOutfit;
  petActionInterval.value = nextSettings.pet.actionInterval;
  wallpaperDynamic.value = nextSettings.wallpaper.isDynamic;
  wallpaperStyle.value = nextSettings.wallpaper.currentStyle;
  selectedWallpaperId.value = nextSettings.wallpaper.dynamicId ?? nextLibrary[0]?.id ?? "";
  weatherMode.value = nextSettings.weather.mode;
  manualWeather.value = nextSettings.weather.manualWeather;
  city.value = nextSettings.weather.city ?? "";
  provider.value = nextSettings.ai.provider;
  aiEnabled.value = nextSettings.ai.enabled;
  aiEndpoint.value = nextSettings.ai.apiEndpoint;
  aiModel.value = nextSettings.ai.model;
  aiTemperature.value = Math.round(nextSettings.ai.temperature * 100);
  aiMaxTokens.value = nextSettings.ai.maxTokens;
  weatherApiKey.value = "";
  aiApiKey.value = "";
  saveStatus.value = "设置已载入";
  peekShortcut.value = (await window.projectD.getState("shortcut_peek")) ?? "Control+Alt+Space";
  runtimeMetrics.value = await window.projectD.getRuntimeMetrics().catch(() => null);

  try {
    currentWeather.value = await window.projectD.getCurrentWeather();
  } catch {
    currentWeather.value = null;
  }
}

onMounted(() => {
  document.documentElement.classList.add("settings-window-root");
  document.body.classList.add("settings-window-body");
  void loadSettings().catch((error) => {
    saveStatus.value = "设置载入失败，请查看日志";
    console.error("Failed to load Project D settings", error);
  });
  unsubscribePortals = window.projectD.onPortalsUpdated(() => {
    void refreshPortalsFromWatcher();
  });
  unsubscribeUpdateStatus = window.projectD.onUpdateStatusChanged((status) => {
    updateStatus.value = status;
  });
  unsubscribeRuntimeState = window.projectD.onRuntimeStateChanged((state) => {
    runtimeState.value = state;
  });
});

onUnmounted(() => {
  unsubscribePortals?.();
  unsubscribeUpdateStatus?.();
  unsubscribeRuntimeState?.();
  document.documentElement.classList.remove("settings-window-root");
  document.body.classList.remove("settings-window-body");
});

async function refreshPortalsFromWatcher(): Promise<void> {
  portals.value = await window.projectD.getFolderPortals();
  if (selectedPortalId.value) {
    portalResources.value = await window.projectD.getFolderPortalResources(selectedPortalId.value);
  }
}

async function openLogs(): Promise<void> {
  await window.projectD.openLogs();
}

async function changeUpdateChannel(channel: UpdateChannel): Promise<void> {
  updateBusy.value = true;
  try {
    updateStatus.value = await window.projectD.setUpdateChannel(channel);
    saveStatus.value = updateStatus.value.message;
  } finally {
    updateBusy.value = false;
  }
}

async function checkForUpdates(): Promise<void> {
  updateBusy.value = true;
  try {
    updateStatus.value = await window.projectD.checkForUpdates();
  } catch (error) {
    saveStatus.value = error instanceof Error ? error.message : "检查更新失败";
    updateStatus.value = await window.projectD.getUpdateStatus();
  } finally {
    updateBusy.value = false;
  }
}

async function recoverDesktop(): Promise<void> {
  await window.projectD.deactivateDesktop();
  saveStatus.value = "桌面已恢复";
}

async function setSuggestionDelivery(enabled: boolean): Promise<void> {
  await window.projectD.setSuggestionsEnabled(enabled);
  suggestionDelivery.value = await window.projectD.getSuggestionDeliveryControls();
  saveStatus.value = enabled ? "桌面整理建议已开启" : "桌面整理建议已关闭";
}

async function saveSuggestionPolicy(): Promise<void> {
  suggestionDelivery.value = await window.projectD.updateSuggestionPolicy({
    ...suggestionDelivery.value.policy,
    timeZoneOffsetMinutes: -new Date().getTimezoneOffset()
  });
  saveStatus.value = "建议时段与每日额度已更新";
}

async function previewDiagnostics(): Promise<void> {
  diagnosticsBusy.value = true;
  try {
    diagnosticsReport.value = await window.projectD.getDiagnosticsReport();
    saveStatus.value = "诊断摘要已在本机生成";
  } finally {
    diagnosticsBusy.value = false;
  }
}

async function exportDiagnostics(): Promise<void> {
  diagnosticsBusy.value = true;
  try {
    if (!diagnosticsConsent.value) {
      saveStatus.value = "请先确认诊断导出范围";
      return;
    }
    const result = await window.projectD.exportDiagnosticsReport({
      consent: true,
      includeRecentErrors: diagnosticsIncludeErrors.value
    });
    saveStatus.value = result.status === "saved" ? `诊断摘要已导出：${result.filename}` : "已取消导出";
  } finally {
    diagnosticsBusy.value = false;
  }
}

async function applyLayout(layout: LayoutRecord): Promise<void> {
  await window.projectD.applyLayout(layout.id);
  layouts.value = await window.projectD.getLayouts();
  saveStatus.value = `已应用 ${layout.name}`;
}

async function resetLayout(): Promise<void> {
  const layout = layouts.value.find((item) => item.columns === 4) ?? layouts.value[0];
  if (layout) await applyLayout(layout);
}

async function testWeather(): Promise<void> {
  weatherTestStatus.value = "测试中";
  try {
    const weather = await window.projectD.getCurrentWeather();
    currentWeather.value = weather;
    weatherTestStatus.value = weather.error
      ? `失败：${weather.error}`
      : `${weather.city || "自动定位"} · ${weather.condition} · ${weather.temperatureC ?? "--"}°C`;
  } catch (error) {
    weatherTestStatus.value = `失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

async function testAi(): Promise<void> {
  aiTestStatus.value = "正在保存配置并测试";
  try {
    settings.value = await window.projectD.updateSettings({
      ai: {
        enabled: aiEnabled.value,
        provider: provider.value,
        apiKey: aiApiKey.value,
        apiEndpoint: aiEndpoint.value,
        model: aiModel.value,
        temperature: aiTemperature.value / 100,
        maxTokens: aiMaxTokens.value
      }
    });
    aiApiKey.value = "";
    const result = await window.projectD.testAiConnection();
    aiTestStatus.value = result.message;
  } catch (error) {
    aiTestStatus.value = `失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

function applyAiProviderPreset(): void {
  aiTestStatus.value = "";
  if (provider.value === "deepseek") {
    aiEnabled.value = true;
    aiEndpoint.value = "https://api.deepseek.com/chat/completions";
    if (!deepSeekModels.some(([model]) => model === aiModel.value)) {
      aiModel.value = "deepseek-v4-flash";
    }
    return;
  }
  if (provider.value === "local-fallback") {
    aiEndpoint.value = "";
    aiModel.value = "";
  }
}

async function clearChatHistory(): Promise<void> {
  await window.projectD.clearChatHistory();
  aiTestStatus.value = "对话历史已清空";
}

async function resetPetPosition(): Promise<void> {
  await window.projectD.resetPetWindow();
  saveStatus.value = "桌宠位置已复位";
}

async function previewPetPersonality(personalityId: string): Promise<void> {
  petPersonality.value = personalityId;
  petPersonalityPreview.value = petSentence(personalityId, () => 0);
  try {
    settings.value = await window.projectD.updateSettings({ pet: { personality: personalityId } });
    saveStatus.value = `已应用人格：${PET_PERSONALITIES.find(([id]) => id === personalityId)?.[1] ?? personalityId}`;
  } catch (error) {
    saveStatus.value = `人格应用失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

async function addPortal(): Promise<void> {
  const selectedPath = await window.projectD.chooseFolderPortal();
  if (!selectedPath) return;
  const suggestedName = selectedPath.split(/[\\/]/).filter(Boolean).pop() ?? "文件门户";
  const name = window.prompt("门户名称", suggestedName);
  if (name === null) return;
  const portal = await window.projectD.addFolderPortal(selectedPath, name);
  portals.value = [portal, ...portals.value.filter((item) => item.id !== portal.id)];
  selectedPortalId.value = portal.id;
  portalResources.value = await window.projectD.getFolderPortalResources(portal.id);
  saveStatus.value = "已授权只读门户";
}

async function inspectPortal(portalId: string): Promise<void> {
  selectedPortalId.value = portalId;
  portalResources.value = await window.projectD.getFolderPortalResources(portalId);
}

async function removePortal(portalId: string): Promise<void> {
  const portal = portals.value.find((item) => item.id === portalId);
  if (!portal || !window.confirm(`撤销“${portal.name}”的目录读取授权吗？不会删除原文件。`)) return;
  await window.projectD.removeFolderPortal(portalId);
  portals.value = portals.value.filter((item) => item.id !== portalId);
  if (selectedPortalId.value === portalId) {
    selectedPortalId.value = null;
    portalResources.value = [];
  }
  saveStatus.value = "门户授权已撤销";
}

async function refreshPrivacyCenter(): Promise<void> {
  privacyStatus.value = "正在核对授权与用量";
  const [nextPortals, nextSettings, nextDiagnostics, nextPrivacyNetwork] = await Promise.all([
    window.projectD.getFolderPortals(),
    window.projectD.getSettings(),
    window.projectD.getDiagnosticsReport(),
    window.projectD.getPrivacyNetworkState()
  ]);
  portals.value = nextPortals;
  settings.value = nextSettings;
  diagnosticsReport.value = nextDiagnostics;
  privacyNetwork.value = nextPrivacyNetwork;
  privacyStatus.value = `已核对 ${nextPortals.length} 个目录授权 · ${new Date().toLocaleTimeString()}`;
}

async function togglePrivacyNetwork(): Promise<void> {
  privacyBusy.value = true;
  try {
    privacyNetwork.value = await window.projectD.setPrivacyNetworkPaused(!privacyNetwork.value.paused);
    privacyStatus.value = privacyNetwork.value.paused
      ? "联网服务已暂停，本地整理与本地助手仍可使用"
      : "联网服务已恢复";
  } finally {
    privacyBusy.value = false;
  }
}

function replayOnboarding(): void {
  resetOnboarding(localStorage);
  saveStatus.value = "新手引导已重置，下次打开主窗口时显示";
}

async function exportUserData(): Promise<void> {
  privacyBusy.value = true;
  privacyStatus.value = "正在准备完整数据副本";
  try {
    const result = await window.projectD.exportAllData();
    privacyStatus.value = result.cancelled ? "已取消导出" : `已导出：${result.filename}`;
  } catch {
    privacyStatus.value = "导出失败，请查看日志";
  } finally {
    privacyBusy.value = false;
  }
}

async function resetUserData(): Promise<void> {
  const first = window.confirm("这会清除 Project D 的设置、场景、聊天、动作历史和目录授权，不会删除或移动你的原文件。继续吗？");
  if (!first) return;
  const second = window.confirm("应用将立即重启，清除后无法恢复。确定彻底删除 Project D 本机数据吗？");
  if (!second) return;
  privacyBusy.value = true;
  privacyStatus.value = "正在安全退出并清除本机数据";
  try {
    await window.projectD.resetAllData();
  } catch {
    privacyBusy.value = false;
    privacyStatus.value = "清除失败，原数据仍保留，请查看日志";
  }
}

async function clearRuntimeCache(): Promise<void> {
  privacyBusy.value = true;
  try {
    const result = await window.projectD.clearRuntimeCache();
    saveStatus.value = `运行缓存已清理 · ${new Date(result.at).toLocaleTimeString()}`;
  } finally {
    privacyBusy.value = false;
  }
}

async function openPortalResource(resource: PortalResource): Promise<void> {
  if (resource.status !== "ready" || !resource.relativePath || !selectedPortalId.value) return;
  await window.projectD.openFolderPortalResource(selectedPortalId.value, resource.relativePath);
}

async function saveScene(): Promise<void> {
  const name = window.prompt("工作场景名称", "工作");
  if (name === null) return;
  const scene = await window.projectD.saveWorkspaceScene(name);
  scenes.value = [scene, ...scenes.value.filter((item) => item.id !== scene.id)];
  saveStatus.value = `已保存场景：${scene.name}`;
}

async function applyScene(scene: WorkspaceScene): Promise<void> {
  await window.projectD.applyWorkspaceScene(scene.id);
  await loadSettings();
  saveStatus.value = `已恢复场景：${scene.name}`;
}

async function createRule(): Promise<void> {
  const name = ruleName.value.trim();
  if (!name || !ruleValue.value.trim()) {
    saveStatus.value = "请填写规则名称和匹配值";
    return;
  }
  const actionTarget = ruleActionType.value === "hide" ? "" : ruleActionTarget.value.trim();
  if (ruleActionType.value !== "hide" && !actionTarget) {
    saveStatus.value = "请选择或填写动作目标";
    return;
  }
  const rule: AutoRule = {
    id: crypto.randomUUID(),
    name,
    conditions: [{ field: ruleField.value, operator: ruleOperator.value, value: ruleValue.value.trim() }],
    action: { type: ruleActionType.value, target: actionTarget },
    priority: autoRules.value.length,
    enabled: true,
    runCount: 0,
    lastRunAt: null,
    createdAt: new Date().toISOString()
  };
  const saved = await window.projectD.saveAutoRule(rule);
  autoRules.value = [...autoRules.value.filter((item) => item.id !== saved.id), saved].sort((a, b) => a.priority - b.priority);
  ruleName.value = "";
  saveStatus.value = `已保存规则：${saved.name}`;
}

async function setRuleEnabled(rule: AutoRule, enabled: boolean): Promise<void> {
  const saved = await window.projectD.saveAutoRule({ ...rule, enabled });
  autoRules.value = autoRules.value.map((item) => item.id === saved.id ? saved : item);
}

async function deleteRule(rule: AutoRule): Promise<void> {
  if (!window.confirm(`删除规则“${rule.name}”吗？不会改动任何文件。`)) return;
  await window.projectD.deleteAutoRule(rule.id);
  autoRules.value = autoRules.value.filter((item) => item.id !== rule.id);
  rulePreview.value = rulePreview.value.filter((item) => item.ruleId !== rule.id);
  saveStatus.value = "规则已删除";
}

async function previewRules(): Promise<void> {
  rulePreview.value = await window.projectD.previewAutoRules();
  const matched = rulePreview.value.reduce((total, item) => total + item.fileIds.length, 0);
  saveStatus.value = `规则预览完成：${matched} 个匹配项，尚未修改文件`;
}

function ruleMatchCount(ruleId: string): number {
  return rulePreview.value.find((item) => item.ruleId === ruleId)?.fileIds.length ?? 0;
}

async function undoExecution(execution: ActionExecution): Promise<void> {
  const restored = await window.projectD.undoActionExecution(execution.id);
  actionHistory.value = [restored, ...actionHistory.value.filter((item) => item.id !== restored.id)];
  saveStatus.value = restored.summary;
}

async function resumeInterrupted(report: InterruptedActionRecovery): Promise<void> {
  if (!window.confirm("继续执行可安全恢复的项目吗？存在变化的文件不会被覆盖。")) return;
  const execution = await window.projectD.resumeActionExecution(report.executionId);
  interruptedRecoveries.value = interruptedRecoveries.value.filter((item) => item.executionId !== report.executionId);
  actionHistory.value = [execution, ...actionHistory.value.filter((item) => item.id !== execution.id)];
  saveStatus.value = execution.summary;
}

async function rollbackInterrupted(report: InterruptedActionRecovery): Promise<void> {
  if (!window.confirm("回滚已完成的移动并放弃尚未执行的项目吗？不会覆盖已有文件。")) return;
  const execution = await window.projectD.rollbackActionExecution(report.executionId);
  interruptedRecoveries.value = interruptedRecoveries.value.filter((item) => item.executionId !== report.executionId);
  actionHistory.value = [execution, ...actionHistory.value.filter((item) => item.id !== execution.id)];
  saveStatus.value = execution.summary;
}

async function applySelectedWallpaper(): Promise<void> {
  if (!selectedWallpaperId.value) {
    saveStatus.value = "壁纸库为空";
    return;
  }
  settings.value = await window.projectD.applyWallpaper(selectedWallpaperId.value);
  wallpaperDisplays.value = await window.projectD.getWallpaperDisplays();
  wallpaperDynamic.value = settings.value.wallpaper.isDynamic;
  wallpaperStyle.value = settings.value.wallpaper.currentStyle;
  saveStatus.value = "壁纸已应用";
  if (wallpaperSaveOriginal.value) {
    const exported = await window.projectD.exportWallpaperOriginal(selectedWallpaperId.value);
    saveStatus.value = exported.cancelled ? "壁纸已应用，原图保存已取消" : `壁纸已应用并保存：${exported.filename}`;
  }
}

async function applyWallpaperNow(wallpaperId: string): Promise<void> {
  selectedWallpaperId.value = wallpaperId;
  await applySelectedWallpaper();
}

async function exportSelectedWallpaper(): Promise<void> {
  if (!selectedWallpaperId.value) return;
  const result = await window.projectD.exportWallpaperOriginal(selectedWallpaperId.value);
  saveStatus.value = result.cancelled ? "已取消保存原图" : `原图已保存：${result.filename}`;
}

async function importWallpaper(): Promise<void> {
  const imported = await window.projectD.importWallpaper();
  if (!imported) return;
  wallpaperLibrary.value = await window.projectD.getWallpaperLibrary();
  selectedWallpaperId.value = imported.id;
  wallpaperStyle.value = "user";
  saveStatus.value = `已导入本地壁纸：${imported.label}`;
}

async function deleteWallpaper(wallpaper: WallpaperLibraryItem): Promise<void> {
  if (wallpaper.source !== "user") return;
  if (!window.confirm(`删除“${wallpaper.label}”及其本地副本？`)) return;
  await window.projectD.deleteWallpaper(wallpaper.id);
  wallpaperLibrary.value = await window.projectD.getWallpaperLibrary();
  if (selectedWallpaperId.value === wallpaper.id) {
    selectedWallpaperId.value = wallpaperLibrary.value[0]?.id ?? "";
  }
  wallpaperDisplays.value = await window.projectD.getWallpaperDisplays();
  saveStatus.value = "本地壁纸已删除";
}

async function assignWallpaper(displayId: string, wallpaperId: string): Promise<void> {
  wallpaperDisplays.value = await window.projectD.assignWallpaperToDisplay(displayId, wallpaperId || null);
  saveStatus.value = "显示器壁纸已更新";
}

function selectWallpaper(wallpaperId: string): void {
  selectedWallpaperId.value = wallpaperId;
  wallpaperStyle.value = "user";
}

function wallpaperThumbUrl(wallpaper: WallpaperLibraryItem): string {
  if (wallpaper.source === "user") {
    return `projectd-media://wallpaper/${encodeURIComponent(wallpaper.id)}?variant=thumbnail`;
  }
  const file = wallpaper.type === "video" ? wallpaper.posterFile : wallpaper.file;
  return file ? `${import.meta.env.BASE_URL}wallpapers/${file}` : "";
}

async function loadWallpaperStudioImage(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 30 * 1024 * 1024) {
    wallpaperStudioStatus.value = "请选择 30 MB 以内的图片";
    return;
  }
  wallpaperStudioSource.value = await readLocalImage(file);
  await renderWallpaperStudio();
}

async function renderWallpaperStudio(): Promise<void> {
  const canvas = wallpaperStudioCanvas.value;
  if (!canvas || !wallpaperStudioSource.value) return;
  const image = new Image();
  image.src = wallpaperStudioSource.value;
  await image.decode();
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) return;
  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);

  const sticker = {
    none: "",
    sparkles: "\u2726  \u2727  \u2726",
    heart: "\u2665",
    moon: "\u263E"
  }[wallpaperStudioSticker.value];
  if (sticker) {
    context.save();
    context.font = "700 54px 'Segoe UI Symbol', sans-serif";
    context.fillStyle = "rgba(255, 244, 188, 0.92)";
    context.shadowColor = "rgba(0, 0, 0, 0.45)";
    context.shadowBlur = 14;
    context.fillText(sticker, 54, 78);
    context.restore();
  }

  const signature = wallpaperStudioSignature.value.trim().slice(0, 60);
  if (signature) {
    context.save();
    context.font = "500 30px 'Segoe UI', sans-serif";
    context.textAlign = "right";
    context.fillStyle = "rgba(255, 255, 255, 0.94)";
    context.shadowColor = "rgba(0, 0, 0, 0.72)";
    context.shadowBlur = 9;
    context.fillText(signature, canvas.width - 48, canvas.height - 42);
    context.restore();
  }
  wallpaperStudioStatus.value = "壁纸画布已更新";
}

function exportWallpaperStudioPng(): void {
  const canvas = wallpaperStudioCanvas.value;
  if (!canvas || !wallpaperStudioSource.value) return;
  downloadCanvasPng(canvas, `project-d-wallpaper-${Date.now()}.png`);
  wallpaperStudioStatus.value = "壁纸 PNG 已导出";
}

function readLocalImage(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

async function loadPetStudioImage(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) {
    petStudioStatus.value = "请选择 20 MB 以内的图片";
    return;
  }
  petStudioSource.value = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  await removePetStudioBackground();
}

async function removePetStudioBackground(): Promise<void> {
  const canvas = petStudioCanvas.value;
  if (!canvas || !petStudioSource.value) return;
  const image = new Image();
  image.src = petStudioSource.value;
  await image.decode();
  const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;
  const width = canvas.width;
  const height = canvas.height;
  const cornerIndexes = [0, width - 1, (height - 1) * width, height * width - 1];
  const backgrounds = cornerIndexes.map((index) => [data[index * 4], data[index * 4 + 1], data[index * 4 + 2]]);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const thresholdSquared = petStudioThreshold.value ** 2;
  const enqueue = (index: number) => {
    if (visited[index]) return;
    visited[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 0; y < height; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++];
    const offset = index * 4;
    const removable = backgrounds.some(([red, green, blue]) => {
      const dr = data[offset] - red;
      const dg = data[offset + 1] - green;
      const db = data[offset + 2] - blue;
      return dr * dr + dg * dg + db * db <= thresholdSquared;
    });
    if (!removable) continue;
    data[offset + 3] = 0;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }
  context.putImageData(pixels, 0, 0);
  petStudioStatus.value = "背景已在本机抠除，可调整阈值后重新处理";
}

function exportPetStudioPng(): void {
  const canvas = petStudioCanvas.value;
  if (!canvas || !petStudioSource.value) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-d-pet-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(url);
    petStudioStatus.value = "透明 PNG 已导出";
  }, "image/png");
}

async function saveSettings(): Promise<void> {
  settings.value = await window.projectD.updateSettings({
    wallpaper: {
      isDynamic: wallpaperDynamic.value,
      currentStyle: wallpaperStyle.value,
      dynamicId: wallpaperStyle.value === "user" ? selectedWallpaperId.value : null,
      currentIndex: (settings.value?.wallpaper.currentIndex ?? 0) + 1
    },
    weather: {
      mode: weatherMode.value,
      manualWeather: manualWeather.value,
      city: city.value,
      apiKey: weatherApiKey.value,
      particleIntensity: particleIntensity.value / 100
    },
    pet: {
      isVisible: petEnabled.value,
      characterId: petCharacterId.value,
      personality: petPersonality.value,
      talkFrequency: petTalkFrequency.value,
      scale: petScale.value / 100,
      autoOutfit: petAutoOutfit.value,
      currentOutfit: petCurrentOutfit.value,
      actionInterval: petActionInterval.value
    },
    ai: {
      enabled: aiEnabled.value,
      provider: provider.value,
      apiKey: aiApiKey.value,
      apiEndpoint: aiEndpoint.value,
      model: aiModel.value,
      temperature: aiTemperature.value / 100,
      maxTokens: aiMaxTokens.value
    },
    appState: {
      auto_activate_on_start: autoActivate.value ? "true" : "false",
      launch_at_login: launchAtLogin.value ? "true" : "false",
      cover_all_displays: coverAllDisplays.value ? "true" : "false",
      performance_mode: performanceMode.value,
      clean_desktop_exit_shortcut: cleanDesktopExitShortcut.value,
      theme_mode: themeMode.value,
      wallpaper_save_original: wallpaperSaveOriginal.value ? "true" : "false"
    }
  });
  applyTheme(themeMode.value);

  weatherApiKey.value = "";
  aiApiKey.value = "";
  saveStatus.value = `已保存 ${new Date().toLocaleTimeString()}`;
}
</script>

<template>
  <main class="settings-app">
    <aside class="settings-sidebar">
      <div class="settings-brand">
        <span>D</span>
        <div><strong>Project D</strong><small>设置中心</small></div>
      </div>
      <nav aria-label="设置分类">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="18" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>
      <div class="sidebar-runtime">
        <span>{{ wallpaperHostLabel }}</span>
        <small>v{{ appInfo?.version ?? appVersionFallback }}</small>
      </div>
    </aside>

    <section class="settings-workspace">
      <header class="settings-commandbar">
        <div>
          <p>设置</p>
          <h1>{{ activeTabMeta.label }}</h1>
        </div>
        <div class="settings-command-actions">
          <button class="icon-command" type="button" title="打开日志" @click="openLogs"><FolderOpen :size="18" /></button>
          <button class="primary-command" type="button" @click="saveSettings"><Save :size="17" /><span>保存</span></button>
        </div>
      </header>

      <div class="settings-content">
        <section v-if="activeTab === 'general'" class="settings-pane">
          <div class="settings-group">
            <h2>启动</h2>
            <label class="setting-row">
              <span><strong>启动后自动整理</strong><small>auto activate</small></span>
              <input v-model="autoActivate" class="switch-input" type="checkbox" />
            </label>
            <label class="setting-row">
              <span><strong>登录后启动</strong><small>在后台启动 Project D，不自动接管桌面</small></span>
              <input v-model="launchAtLogin" class="switch-input" type="checkbox" />
            </label>
            <label class="setting-row">
              <span><strong>覆盖全部显示器</strong><small>主屏显示容器，其他屏显示壁纸与天气舞台</small></span>
              <input v-model="coverAllDisplays" class="switch-input" type="checkbox" />
            </label>
            <label class="setting-row">
              <span><strong>性能模式</strong><small>render profile</small></span>
              <select v-model="performanceMode">
                <option value="auto">自动</option>
                <option value="quality">高质量</option>
                <option value="balanced">平衡</option>
                <option value="batterySaver">省电</option>
              </select>
            </label>
            <label class="setting-row">
              <span><strong>退出纯净桌面</strong><small>仅在纯净桌面期间注册</small></span>
              <select v-model="cleanDesktopExitShortcut">
                <option value="Escape">Esc</option>
                <option value="F12">F12</option>
                <option value="Control+Shift+Q">Ctrl + Shift + Q</option>
              </select>
            </label>
            <label class="setting-row">
              <span><strong>外观模式</strong><small>设置页与主控制台同步</small></span>
              <select v-model="themeMode" @change="applyTheme(themeMode)">
                <option value="dark">深色</option>
                <option value="light">浅色</option>
                <option value="system">跟随系统</option>
              </select>
            </label>
            <label class="setting-row">
              <span><strong>动态效果</strong><small>{{ runtimePauseDetail }}</small></span>
              <input
                :checked="!runtimeState?.manual"
                class="switch-input"
                type="checkbox"
                @change="setManualRuntimePause(!($event.target as HTMLInputElement).checked)"
              />
            </label>
            <label class="setting-row">
              <span><strong>桌面整理建议</strong><small>{{ suggestionDelivery.disabled ? "已关闭" : suggestionDelivery.snoozedUntil ? "暂缓提醒" : "事件触发" }}</small></span>
              <input :checked="!suggestionDelivery.disabled" class="switch-input" type="checkbox" @change="setSuggestionDelivery(($event.target as HTMLInputElement).checked)" />
            </label>
            <label class="setting-row">
              <span><strong>免打扰时段</strong><small>{{ suggestionDelivery.policy.quietHours.start }} - {{ suggestionDelivery.policy.quietHours.end }}，跨午夜自动识别</small></span>
              <input v-model="suggestionDelivery.policy.quietHours.enabled" class="switch-input" type="checkbox" @change="saveSuggestionPolicy" />
            </label>
            <div v-if="suggestionDelivery.policy.quietHours.enabled" class="setting-row suggestion-time-row">
              <span><strong>静默时间</strong><small>使用电脑当前时区</small></span>
              <div class="time-range">
                <input v-model="suggestionDelivery.policy.quietHours.start" type="time" aria-label="免打扰开始时间" @change="saveSuggestionPolicy" />
                <span>至</span>
                <input v-model="suggestionDelivery.policy.quietHours.end" type="time" aria-label="免打扰结束时间" @change="saveSuggestionPolicy" />
              </div>
            </div>
            <label class="setting-row">
              <span><strong>每日总提醒上限</strong><small>所有智能建议共享的打扰预算</small></span>
              <select v-model.number="suggestionDelivery.policy.dailyBudget" @change="saveSuggestionPolicy">
                <option :value="1">1 次</option>
                <option :value="2">2 次</option>
                <option :value="3">3 次</option>
                <option :value="5">5 次</option>
              </select>
            </label>
            <label class="setting-row">
              <span><strong>桌面整理每日上限</strong><small>单独限制桌面文件整理建议</small></span>
              <select v-model.number="suggestionDelivery.policy.perKind['desktop-inbox'].dailyBudget" @change="saveSuggestionPolicy">
                <option :value="1">1 次</option><option :value="2">2 次</option><option :value="3">3 次</option>
              </select>
            </label>
            <label class="setting-row">
              <span><strong>同类提醒冷却</strong><small>同一类建议至少间隔多久</small></span>
              <select v-model.number="suggestionDelivery.policy.perKind['desktop-inbox'].cooldownMs" @change="saveSuggestionPolicy">
                <option :value="3_600_000">1 小时</option><option :value="10_800_000">3 小时</option><option :value="21_600_000">6 小时</option><option :value="43_200_000">12 小时</option>
              </select>
            </label>
          </div>
          <div class="settings-group">
            <div class="group-heading">
              <div><h2>最近抑制</h2><p class="runtime-line">说明 Project D 为什么没有打扰你，仅保留最近 20 条。</p></div>
              <span class="privacy-count">{{ suggestionSuppressionHistory.length }}</span>
            </div>
            <div class="suggestion-suppression-list">
              <article v-for="(entry, index) in suggestionSuppressionHistory" :key="`${entry.suppressedAt}:${entry.reason}:${index}`">
                <History :size="16" />
                <span><strong>{{ suppressionReasonLabel(entry.reason) }}</strong><small>{{ entry.explanation }}</small></span>
                <time :datetime="entry.suppressedAt">{{ formatSuppressionTime(entry.suppressedAt) }}</time>
              </article>
              <p v-if="suggestionSuppressionHistory.length === 0" class="runtime-line">暂无抑制记录。建议正常投递时不会出现在这里。</p>
            </div>
          </div>
          <div class="settings-group">
            <h2>恢复</h2>
            <div class="setting-row">
              <span><strong>系统桌面</strong><small>{{ recoveryScriptPath || "恢复脚本已生成" }}</small></span>
              <button class="secondary-command" type="button" @click="recoverDesktop"><RotateCcw :size="17" /><span>立即恢复</span></button>
            </div>
          </div>
          <div class="settings-group">
            <h2>软件更新</h2>
            <label class="setting-row">
              <span><strong>版本偏好</strong><small>Project D 不会在后台请求、下载或安装更新</small></span>
              <select :value="updateStatus.channel" :disabled="updateBusy" @change="changeUpdateChannel(($event.target as HTMLSelectElement).value as UpdateChannel)">
                <option value="stable">稳定通道</option>
                <option value="beta">灰度体验</option>
              </select>
            </label>
            <div class="setting-row update-status-row">
              <span><strong>{{ updateStatus.message }}</strong><small>当前版本 {{ updateStatus.currentVersion }} · 下载后请核对 SHA256</small></span>
              <div class="update-actions">
                <button class="secondary-command" type="button" :disabled="updateBusy || !updateStatus.feedConfigured" @click="checkForUpdates"><ExternalLink :size="16" /><span>打开 Releases</span></button>
              </div>
            </div>
          </div>
          <div class="settings-group">
            <h2>快捷键</h2>
            <div class="setting-row">
              <span><strong>Peek 快捷键</strong><small>{{ peekShortcutRecording ? '请按下组合键，Enter 确认，Esc 取消' : '点击输入框录制新的快捷键' }}</small></span>
              <div class="shortcut-input-wrap">
                <input
                  type="text"
                  class="shortcut-record-input"
                  :value="peekShortcutRecording ? '按下组合键...' : peekShortcut"
                  readonly
                  :data-recording="peekShortcutRecording"
                  @focus="startPeekShortcutRecording"
                  @keydown="onPeekShortcutKeydown"
                />
                <span v-if="peekShortcutError" class="shortcut-error">{{ peekShortcutError }}</span>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="activeTab === 'layout'" class="settings-pane">
          <div class="settings-group">
            <div class="group-heading"><h2>布局方案</h2><button class="icon-command" type="button" title="重置为 4 列" @click="resetLayout"><RefreshCcw :size="17" /></button></div>
            <div class="layout-choice-grid">
              <button
                v-for="layout in layouts"
                :key="layout.id"
                type="button"
                :class="{ selected: layout.isActive }"
                @click="applyLayout(layout)"
              >
                <span class="layout-mini-grid" :style="{ '--layout-cols': String(Math.min(layout.columns, 4)) }">
                  <i v-for="cell in Math.min(layout.columns, 8)" :key="cell"></i>
                </span>
                <strong>{{ layout.columns }} 列</strong>
                <small>{{ layout.name }}</small>
              </button>
            </div>
            <p class="runtime-line">当前：{{ activeLayout?.name ?? "默认 4 列" }}</p>
          </div>
        </section>

        <section v-else-if="activeTab === 'rules'" class="settings-pane">
          <div class="settings-group">
            <div class="group-heading"><div><h2>新建自动规则</h2><p class="runtime-line">先预览命中项；真实文件动作仍进入 ActionPlan 审核。</p></div><button class="secondary-command" type="button" @click="createRule"><Save :size="16" /><span>保存规则</span></button></div>
            <div class="rule-editor-grid">
              <label class="field-wide"><span>规则名称</span><input v-model="ruleName" type="text" maxlength="60" placeholder="例如：PDF 归入文档" /></label>
              <label><span>匹配字段</span><select v-model="ruleField"><option value="extension">扩展名</option><option value="category">类别</option><option value="filename-contains">文件名</option><option value="age-days">修改时间</option></select></label>
              <label><span>条件</span><select v-model="ruleOperator"><option value="equals">等于</option><option value="contains">包含</option><option value="greater-than">大于</option></select></label>
              <label><span>匹配值</span><input v-model="ruleValue" type="text" maxlength="80" placeholder=".pdf" /></label>
              <label><span>动作</span><select v-model="ruleActionType"><option value="move-to-container">归入容器</option><option value="tag">设置标签</option><option value="hide">从整理层隐藏</option></select></label>
              <label v-if="ruleActionType === 'move-to-container'" class="field-wide"><span>目标容器</span><select v-model="ruleActionTarget"><option v-for="container in containers" :key="container.id" :value="String(container.id)">{{ container.name }}</option></select></label>
              <label v-else-if="ruleActionType === 'tag'" class="field-wide"><span>标签</span><input v-model="ruleActionTarget" type="text" maxlength="80" placeholder="工作" /></label>
            </div>
          </div>
          <div class="settings-group">
            <div class="group-heading"><div><h2>规则列表</h2><p class="runtime-line">{{ autoRules.length }} 条规则 · 预览不会修改文件</p></div><button class="secondary-command" type="button" @click="previewRules"><PlayCircle :size="16" /><span>预览命中</span></button></div>
            <div class="rule-list">
              <article v-for="rule in autoRules" :key="rule.id">
                <input class="switch-input" type="checkbox" :checked="rule.enabled" @change="setRuleEnabled(rule, ($event.target as HTMLInputElement).checked)" />
                <span><strong>{{ rule.name }}</strong><small>{{ rule.conditions[0]?.field }} {{ rule.conditions[0]?.operator }} {{ rule.conditions[0]?.value }} · 命中 {{ ruleMatchCount(rule.id) }} 项</small></span>
                <button class="danger-command" type="button" title="删除规则" @click="deleteRule(rule)"><Trash2 :size="15" /></button>
              </article>
              <p v-if="autoRules.length === 0" class="runtime-line">尚未创建自动规则。</p>
            </div>
          </div>
        </section>

        <section v-else-if="activeTab === 'portal'" class="settings-pane">
          <div class="settings-group">
            <div class="group-heading"><div><h2>只读文件门户</h2><p class="runtime-line">只展示你在原生目录选择器中明确授权的目录，不复制文件也不自动写入。</p></div><button class="secondary-command" type="button" @click="addPortal"><FolderPlus :size="16" /><span>添加门户</span></button></div>
            <div class="portal-list">
              <article v-for="portal in portals" :key="portal.id" :class="{ selected: selectedPortalId === portal.id }">
                <button type="button" class="portal-open" @click="inspectPortal(portal.id)"><FolderOpen :size="18" /><span><strong>{{ portal.name }}</strong><small>{{ portal.path }}</small></span></button>
                <button class="danger-command" type="button" title="撤销目录授权" @click="removePortal(portal.id)"><Trash2 :size="15" /></button>
              </article>
              <p v-if="portals.length === 0" class="runtime-line">还没有授权目录。添加后可在桌面工作空间中以只读方式快速浏览。</p>
            </div>
          </div>
          <div v-if="selectedPortalId" class="settings-group">
            <div class="group-heading"><h2>门户内容</h2><button class="icon-command" type="button" title="刷新门户内容" @click="inspectPortal(selectedPortalId!)"><RefreshCcw :size="16" /></button></div>
            <div class="portal-resource-list">
              <button v-for="resource in portalResources" :key="`${resource.relativePath}-${resource.name}`" type="button" :disabled="resource.status !== 'ready'" @dblclick="openPortalResource(resource)">
                <FolderOpen v-if="resource.isDirectory" :size="17" /><FileText v-else :size="17" />
                <span><strong>{{ resource.name }}</strong><small>{{ resource.status === "ready" ? "双击打开 · 只读门户" : resource.status }}</small></span>
              </button>
            </div>
          </div>
          <div class="settings-group">
            <div class="group-heading"><div><h2>工作场景</h2><p class="runtime-line">保存布局、壁纸、性能策略和桌宠显示状态。</p></div><button class="secondary-command" type="button" @click="saveScene"><Layers3 :size="16" /><span>保存当前场景</span></button></div>
            <div class="scene-list"><button v-for="scene in scenes" :key="scene.id" type="button" @click="applyScene(scene)"><span><strong>{{ scene.name }}</strong><small>{{ new Date(scene.createdAt).toLocaleDateString() }} · {{ scene.containerLayout.length }}个容器 · {{ scene.pinnedResources?.length ?? 0 }}项钉选</small></span><RotateCcw :size="16" /></button><p v-if="scenes.length === 0" class="runtime-line">还没有保存场景。</p></div>
          </div>
        </section>

        <section v-else-if="activeTab === 'privacy'" class="settings-pane privacy-pane">
          <div class="privacy-summary">
            <ShieldCheck :size="24" />
            <div><strong>你的数据边界清晰可见</strong><span>{{ privacyStatus }}</span></div>
            <button class="icon-command" type="button" title="刷新隐私状态" @click="refreshPrivacyCenter"><RefreshCcw :size="16" /></button>
          </div>

          <div class="settings-group">
            <div class="group-heading"><div><h2>已授权目录</h2><p class="runtime-line">仅列出通过 Windows 原生目录选择器授予的只读门户。</p></div><span class="privacy-count">{{ portals.length }}</span></div>
            <div class="privacy-permission-list">
              <article v-for="portal in portals" :key="portal.id">
                <FolderOpen :size="18" />
                <span><strong>{{ portal.name }}</strong><small>{{ portal.path }}</small></span>
                <button class="danger-command" type="button" title="撤销目录授权" @click="removePortal(portal.id)"><Trash2 :size="15" /></button>
              </article>
              <p v-if="portals.length === 0" class="runtime-line">当前没有额外目录授权。Project D 仍只读取系统桌面。</p>
            </div>
          </div>

          <div class="settings-group">
            <h2>服务与用量</h2>
            <dl class="privacy-usage-grid">
              <div><dt>AI 对话</dt><dd>{{ privacyNetwork.paused ? "仅本地" : settings?.ai.enabled ? `${settings.ai.dailyCount} / ${settings.ai.dailyLimit}` : "已关闭" }}</dd><small>{{ privacyNetwork.paused ? "云端 Provider 已暂停" : settings?.ai.provider || "本地降级" }} · 密钥加密存储</small></div>
              <div><dt>天气</dt><dd>{{ privacyNetwork.paused ? "缓存模式" : settings?.weather.mode === "auto" ? "自动定位" : "手动城市" }}</dd><small>{{ privacyNetwork.paused ? "不发起定位与天气请求" : `${currentWeather?.source || "尚未请求"} · ${locationSourceLabel}` }}</small></div>
              <div><dt>诊断</dt><dd>{{ diagnosticsReport ? "本机预览可用" : "未生成" }}</dd><small>不自动上传，不包含聊天和文件名</small></div>
              <div><dt>桌面建议</dt><dd>{{ suggestionDelivery.disabled ? "已关闭" : "已开启" }}</dd><small>每日最多 {{ suggestionDelivery.policy.dailyBudget }} 次</small></div>
            </dl>
          </div>

          <div class="settings-group">
            <h2>本机数据说明</h2>
            <div class="privacy-data-list">
              <div><LockKeyhole :size="17" /><span><strong>保存在本机</strong><small>设置、布局、动作历史、聊天历史与加密后的 API Key</small></span></div>
              <div><ShieldCheck :size="17" /><span><strong>需要明确操作</strong><small>目录授权、真实文件整理、诊断导出和桌面图标隐藏</small></span></div>
              <div><FileText :size="17" /><span><strong>不会自动收集</strong><small>文件内容、完整磁盘索引、浏览器记录和其他应用数据</small></span></div>
            </div>
            <details class="privacy-agreement">
              <summary>隐私协议摘要</summary>
              <p>Project D 默认在本机处理桌面文件索引、布局、聊天记录和设置。未经明确操作，不上传桌面文件名、完整路径、聊天内容或诊断日志。</p>
              <p>天气自动定位和第三方 AI 仅在对应功能开启且未暂停联网时请求外部服务；API Key 通过 Windows 安全存储加密。</p>
              <p>目录门户必须由用户通过系统选择器授权；真实文件移动执行前提供方案预览，并保留可撤销记录。</p>
            </details>
            <div class="privacy-actions">
              <button class="secondary-command privacy-pause-command" type="button" :class="{ active: privacyNetwork.paused }" :disabled="privacyBusy" @click="togglePrivacyNetwork"><Wifi v-if="privacyNetwork.paused" :size="16" /><WifiOff v-else :size="16" /><span>{{ privacyNetwork.paused ? "恢复联网服务" : "暂停联网服务" }}</span></button>
              <button class="secondary-command" type="button" @click="previewDiagnostics"><ShieldCheck :size="16" /><span>查看诊断范围</span></button>
              <button class="secondary-command" type="button" :disabled="privacyBusy" @click="exportUserData"><Download :size="16" /><span>导出全部数据</span></button>
              <button class="secondary-command" type="button" :disabled="privacyBusy" @click="clearRuntimeCache"><RefreshCcw :size="16" /><span>清理运行缓存</span></button>
              <button class="secondary-command" type="button" @click="replayOnboarding"><PlayCircle :size="16" /><span>重播新手引导</span></button>
              <button class="danger-command privacy-danger" type="button" :disabled="privacyBusy" @click="resetUserData"><Trash2 :size="16" /><span>彻底删除数据</span></button>
            </div>
          </div>
        </section>

        <section v-else-if="activeTab === 'wallpaper'" class="settings-pane">
          <div class="settings-group">
            <label class="setting-row">
              <span><strong>动态桌面背景</strong><small>{{ wallpaperHostLabel }}</small></span>
              <input v-model="wallpaperDynamic" class="switch-input" type="checkbox" />
            </label>
            <label class="setting-row"><span><strong>保存原图</strong><small>设置壁纸后询问保存位置</small></span><input v-model="wallpaperSaveOriginal" class="switch-input" type="checkbox" /></label>
          </div>
          <div class="settings-group">
            <div class="group-heading">
              <div><h2>壁纸浏览</h2><p class="runtime-line">按分类或名称筛选，卡片可直接设为桌面壁纸。</p></div>
              <div class="group-actions">
                <button class="secondary-command" type="button" @click="importWallpaper"><FolderPlus :size="16" /><span>导入本地图片</span></button>
                <button class="secondary-command" type="button" @click="exportSelectedWallpaper"><Download :size="16" /><span>保存原图</span></button>
              </div>
            </div>
            <div class="wallpaper-browser-tools">
              <label class="wallpaper-search"><Search :size="16" /><input v-model="wallpaperSearch" type="search" placeholder="搜索名称、风格或关键词" /></label>
              <div class="wallpaper-category-tabs">
                <button type="button" :class="{ active: wallpaperStyleFilter === 'all' }" @click="wallpaperStyleFilter = 'all'">全部</button>
                <button v-for="style in WALLPAPER_STYLES" :key="style[0]" type="button" :class="{ active: wallpaperStyleFilter === style[0] }" @click="wallpaperStyleFilter = style[0]">{{ style[1] }}</button>
              </div>
            </div>
            <div class="wallpaper-thumb-grid">
              <article
                v-for="wallpaper in filteredWallpapers"
                :key="wallpaper.id"
                class="wallpaper-thumb"
                :class="{ selected: selectedWallpaperId === wallpaper.id }"
                :title="wallpaper.label"
              >
                <img v-if="wallpaperThumbUrl(wallpaper)" :src="wallpaperThumbUrl(wallpaper)" :alt="wallpaper.label" loading="eager" />
                <button class="wallpaper-thumb-select" type="button" @click="selectWallpaper(wallpaper.id)"><span>{{ wallpaper.label }}</span><small>{{ WALLPAPER_STYLES.find((style) => style[0] === wallpaper.style)?.[1] }}</small></button>
                <button class="wallpaper-apply-now" type="button" @click="applyWallpaperNow(wallpaper.id)"><ImageIcon :size="14" />设为壁纸</button>
                <button v-if="wallpaper.source === 'user'" class="wallpaper-remove" type="button" :title="`删除 ${wallpaper.label}`" @click="deleteWallpaper(wallpaper)"><Trash2 :size="13" /></button>
              </article>
            </div>
            <p v-if="filteredWallpapers.length === 0" class="runtime-line">没有匹配的本地壁纸。</p>
          </div>
          <div class="settings-group wallpaper-studio">
            <div class="group-heading">
              <div><h2>壁纸创作</h2><p class="runtime-line">{{ wallpaperStudioStatus }}</p></div>
              <button class="secondary-command" type="button" :disabled="!wallpaperStudioSource" @click="exportWallpaperStudioPng"><Download :size="16" /><span>导出 PNG</span></button>
            </div>
            <div class="wallpaper-studio-controls">
              <label class="pet-studio-upload"><input type="file" accept="image/png,image/jpeg,image/webp" @change="loadWallpaperStudioImage" /><ImageIcon :size="18" /><span>选择图片</span></label>
              <label><span>签名</span><input v-model="wallpaperStudioSignature" maxlength="60" type="text" @input="renderWallpaperStudio" /></label>
              <label><span>贴纸</span><select v-model="wallpaperStudioSticker" @change="renderWallpaperStudio"><option value="none">无</option><option value="sparkles">星光</option><option value="heart">心形</option><option value="moon">月亮</option></select></label>
            </div>
            <canvas ref="wallpaperStudioCanvas" aria-label="壁纸创作预览"></canvas>
          </div>
          <div v-if="wallpaperDisplays.length > 0" class="settings-group">
            <h2>多显示器分配</h2>
            <label v-for="display in wallpaperDisplays" :key="display.id" class="setting-row">
              <span>
                <strong>{{ display.label }}{{ display.isPrimary ? " · 主屏" : "" }}</strong>
                <small>{{ Math.round(display.bounds.width * display.scaleFactor) }} × {{ Math.round(display.bounds.height * display.scaleFactor) }} px · {{ display.bounds.height > display.bounds.width ? '竖屏' : '横屏' }} · {{ Math.round(display.scaleFactor * 100) }}%</small>
              </span>
              <select :value="display.wallpaperId ?? ''" @change="assignWallpaper(display.id, ($event.target as HTMLSelectElement).value)">
                <option value="">跟随全局壁纸</option>
                <option v-for="wallpaper in wallpaperLibrary" :key="wallpaper.id" :value="wallpaper.id">{{ wallpaper.label }}</option>
              </select>
            </label>
          </div>
        </section>

        <section v-else-if="activeTab === 'weather'" class="settings-pane">
          <div class="weather-summary">
            <CloudSun :size="24" />
            <div><strong>{{ currentWeather?.city || "自动定位" }}</strong><span>{{ currentWeather?.condition || "检测中" }} · {{ currentWeather?.temperatureC ?? "--" }}°C</span></div>
            <small>{{ locationSourceLabel }} · {{ currentWeather?.source || "--" }}</small>
          </div>
          <div class="settings-group two-column-fields">
            <label><span>天气模式</span><select v-model="weatherMode"><option value="manual">手动</option><option value="auto">自动</option></select></label>
            <label><span>手动天气</span><select v-model="manualWeather"><option value="clear">晴天</option><option value="rain">雨</option><option value="snow">雪</option><option value="fog">雾</option><option value="leaves">落叶</option><option value="light">光效</option></select></label>
            <label class="field-wide"><span>城市</span><input v-model="city" type="text" placeholder="留空自动定位" /></label>
            <label class="field-wide"><span>OpenWeatherMap Key</span><input v-model="weatherApiKey" type="password" :placeholder="settings?.weather.apiKeyConfigured ? '已配置' : 'API Key'" /></label>
            <label class="field-wide range-field"><span>粒子强度 <b>{{ particleIntensity }}%</b></span><input v-model="particleIntensity" min="0" max="120" type="range" /></label>
          </div>
          <div class="inline-status"><button class="secondary-command" type="button" @click="testWeather"><SlidersHorizontal :size="16" /><span>测试天气</span></button><span>{{ weatherTestStatus }}</span></div>
        </section>

        <section v-else-if="activeTab === 'pet'" class="settings-pane">
          <div class="settings-group">
            <h2>角色</h2>
            <div class="pet-character-grid">
              <button
                v-for="character in petCharacters"
                :key="character.id"
                type="button"
                :class="{ selected: petCharacterId === character.id, cutout: character.renderMode === 'cutout' }"
                @click="petCharacterId = character.id"
              >
                <img :src="`${baseUrl}${character.asset}`" :alt="character.name" />
                <span>{{ character.name }}</span>
              </button>
            </div>
          </div>
          <div class="settings-group">
            <label class="setting-row"><span><strong>显示桌宠</strong><small>{{ petCharacters.find((item) => item.id === petCharacterId)?.name ?? 'Luna Q' }}</small></span><input v-model="petEnabled" class="switch-input" type="checkbox" /></label>
            <label class="setting-row"><span><strong>自动换装</strong><small>weather outfit</small></span><input v-model="petAutoOutfit" class="switch-input" type="checkbox" /></label>
            <label v-if="!petAutoOutfit" class="setting-row"><span><strong>当前装扮</strong><small>{{ petCharacterId === 'luna-q' ? 'Luna Q 使用真实服装帧' : '该角色当前只有原始透明立绘，不叠加贴纸' }}</small></span><select v-model="petCurrentOutfit" :disabled="petCharacterId !== 'luna-q'"><option value="default">日常装</option><option value="raincoat">雨天装</option><option value="winter">冬日装</option><option value="summer">夏日装</option><option value="pajamas">睡衣</option></select></label>
            <label class="setting-row"><span><strong>话频率</strong><small>bubble frequency</small></span><select v-model="petTalkFrequency"><option value="silent">安静</option><option value="rare">偶尔</option><option value="normal">正常</option><option value="chatty">话痨</option></select></label>
            <label class="setting-row"><span><strong>动作间隔</strong><small>ambient actions</small></span><select v-model="petActionInterval"><option :value="30">30 秒</option><option :value="60">1 分钟</option><option :value="120">2 分钟</option><option :value="300">5 分钟</option></select></label>
            <label class="range-setting"><span><strong>缩放</strong><b>{{ petScale }}%</b></span><input v-model="petScale" min="50" max="160" type="range" /></label>
          </div>
          <div class="settings-group">
            <h2>人格</h2>
            <div class="persona-grid">
              <button v-for="persona in personalities" :key="persona[0]" type="button" :class="{ selected: petPersonality === persona[0] }" @click="previewPetPersonality(persona[0])">{{ persona[1] }}</button>
            </div>
            <div class="personality-preview" aria-live="polite"><small>人格试听</small><strong>{{ petPersonalityPreview }}</strong></div>
            <button class="secondary-command reset-pet" type="button" @click="resetPetPosition"><RotateCcw :size="16" /><span>复位桌宠位置</span></button>
          </div>
          <div class="settings-group pet-studio">
            <div class="group-heading"><div><h2>桌宠制作工具</h2><p class="runtime-line">图片只在本机处理；从画布边缘识别并移除连续背景。</p></div><button class="secondary-command" type="button" :disabled="!petStudioSource" @click="exportPetStudioPng"><Download :size="16" /><span>导出透明 PNG</span></button></div>
            <div class="pet-studio-layout">
              <label class="pet-studio-upload"><input type="file" accept="image/png,image/jpeg,image/webp" @change="loadPetStudioImage" /><ImageIcon :size="18" /><span>选择图片</span></label>
              <label class="range-field"><span>抠图阈值 <b>{{ petStudioThreshold }}</b></span><input v-model="petStudioThreshold" min="12" max="120" type="range" :disabled="!petStudioSource" @change="removePetStudioBackground" /></label>
              <canvas ref="petStudioCanvas" aria-label="透明桌宠预览"></canvas>
            </div>
            <p class="runtime-line">{{ petStudioStatus }}</p>
          </div>
        </section>

        <section v-else-if="activeTab === 'ai'" class="settings-pane">
          <div class="settings-group">
            <label class="setting-row"><span><strong>启用 AI 对话</strong><small>provider adapter</small></span><input v-model="aiEnabled" class="switch-input" type="checkbox" /></label>
          </div>
          <div class="settings-group two-column-fields">
            <label><span>Provider</span><select v-model="provider" @change="applyAiProviderPreset"><option value="local-fallback">LocalFallback</option><option value="openai-compatible">OpenAI Compatible</option><option value="deepseek">DeepSeek</option><option value="xiaomi-mimo">小米 MiMo</option><option value="ollama">Ollama</option></select></label>
            <label><span>模型</span><select v-if="provider === 'deepseek'" v-model="aiModel"><option v-for="model in deepSeekModels" :key="model[0]" :value="model[0]">{{ model[1] }}</option></select><input v-else v-model="aiModel" type="text" placeholder="model" /></label>
            <label class="field-wide"><span>API Endpoint</span><input v-model="aiEndpoint" type="text" placeholder="https://..." /><small v-if="provider === 'deepseek'">选择 DeepSeek 时会自动使用官方接口。</small></label>
            <label class="field-wide"><span>API Key</span><input v-model="aiApiKey" type="password" :placeholder="settings?.ai.apiKeyConfigured ? '已配置，留空则不修改' : 'API Key'" /></label>
            <label class="range-field"><span>温度 <b>{{ aiTemperature / 100 }}</b></span><input v-model="aiTemperature" min="0" max="150" type="range" /></label>
            <label class="range-field"><span>回复长度 <b>{{ aiMaxTokens }}</b></span><input v-model="aiMaxTokens" min="50" max="500" step="10" type="range" /></label>
          </div>
          <div class="inline-status">
            <button class="secondary-command" type="button" @click="testAi"><Bot :size="16" /><span>测试连接</span></button>
            <button class="danger-command" type="button" title="清空对话历史" @click="clearChatHistory"><Trash2 :size="16" /></button>
            <span>{{ aiTestStatus }}</span>
          </div>
        </section>

        <section v-else-if="activeTab === 'recovery'" class="settings-pane">
          <div class="settings-group">
            <div class="group-heading"><div><h2>系统状态</h2><p class="runtime-line">直接核对桌面恢复链路，不以动作历史代替运行状态。</p></div><button class="icon-command" type="button" title="重新检测系统状态" @click="loadSettings"><RefreshCcw :size="16" /></button></div>
            <div class="recovery-system-grid">
              <article v-for="item in recoverySystemItems" :key="item.id" :data-status="item.status">
                <span class="recovery-health-dot"></span>
                <span><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></span>
              </article>
              <p v-if="recoverySystemItems.length === 0" class="runtime-line">正在读取系统状态。</p>
            </div>
            <p v-if="recoverySystemStatus" class="runtime-line">检测时间：{{ new Date(recoverySystemStatus.checkedAt).toLocaleString() }}</p>
          </div>
          <div class="settings-group">
            <div class="group-heading"><div><h2>本机性能采样</h2><p class="runtime-line">仅保存在本机，不包含文件名、路径或聊天内容。</p></div></div>
            <div class="recovery-system-grid">
              <article data-status="ready"><span class="recovery-health-dot"></span><span><strong>CPU 中位数</strong><small>{{ (runtimeMetrics?.cpuMedianPercent ?? 0).toFixed(2) }}%</small></span></article>
              <article data-status="ready"><span class="recovery-health-dot"></span><span><strong>CPU P95</strong><small>{{ (runtimeMetrics?.cpuP95Percent ?? 0).toFixed(2) }}%</small></span></article>
              <article data-status="ready"><span class="recovery-health-dot"></span><span><strong>工作集峰值</strong><small>{{ ((runtimeMetrics?.peakWorkingSetBytes ?? 0) / 1024 / 1024).toFixed(1) }} MiB</small></span></article>
              <article :data-status="Math.abs(runtimeMetrics?.memoryGrowthPercent ?? 0) <= 15 ? 'ready' : 'degraded'"><span class="recovery-health-dot"></span><span><strong>内存变化</strong><small>{{ (runtimeMetrics?.memoryGrowthPercent ?? 0).toFixed(1) }}% · {{ runtimeMetrics?.sampleCount ?? 0 }} 样本</small></span></article>
              <article :data-status="(runtimeMetrics?.rendererFpsP5 ?? 0) >= 24 ? 'ready' : 'degraded'"><span class="recovery-health-dot"></span><span><strong>壁纸帧率中位数</strong><small>{{ (runtimeMetrics?.rendererFpsMedian ?? 0).toFixed(1) }} FPS</small></span></article>
              <article :data-status="(runtimeMetrics?.rendererFpsP5 ?? 0) >= 24 ? 'ready' : 'degraded'"><span class="recovery-health-dot"></span><span><strong>壁纸帧率 P5</strong><small>{{ (runtimeMetrics?.rendererFpsP5 ?? 0).toFixed(1) }} FPS · {{ runtimeMetrics?.rendererFpsSampleCount ?? 0 }} 样本</small></span></article>
            </div>
          </div>
          <div v-if="interruptedRecoveries.length > 0" class="settings-group">
            <div class="group-heading"><div><h2>中断动作检查</h2><p class="runtime-line">启动时只读检查完成；不会自动继续、覆盖或删除文件。</p></div></div>
            <div class="recovery-list interrupted-recovery-list">
              <article v-for="report in interruptedRecoveries" :key="report.executionId">
                <span><strong>发现 {{ report.counts.completed + report.counts.resumable + report.counts.conflicted + report.counts.missing }} 项未完成动作</strong><small>已移动 {{ report.counts.completed }} · 可继续 {{ report.counts.resumable }} · 冲突 {{ report.counts.conflicted }} · 缺失 {{ report.counts.missing }}</small></span>
                <div class="recovery-actions">
                  <button v-if="report.canResumeSafely" class="secondary-command" type="button" @click="resumeInterrupted(report)"><PlayCircle :size="15" /><span>继续</span></button>
                  <button v-if="report.canRollbackSafely" class="secondary-command" type="button" @click="rollbackInterrupted(report)"><RotateCcw :size="15" /><span>回滚</span></button>
                  <small v-if="!report.canResumeSafely && !report.canRollbackSafely">存在歧义，保持只读</small>
                </div>
              </article>
            </div>
          </div>
          <div class="settings-group">
            <div class="group-heading"><div><h2>动作历史</h2><p class="runtime-line">所有真实文件移动都会保留结果和撤销入口；删除和覆盖不在 V2 动作范围内。</p></div><button class="icon-command" type="button" title="刷新历史" @click="loadSettings"><RefreshCcw :size="16" /></button></div>
            <div class="recovery-list">
              <article v-for="execution in actionHistory" :key="execution.id">
                <span><strong>{{ execution.summary }}</strong><small>{{ new Date(execution.startedAt).toLocaleString() }} · {{ execution.items.length }} 项 · {{ execution.status }}</small></span>
                <button v-if="execution.undoable" class="secondary-command" type="button" @click="undoExecution(execution)"><RotateCcw :size="15" /><span>撤销</span></button>
              </article>
              <p v-if="actionHistory.length === 0" class="runtime-line">暂无真实文件动作。虚拟分区和壁纸切换不会修改你的文件。</p>
            </div>
          </div>
          <div class="settings-group">
            <h2>系统桌面恢复</h2>
            <div class="setting-row"><span><strong>Explorer 图标与桌面层</strong><small>{{ recoveryScriptPath || "恢复脚本已生成" }}</small></span><button class="secondary-command" type="button" @click="recoverDesktop"><RotateCcw :size="16" /><span>立即恢复</span></button></div>
          </div>
        </section>

        <section v-else class="settings-pane about-pane">
          <div class="about-mark">D</div>
          <h2>Project D</h2>
          <p>v{{ appInfo?.version ?? appVersionFallback }} · {{ appInfo?.platform ?? "win32" }}</p>
          <p class="about-intro">由 Manny 先生与人工智能协作开发。项目以开放协作方式持续完善桌面整理、壁纸、天气与桌宠体验。</p>
          <dl>
            <div><dt>源代码</dt><dd><a href="https://github.com/ningfangtianwai-pixel/project-d-desktop" target="_blank" rel="noreferrer">GitHub · project-d-desktop</a></dd></div>
            <div><dt>联系邮箱</dt><dd><a href="mailto:ningfangtianwai@gmail.com">ningfangtianwai@gmail.com</a></dd></div>
            <div><dt>代码许可</dt><dd>MIT License · 允许商业使用、修改与再分发</dd></div>
            <div><dt>壁纸宿主</dt><dd>{{ wallpaperHostLabel }}</dd></div>
            <div><dt>天气定位</dt><dd>{{ locationSourceLabel }}</dd></div>
            <div><dt>恢复脚本</dt><dd>{{ recoveryScriptPath || "已生成" }}</dd></div>
          </dl>
          <p class="license-note">MIT 仅覆盖本项目代码；壁纸、角色和用户导入素材仍以各自授权证明为准。</p>
          <div class="settings-group diagnostics-group">
            <div class="group-heading">
              <div><h2>本机诊断</h2><p class="runtime-line">只包含版本、运行状态、数量与脱敏错误摘要，不包含聊天、文件名、文件路径或密钥。</p></div>
              <ShieldCheck :size="20" />
            </div>
            <div v-if="diagnosticsReport" class="diagnostics-summary">
              <span :data-health="diagnosticsReport.health">{{ diagnosticsReport.health === "healthy" ? "运行正常" : diagnosticsReport.health === "degraded" ? "需要关注" : "需要修复" }}</span>
              <dl>
                <div><dt>桌面项目</dt><dd>{{ diagnosticsReport.counts.desktopFiles }}</dd></div>
                <div><dt>文件门户</dt><dd>{{ diagnosticsReport.counts.portals }}</dd></div>
                <div><dt>近期错误</dt><dd>{{ diagnosticsReport.counts.recentErrors }}</dd></div>
                <div><dt>数据库</dt><dd>{{ diagnosticsReport.statusCodes.database }}</dd></div>
              </dl>
              <p>{{ new Date(diagnosticsReport.generatedAt).toLocaleString() }} 生成，仅保留最多 5 条脱敏错误摘要。</p>
              <ul v-if="diagnosticsReport.recentErrors.length">
                <li v-for="error in diagnosticsReport.recentErrors" :key="`${error.code}-${error.occurredAt}`"><strong>{{ error.code }}</strong><span>{{ error.summary }}</span></li>
              </ul>
            </div>
            <label class="setting-row"><span><strong>包含近期错误摘要</strong><small>最多 5 条，路径、令牌和密钥会再次脱敏</small></span><input v-model="diagnosticsIncludeErrors" class="switch-input" type="checkbox" /></label>
            <label class="diagnostics-consent"><input v-model="diagnosticsConsent" type="checkbox" /><span>我已核对上方范围，并同意把所选摘要保存到本机。Project D 不会自动上传；文件保留多久由我决定。</span></label>
            <div class="about-actions">
              <button class="secondary-command" type="button" :disabled="diagnosticsBusy" @click="previewDiagnostics"><ShieldCheck :size="16" /><span>生成预览</span></button>
              <button class="secondary-command" type="button" :disabled="diagnosticsBusy || !diagnosticsConsent" @click="exportDiagnostics"><Download :size="16" /><span>导出摘要</span></button>
            </div>
          </div>
          <div class="about-actions"><button class="secondary-command" type="button" @click="openLogs"><FolderOpen :size="16" /><span>日志目录</span></button><button class="secondary-command" type="button" @click="recoverDesktop"><RotateCcw :size="16" /><span>恢复桌面</span></button></div>
        </section>
      </div>

      <footer class="settings-statusbar"><span>{{ saveStatus }}</span><small>{{ activeLayout?.columns ?? 4 }} 列 · {{ wallpaperHostLabel }}</small></footer>
    </section>
  </main>
</template>

<style scoped>
.settings-app { display: grid; grid-template-columns: 184px minmax(0, 1fr); width: 100%; height: calc(100vh - 38px); margin-top: 38px; color: #f4f1ea; background: #0d0f12; overflow: hidden; }
.settings-sidebar { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid rgba(255,255,255,.08); padding: 18px 12px 14px; background: rgba(17,19,23,.94); }
.settings-brand { display: flex; align-items: center; gap: 10px; padding: 0 8px 18px; }
.settings-brand > span, .about-mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; color: #101114; background: #9fd7ed; font-weight: 800; }
.settings-brand div { display: grid; gap: 1px; }
.settings-brand strong { font-size: 14px; }
.settings-brand small, .sidebar-runtime small { color: rgba(244,241,234,.48); font-size: 11px; }
.settings-sidebar nav { display: grid; gap: 3px; }
.settings-sidebar nav button { display: flex; align-items: center; gap: 10px; min-height: 38px; border: 0; border-radius: 7px; padding: 0 10px; color: rgba(244,241,234,.68); background: transparent; text-align: left; cursor: pointer; }
.settings-sidebar nav button:hover { color: #f4f1ea; background: rgba(255,255,255,.06); }
.settings-sidebar nav button.active { color: #e9f7fb; background: rgba(159,215,237,.13); box-shadow: inset 2px 0 0 #9fd7ed; }
.sidebar-runtime { display: flex; justify-content: space-between; gap: 8px; margin-top: auto; border-top: 1px solid rgba(255,255,255,.08); padding: 12px 8px 0; color: rgba(244,241,234,.68); font-size: 11px; }
.settings-workspace { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; min-width: 0; min-height: 0; }
.settings-commandbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; min-height: 72px; border-bottom: 1px solid rgba(255,255,255,.08); padding: 12px 22px; background: rgba(13,15,18,.9); }
.settings-commandbar p, .settings-commandbar h1 { margin: 0; }
.settings-commandbar p { color: rgba(244,241,234,.46); font-size: 11px; }
.settings-commandbar h1 { margin-top: 2px; font-size: 21px; }
.settings-command-actions, .inline-status, .about-actions, .group-heading { display: flex; align-items: center; gap: 8px; }
.primary-command, .secondary-command, .icon-command, .danger-command { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 34px; border: 1px solid transparent; border-radius: 7px; padding: 0 12px; cursor: pointer; }
.primary-command { color: #0d0f12; background: #9fd7ed; }
.secondary-command, .icon-command { color: #f4f1ea; border-color: rgba(255,255,255,.12); background: rgba(255,255,255,.06); }
.icon-command, .danger-command { width: 34px; padding: 0; }
.danger-command { color: #ffc49c; border-color: rgba(255,196,156,.2); background: rgba(255,196,156,.07); }
.privacy-danger { width: auto; }
.settings-content { min-height: 0; overflow-x: hidden; overflow-y: auto; padding: 20px 24px 28px; background: linear-gradient(135deg, rgba(44,77,88,.13), transparent 42%), #101216; }
.settings-pane { width: min(720px, 100%); margin: 0 auto; }
.settings-group { border-bottom: 1px solid rgba(255,255,255,.09); padding: 4px 0 18px; margin-bottom: 18px; }
.settings-group h2 { margin: 0 0 12px; font-size: 14px; }
.rule-editor-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.rule-editor-grid label { display: grid; gap: 6px; color: rgba(244,241,234,.62); font-size: 11px; }
.rule-editor-grid .field-wide { grid-column: 1 / -1; }
.rule-list { display: grid; gap: 8px; }
.rule-list article { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 12px; min-height: 58px; border: 1px solid rgba(255,255,255,.08); border-radius: 7px; padding: 8px 10px; background: rgba(255,255,255,.035); }
.rule-list article > span { display: grid; gap: 3px; min-width: 0; }
.rule-list article small { overflow: hidden; color: rgba(244,241,234,.5); text-overflow: ellipsis; white-space: nowrap; }
.group-heading { justify-content: space-between; margin-bottom: 12px; }
.group-heading h2 { margin: 0; }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 54px; border-top: 1px solid rgba(255,255,255,.055); }
.setting-row > span { display: grid; flex: 1; gap: 2px; min-width: 0; }
.setting-row strong { font-size: 13px; font-weight: 600; }
.setting-row small { overflow: hidden; color: rgba(244,241,234,.44); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.update-actions { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.update-progress { width: 100%; height: 5px; border: 0; accent-color: #9fd7ed; }
.time-range { display: flex; align-items: center; gap: 8px; }
.time-range > span { color: rgba(244,241,234,.42); font-size: 11px; }
.time-range input { width: 100px; }
.diagnostics-group { width: min(100%, 660px); margin-top: 10px; text-align: left; }
.diagnostics-group .group-heading > svg { color: #9fd7ed; }
.diagnostics-summary { display: grid; gap: 12px; padding: 14px 0 4px; border-top: 1px solid rgba(255,255,255,.055); }
.diagnostics-summary > span { width: fit-content; padding: 3px 8px; border: 1px solid rgba(159,215,237,.3); border-radius: 5px; color: #bce7f7; background: rgba(78,157,188,.1); font-size: 11px; }
.diagnostics-summary > span[data-health="unhealthy"] { border-color: rgba(232,112,112,.38); color: #f2aaaa; background: rgba(177,61,61,.12); }
.diagnostics-summary dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; margin: 0; overflow: hidden; border: 1px solid rgba(255,255,255,.07); border-radius: 6px; background: rgba(255,255,255,.07); }
.diagnostics-summary dl div { display: grid; gap: 4px; padding: 10px; background: #14171b; }
.diagnostics-summary dt, .diagnostics-summary p { color: rgba(244,241,234,.46); font-size: 10px; }
.diagnostics-summary dd { margin: 0; color: #f4f1ea; font-size: 13px; font-weight: 600; }
.diagnostics-summary p { margin: 0; }
.diagnostics-summary ul { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.diagnostics-summary li { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 10px; padding: 7px 9px; border-left: 2px solid rgba(232,112,112,.42); background: rgba(255,255,255,.025); font-size: 10px; }
.diagnostics-summary li span { overflow-wrap: anywhere; color: rgba(244,241,234,.56); }
.diagnostics-consent { display: flex; align-items: flex-start; gap: 9px; padding: 10px 0; color: rgba(244,241,234,.62); font-size: 11px; line-height: 1.55; }
.privacy-summary { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,.09); padding: 4px 0 18px; }
.privacy-summary > svg { color: #9fd7ed; }
.privacy-summary div { display: grid; gap: 3px; }
.privacy-summary strong { font-size: 14px; }
.privacy-summary span { color: rgba(244,241,234,.5); font-size: 11px; }
.privacy-count { display: grid; place-items: center; min-width: 28px; height: 24px; border-radius: 6px; color: #bce7f7; background: rgba(159,215,237,.12); font-size: 11px; }
.privacy-permission-list, .privacy-data-list { display: grid; gap: 1px; border: 1px solid rgba(255,255,255,.07); border-radius: 7px; overflow: hidden; background: rgba(255,255,255,.07); }
.privacy-permission-list article, .privacy-data-list > div { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 11px; min-height: 54px; padding: 9px 11px; background: #14171b; }
.privacy-permission-list article > svg, .privacy-data-list svg { color: rgba(159,215,237,.78); }
.privacy-permission-list article > span, .privacy-data-list span { display: grid; gap: 2px; min-width: 0; }
.privacy-permission-list small, .privacy-data-list small { overflow: hidden; color: rgba(244,241,234,.45); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.privacy-usage-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 1px; margin: 0; border: 1px solid rgba(255,255,255,.07); border-radius: 7px; overflow: hidden; background: rgba(255,255,255,.07); }
.privacy-usage-grid > div { display: grid; gap: 5px; min-height: 92px; padding: 13px; background: #14171b; }
.privacy-usage-grid dt { color: rgba(244,241,234,.52); font-size: 10px; }
.privacy-usage-grid dd { margin: 0; color: #f4f1ea; font-size: 17px; font-weight: 650; }
.privacy-usage-grid small { color: rgba(244,241,234,.43); font-size: 10px; }
.privacy-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.privacy-pause-command.active { border-color: rgba(112,216,174,.38); color: #bdf0d8; background: rgba(112,216,174,.1); }
select, input[type="text"], input[type="password"] { min-width: 190px; min-height: 34px; border: 1px solid rgba(255,255,255,.12); border-radius: 7px; padding: 0 9px; color: #f4f1ea; background: rgba(255,255,255,.06); outline: none; }
select:focus, input:focus { border-color: rgba(159,215,237,.58); }
.switch-input { appearance: none; position: relative; width: 36px; height: 20px; border-radius: 999px; background: rgba(255,255,255,.16); cursor: pointer; }
.switch-input::after { content: ""; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #f4f1ea; transition: transform .18s ease; }
.switch-input:checked { background: #6cb6d1; }
.switch-input:checked::after { transform: translateX(16px); }
.layout-choice-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
.layout-choice-grid > button { display: grid; justify-items: start; gap: 5px; min-height: 112px; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 12px; color: #f4f1ea; background: rgba(255,255,255,.035); cursor: pointer; }
.layout-choice-grid > button.selected { border-color: rgba(159,215,237,.64); background: rgba(159,215,237,.1); box-shadow: inset 0 0 0 1px rgba(159,215,237,.15); }
.layout-choice-grid small, .runtime-line { color: rgba(244,241,234,.48); font-size: 11px; }
.layout-mini-grid { display: grid; grid-template-columns: repeat(var(--layout-cols), 1fr); gap: 3px; width: 100%; height: 34px; }
.layout-mini-grid i { border-radius: 2px; background: rgba(244,241,234,.22); }
.wallpaper-thumb-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; }
.wallpaper-browser-tools { display: grid; gap: 9px; margin-bottom: 12px; }
.wallpaper-search { display: grid; grid-template-columns: auto minmax(0,1fr); align-items: center; gap: 8px; min-height: 38px; border: 1px solid rgba(255,255,255,.1); border-radius: 7px; padding: 0 10px; background: rgba(255,255,255,.035); }
.wallpaper-search input { width: 100%; border: 0; color: inherit; background: transparent; outline: none; }
.wallpaper-category-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.wallpaper-category-tabs button { min-height: 30px; border: 1px solid rgba(255,255,255,.1); border-radius: 6px; padding: 0 10px; color: rgba(244,241,234,.7); background: rgba(255,255,255,.025); cursor: pointer; }
.wallpaper-category-tabs button.active { border-color: rgba(159,215,237,.55); color: #e9f7fb; background: rgba(159,215,237,.12); }
.wallpaper-thumb { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 0; color: #fff; background: #11151a; }
.wallpaper-thumb::after { position: absolute; inset: 0; background: linear-gradient(180deg,rgba(0,0,0,.01),rgba(0,0,0,.42)); content: ""; pointer-events: none; }
.wallpaper-thumb > img { width: 100%; height: 100%; object-fit: cover; }
.wallpaper-thumb.selected { border-color: #9fd7ed; box-shadow: 0 0 0 1px rgba(159,215,237,.38); }
.wallpaper-thumb-select { position: absolute; inset: 0; z-index: 1; width: 100%; border: 0; color: #fff; background: transparent; cursor: pointer; }
.wallpaper-thumb-select span { position: absolute; right: 7px; bottom: 7px; left: 7px; overflow: hidden; padding: 4px 72px 4px 6px; border-radius: 5px; background: rgba(8,10,12,.66); font-size: 11px; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
.wallpaper-thumb-select small { position: absolute; top: 7px; left: 7px; border-radius: 4px; padding: 3px 5px; background: rgba(8,10,12,.6); font-size: 9px; }
.wallpaper-apply-now { position: absolute; right: 10px; bottom: 10px; z-index: 2; display: inline-flex; align-items: center; gap: 4px; min-height: 24px; border: 0; border-radius: 5px; padding: 0 7px; color: #101114; background: #d7d28d; cursor: pointer; font-size: 10px; }
.wallpaper-remove { position: absolute; top: 8px; right: 8px; z-index: 3; display: grid; width: 25px; height: 25px; place-items: center; border: 1px solid rgba(255,255,255,.24); border-radius: 5px; color: #fff; background: rgba(75,22,26,.78); cursor: pointer; }
.wallpaper-remove:hover { background: rgba(140,43,49,.9); }
.group-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.wallpaper-studio-controls { display: grid; grid-template-columns: 150px minmax(180px,1fr) 150px; gap: 10px; margin-bottom: 12px; }
.wallpaper-studio-controls > label:not(.pet-studio-upload) { display: grid; grid-template-columns: auto minmax(0,1fr); align-items: center; gap: 8px; font-size: 12px; }
.wallpaper-studio canvas { display: block; width: 100%; aspect-ratio: 16 / 9; border: 1px solid rgba(255,255,255,.09); border-radius: 7px; background: #11151a; object-fit: contain; }
.pet-character-grid { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: 8px; }
.pet-character-grid button { position: relative; aspect-ratio: 3 / 4; overflow: hidden; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 0; color: #f4f1ea; background: #171a1f; cursor: pointer; }
.pet-character-grid button.selected { border-color: #9fd7ed; box-shadow: inset 0 0 0 1px rgba(159,215,237,.35); }
.pet-character-grid img { width: 100%; height: 100%; object-fit: cover; object-position: center 27%; opacity: .86; transition: transform .18s ease, opacity .18s ease; }
.pet-character-grid button.cutout img { padding: 6px 5px 18px; object-fit: contain; object-position: center bottom; }
.pet-character-grid button:hover img, .pet-character-grid button.selected img { opacity: 1; transform: scale(1.025); }
.pet-character-grid span { position: absolute; right: 4px; bottom: 4px; left: 4px; overflow: hidden; padding: 4px 5px; border-radius: 5px; background: rgba(9,11,14,.76); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.pet-studio-layout { display: grid; grid-template-columns: minmax(130px,.5fr) minmax(180px,1fr) minmax(180px,1fr); align-items: center; gap: 12px; }
.pet-studio-upload { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 40px; border: 1px dashed rgba(159,215,237,.38); border-radius: 7px; color: #bde7f5; background: rgba(159,215,237,.055); cursor: pointer; font-size: 12px; }
.pet-studio-upload input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.pet-studio canvas { width: 100%; max-height: 260px; border: 1px solid rgba(255,255,255,.09); border-radius: 7px; background-image: linear-gradient(45deg,#262a30 25%,transparent 25%),linear-gradient(-45deg,#262a30 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#262a30 75%),linear-gradient(-45deg,transparent 75%,#262a30 75%); background-position: 0 0,0 8px,8px -8px,-8px 0; background-size: 16px 16px; object-fit: contain; }
.personality-preview { display: grid; gap: 4px; min-height: 58px; margin-top: 10px; border-left: 2px solid rgba(159,215,237,.58); padding: 8px 10px; background: rgba(159,215,237,.055); }
.personality-preview small { color: rgba(159,215,237,.68); font-size: 10px; }
.personality-preview strong { color: rgba(244,241,234,.88); font-size: 12px; font-weight: 500; line-height: 1.55; }
.portal-list, .portal-resource-list, .scene-list, .recovery-list { display: grid; gap: 8px; }
.portal-list article, .recovery-list article { display: flex; align-items: center; gap: 10px; min-height: 54px; border: 1px solid rgba(255,255,255,.09); border-radius: 8px; padding: 7px 8px; background: rgba(255,255,255,.025); }
.portal-list article.selected { border-color: rgba(159,215,237,.46); background: rgba(159,215,237,.07); }
.portal-open, .portal-resource-list button, .scene-list button { display: flex; align-items: center; gap: 10px; width: 100%; min-width: 0; border: 0; border-radius: 6px; padding: 7px 6px; color: #f4f1ea; background: transparent; text-align: left; cursor: pointer; }
.portal-open:hover, .portal-resource-list button:hover, .scene-list button:hover { background: rgba(255,255,255,.06); }
.portal-open > span, .portal-resource-list span, .scene-list span, .recovery-list article > span { display: grid; min-width: 0; gap: 2px; }
.portal-open strong, .portal-resource-list strong, .scene-list strong, .recovery-list strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.portal-open small, .portal-resource-list small, .scene-list small, .recovery-list small { overflow: hidden; color: rgba(244,241,234,.45); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.portal-resource-list { max-height: 260px; overflow: auto; }
.portal-resource-list button { border-bottom: 1px solid rgba(255,255,255,.06); border-radius: 0; }
.portal-resource-list button:disabled { cursor: default; opacity: .58; }
.scene-list button { justify-content: space-between; border: 1px solid rgba(255,255,255,.08); }
.suggestion-suppression-list { display: grid; max-height: 240px; overflow: auto; border: 1px solid rgba(255,255,255,.07); border-radius: 7px; background: rgba(255,255,255,.025); }
.suggestion-suppression-list article { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 10px; min-height: 58px; border-bottom: 1px solid rgba(255,255,255,.06); padding: 8px 10px; }
.suggestion-suppression-list article:last-of-type { border-bottom: 0; }
.suggestion-suppression-list article > svg { color: rgba(159,215,237,.7); }
.suggestion-suppression-list article > span { display: grid; min-width: 0; gap: 3px; }
.suggestion-suppression-list strong { font-size: 12px; }
.suggestion-suppression-list small { overflow: hidden; color: rgba(244,241,234,.48); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.suggestion-suppression-list time { color: rgba(244,241,234,.4); font-size: 10px; white-space: nowrap; }
.suggestion-suppression-list > .runtime-line { margin: 0; padding: 14px 10px; }
.recovery-list article { justify-content: space-between; }
.recovery-list article > span { flex: 1; }
.recovery-system-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; margin-bottom: 10px; }
.recovery-system-grid article { display: grid; grid-template-columns: auto minmax(0,1fr); align-items: center; gap: 10px; min-height: 62px; border: 1px solid rgba(255,255,255,.08); border-radius: 8px; padding: 9px 11px; background: rgba(255,255,255,.025); }
.recovery-system-grid article > span:last-child { display: grid; gap: 3px; min-width: 0; }
.recovery-system-grid strong { font-size: 12px; }
.recovery-system-grid small { overflow: hidden; color: rgba(244,241,234,.48); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.recovery-health-dot { width: 9px; height: 9px; border-radius: 50%; background: #83909b; box-shadow: 0 0 0 4px rgba(131,144,155,.12); }
.recovery-system-grid article[data-status="ready"] .recovery-health-dot { background: #70d8ae; box-shadow: 0 0 0 4px rgba(112,216,174,.12); }
.recovery-system-grid article[data-status="degraded"] .recovery-health-dot { background: #f5c26b; box-shadow: 0 0 0 4px rgba(245,194,107,.12); }
.recovery-system-grid article[data-status="unavailable"] .recovery-health-dot { background: #f08778; box-shadow: 0 0 0 4px rgba(240,135,120,.12); }
@media (max-width: 720px) { .recovery-system-grid { grid-template-columns: 1fr; } }
.weather-summary { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,.09); padding: 4px 0 18px; margin-bottom: 18px; }
.weather-summary div { display: grid; gap: 2px; }
.weather-summary span, .weather-summary small { color: rgba(244,241,234,.54); font-size: 12px; }
.two-column-fields { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
.two-column-fields label, .range-field, .range-setting { display: grid; gap: 6px; color: rgba(244,241,234,.66); font-size: 12px; }
.two-column-fields input, .two-column-fields select { width: 100%; min-width: 0; }
.field-wide { grid-column: 1 / -1; }
.range-field span, .range-setting span { display: flex; justify-content: space-between; gap: 10px; }
input[type="range"] { width: 100%; accent-color: #86c8df; }
.inline-status { min-height: 36px; color: rgba(244,241,234,.62); font-size: 12px; }
.persona-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; }
.persona-grid button { min-height: 38px; border: 1px solid rgba(255,255,255,.1); border-radius: 7px; color: rgba(244,241,234,.7); background: rgba(255,255,255,.04); cursor: pointer; }
.persona-grid button.selected { color: #eaf7fb; border-color: rgba(159,215,237,.52); background: rgba(159,215,237,.12); }
.range-setting { margin-top: 12px; }
.reset-pet { margin-top: 14px; }
.about-pane { padding-top: 36px; text-align: center; }
.about-mark { width: 54px; height: 54px; margin: 0 auto 14px; font-size: 24px; }
.about-pane h2, .about-pane p { margin: 0; }
.about-pane p { margin-top: 5px; color: rgba(244,241,234,.5); }
.about-pane dl { width: min(620px,100%); margin: 28px auto 18px; text-align: left; }
.about-pane dl div { display: grid; grid-template-columns: 110px minmax(0,1fr); gap: 18px; border-top: 1px solid rgba(255,255,255,.08); padding: 12px 0; }
.about-pane a { color: #9fd7ed; text-decoration: none; }
.about-pane a:hover { text-decoration: underline; }
.about-intro { max-width: 680px; color: rgba(244,241,234,.68); line-height: 1.7; }
.license-note { max-width: 680px; border-left: 2px solid rgba(215,210,141,.6); padding: 8px 10px; color: rgba(244,241,234,.55); background: rgba(215,210,141,.05); font-size: 11px; line-height: 1.6; }
.privacy-agreement { margin-top: 14px; border: 1px solid rgba(255,255,255,.08); border-radius: 7px; padding: 10px 12px; background: rgba(255,255,255,.025); }
.privacy-agreement summary { cursor: pointer; font-size: 12px; font-weight: 700; }
.privacy-agreement p { color: rgba(244,241,234,.58); font-size: 11px; line-height: 1.65; }

:global(html[data-theme="light"]) .settings-app { color: #20262b; background: #eef2f4; }
:global(html[data-theme="light"]) .settings-sidebar { border-color: rgba(21,37,47,.12); background: rgba(242,246,248,.98); }
:global(html[data-theme="light"]) .settings-commandbar,
:global(html[data-theme="light"]) .settings-statusbar { border-color: rgba(21,37,47,.11); color: #20262b; background: rgba(250,252,253,.96); }
:global(html[data-theme="light"]) .settings-group { border-color: rgba(21,37,47,.12); background: rgba(255,255,255,.72); }
:global(html[data-theme="light"]) .settings-sidebar nav button { color: rgba(29,42,50,.72); }
:global(html[data-theme="light"]) .settings-sidebar nav button:hover { color: #20262b; background: rgba(31,86,108,.07); }
:global(html[data-theme="light"]) .settings-sidebar nav button.active { color: #174d64; background: rgba(62,139,169,.12); }
:global(html[data-theme="light"]) input,
:global(html[data-theme="light"]) select { color: #20262b; background-color: rgba(255,255,255,.9); }
:global(html[data-theme="light"]) .runtime-line,
:global(html[data-theme="light"]) .setting-row small,
:global(html[data-theme="light"]) .about-intro,
:global(html[data-theme="light"]) .license-note,
:global(html[data-theme="light"]) .privacy-agreement p { color: rgba(30,43,51,.62); }
.about-pane dt { color: rgba(244,241,234,.5); }
.about-pane dd { margin: 0; overflow-wrap: anywhere; }
.about-actions { justify-content: center; }
.settings-statusbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 34px; border-top: 1px solid rgba(255,255,255,.08); padding: 0 22px; color: rgba(244,241,234,.52); background: #0d0f12; font-size: 11px; }
.shortcut-input-wrap { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.shortcut-record-input { width: 180px; min-height: 34px; border: 1px solid rgba(255,255,255,.12); border-radius: 7px; padding: 0 9px; color: #f4f1ea; background: rgba(255,255,255,.06); outline: none; text-align: center; cursor: pointer; font-family: inherit; font-size: 12px; }
.shortcut-record-input:focus { border-color: rgba(159,215,237,.58); }
.shortcut-record-input[data-recording="true"] { border-color: rgba(159,215,237,.8); background: rgba(159,215,237,.08); animation: shortcut-pulse 1.2s ease-in-out infinite; }
@keyframes shortcut-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(159,215,237,.25); } 50% { box-shadow: 0 0 0 4px rgba(159,215,237,.12); } }
.shortcut-error { color: #f2aaaa; font-size: 11px; white-space: nowrap; }
@media (max-width: 720px) { .settings-app { grid-template-columns: 68px minmax(0,1fr); } .settings-brand div, .settings-sidebar nav span, .sidebar-runtime span { display: none; } .settings-sidebar nav button { justify-content: center; padding: 0; } .settings-brand { justify-content: center; padding-inline: 0; } .layout-choice-grid, .persona-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } .wallpaper-studio-controls { grid-template-columns: 1fr; } }
</style>

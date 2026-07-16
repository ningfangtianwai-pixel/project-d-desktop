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
  FolderKanban,
  Inbox,
  Image as ImageIcon,
  MonitorUp,
  Palette,
  PanelRightOpen,
  Pencil,
  RefreshCcw,
  Search,
  Settings
} from "lucide-vue-next";
import SettingsPage from "@settings/SettingsPage.vue";
import OverlayPage from "./views/OverlayPage.vue";
import WallpaperStage from "./components/WallpaperStage.vue";
import PetPage from "./views/PetPage.vue";
import WallpaperPage from "./views/WallpaperPage.vue";
import ChatPanel from "./components/ChatPanel.vue";
import OnboardingFlow from "./components/OnboardingFlow.vue";
import { wallpaperDisplayLabel } from "@shared/wallpaper-library";
import { containerAccentOption } from "@shared/container-accents";
import { readOnboardingState, shouldShowOnboarding } from "@shared/onboarding";
import type { ActionExecution, ActionPlan, AppInfo, ContainerWithFiles, CurrentWeather, DatabaseStatus, DesktopFileRecord, DesktopStatus, ScanResult, SettingsSnapshot, SuggestionRecord, WallpaperLibraryItem, WorkspaceSearchResult } from "@shared/types";

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
const workspaceSearchInput = ref<HTMLInputElement | null>(null);
const desktopStatus = ref<DesktopStatus>({
  mode: "idle",
  lastChangedAt: new Date().toISOString()
});
const route = ref(window.location.hash);
const showOnboarding = ref(!route.value && shouldShowOnboarding(readOnboardingState(localStorage, 5)));
const activityLog = ref<string[]>(["Project D shell ready"]);
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
const modeLabel = computed(() => {
  if (desktopStatus.value.mode === "activating") {
    return "启动中";
  }
  if (desktopStatus.value.mode === "active") {
    return "整理中";
  }
  if (desktopStatus.value.mode === "deactivating") {
    return "归位中";
  }
  if (desktopStatus.value.mode === "safe-mode") {
    return "安全模式";
  }
  if (desktopStatus.value.mode === "error") {
    return "需恢复";
  }
  return "待机";
});
const totalFiles = computed(() => containers.value.reduce((total, container) => total + container.files.length, 0));
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
function containerVisualStyle(container: ContainerWithFiles): Record<string, string> {
  return { "--container-accent": containerAccentOption(container.accentColor).rgb };
}

function pushLog(message: string): void {
  activityLog.value = [message, ...activityLog.value].slice(0, 5);
}

async function refreshStatus(): Promise<void> {
  const [nextDesktopStatus, nextDatabaseStatus, nextContainers, nextSettings, nextWallpaperHost, nextLocationSource, nextWallpaperLibrary, nextSuggestion] = await Promise.all([
    window.projectD.getDesktopStatus(),
    window.projectD.getDatabaseStatus(),
    window.projectD.getDesktopFiles(),
    window.projectD.getSettings(),
    window.projectD.getState("wallpaper_host"),
    window.projectD.getState("weather_location_source"),
    window.projectD.getWallpaperLibrary(),
    window.projectD.getLatestSuggestion()
  ]);
  desktopStatus.value = nextDesktopStatus;
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
  pushLog("已进入整理预备状态");
}

async function deactivateDesktop(): Promise<void> {
  desktopStatus.value = await window.projectD.deactivateDesktop();
  pushLog("桌面已安全归位");
}

async function enterCleanDesktop(): Promise<void> {
  desktopStatus.value = await window.projectD.enterCleanDesktop();
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

async function focusWorkspaceSearch(): Promise<void> {
  if (route.value) {
    window.location.hash = "";
    route.value = "";
  }
  await nextTick();
  workspaceSearchInput.value?.focus();
}

async function searchWorkspace(): Promise<void> {
  const query = workspaceSearchQuery.value.trim();
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

async function openSearchResult(result: WorkspaceSearchResult): Promise<void> {
  await window.projectD.openWorkspaceSearchResult(result.id);
  pushLog(`已打开：${result.title}`);
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

  <main v-else class="app-shell">
    <OnboardingFlow v-if="showOnboarding" @completed="dismissOnboarding" @skipped="dismissOnboarding" />
    <WallpaperStage />
    <section class="desktop-band">
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
          <div class="status-pill" :data-mode="desktopStatus.mode">
            <span></span>
            {{ modeLabel }}
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

      <div class="control-grid">
        <section class="desktop-library">
          <div class="panel-title panel-title-spread">
            <div>
              <p>桌面内容</p>
              <h2>虚拟分区</h2>
            </div>
            <span>{{ totalFiles }} 个文件</span>
          </div>
          <div class="zone-grid desktop-zone-grid" aria-label="桌面文件分区">
            <article v-for="container in containers" :key="container.id" class="zone desktop-zone" :style="containerVisualStyle(container)">
              <div class="zone-heading">
                <strong>{{ container.name }}</strong>
                <span>{{ container.files.length }}</span>
              </div>
              <div class="desktop-icon-grid">
                <button
                  v-for="file in container.files"
                  :key="file.id"
                  class="desktop-icon"
                  :class="{ selected: selectedFile?.id === file.id }"
                  type="button"
                  :title="file.fullPath"
                  @click="selectFile(file)"
                  @dblclick="openFile(file.id)"
                  @contextmenu="showFileMenu($event, file)"
                >
                  <span class="desktop-icon-art" :data-kind="file.category">
                    <img v-if="file.iconDataUrl" class="desktop-native-icon" :src="file.iconDataUrl" :alt="fileKindLabel(file)" />
                    <component v-else :is="fileIcon(file)" :size="32" :stroke-width="1.8" />
                  </span>
                  <span class="desktop-icon-name">{{ file.displayName || file.filename }}</span>
                  <small>{{ fileKindLabel(file) }}</small>
                </button>
              </div>
              <p v-if="container.files.length === 0" class="empty-zone">这里暂时没有文件</p>
            </article>
          </div>
        </section>

        <aside class="command-panel">
          <div class="panel-title">
            <FolderKanban :size="22" />
            <div>
              <p>控制中心</p>
              <h2>桌面状态</h2>
            </div>
          </div>
          <form class="workspace-search" @submit.prevent="searchWorkspace">
            <Search :size="17" />
            <input ref="workspaceSearchInput" v-model="workspaceSearchQuery" type="search" placeholder="搜索桌面与已授权门户" @keydown.esc="workspaceSearchResults = []; workspaceSearchStatus = ''" />
            <button type="submit" title="搜索"><Search :size="16" /></button>
          </form>
          <div v-if="workspaceSearchStatus" class="workspace-search-results" aria-live="polite">
            <small>{{ workspaceSearchStatus }}</small>
            <button v-for="result in workspaceSearchResults" :key="result.id" type="button" @dblclick="openSearchResult(result)">
              <span><strong>{{ result.title }}</strong><small>{{ result.origin === 'desktop' ? '桌面' : '文件门户' }} · {{ result.category }}</small></span>
              <span>打开</span>
            </button>
          </div>
          <section v-if="latestSuggestion" class="inbox-review inbox-suggestion" aria-live="polite">
            <div class="inbox-review-heading"><div><span>智能建议</span><strong>{{ latestSuggestion.title }}</strong></div></div>
            <p>{{ latestSuggestion.detail }}</p>
            <small v-if="latestSuggestion.explanation" class="suggestion-reason">为什么出现：{{ latestSuggestion.explanation }}</small>
            <div class="inbox-review-actions"><button class="inbox-execute" type="button" :disabled="actionBusy" @click="prepareSuggestedInbox">查看方案</button><button class="inbox-cancel" type="button" @click="snoozeSuggestion">两小时后</button><button class="inbox-cancel" type="button" @click="disableSuggestions">不再提醒</button></div>
          </section>
          <div class="action-row">
            <button class="action-button" type="button" @click="activateDesktop">
              <MonitorUp :size="18" />
              <span>启动整理</span>
            </button>
            <button class="action-button secondary" type="button" @click="deactivateDesktop">
              <PanelRightOpen :size="18" />
              <span>安全归位</span>
            </button>
            <button class="action-button quiet" type="button" @click="enterCleanDesktop">
              <EyeOff :size="18" />
              <span>纯净桌面</span>
            </button>
            <button class="action-button muted" type="button" @click="scanDesktop">
              <FolderKanban :size="18" />
              <span>刷新</span>
            </button>
            <button class="action-button inbox" type="button" :disabled="actionBusy" @click="prepareDesktopInbox">
              <Inbox :size="18" />
              <span>收件箱</span>
            </button>
            <button class="icon-button" type="button" title="设置" @click="openSettings">
              <Settings :size="20" />
            </button>
          </div>
          <dl class="status-list">
            <div>
              <dt>桌面层</dt>
              <dd>{{ wallpaperHostLabel }}</dd>
            </div>
            <div>
              <dt>天气</dt>
              <dd>{{ currentWeather?.city || "自动定位" }} · {{ currentWeather?.condition || "检测中" }}</dd>
            </div>
            <div>
              <dt>定位</dt>
              <dd>{{ weatherSourceLabel }}</dd>
            </div>
            <div>
              <dt>分区</dt>
              <dd>{{ databaseStatus?.containerCount ?? 0 }} 个 · {{ totalFiles }} 个文件</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>{{ appInfo?.version ?? "0.1.0" }} · {{ appInfo?.platform ?? "win32" }}</dd>
            </div>
          </dl>
          <div v-if="selectedFile" class="file-preview">
            <strong>{{ selectedFile.displayName || selectedFile.filename }}</strong>
            <span>{{ selectedFile.fullPath }}</span>
          </div>
          <section class="inbox-review" aria-live="polite">
            <div class="inbox-review-heading">
              <div><span>可信整理</span><strong>桌面收件箱</strong></div>
              <button v-if="latestUndoableExecution" class="inbox-undo" type="button" :disabled="actionBusy" @click="undoLatestAction">撤销最近一次</button>
            </div>
            <p v-if="!inboxPlan">{{ actionMessage || "先生成整理方案，再确认执行。" }}</p>
            <template v-else>
              <p>{{ inboxPlan.summary }}</p>
              <ol>
                <li v-for="item in inboxPlan.items" :key="item.id" :class="{ conflict: item.conflict }">
                  <div><span>{{ item.label }}</span><small>{{ item.conflict ? `已跳过：${item.conflict}` : `${item.category} · ${formatBytes(item.sizeBytes)}` }}</small></div>
                  <small><b>来源</b>{{ item.sourcePath }}</small>
                  <small><b>目标</b>{{ item.targetPath }}</small>
                </li>
              </ol>
              <div class="inbox-review-actions">
                <button type="button" class="inbox-execute" :disabled="actionBusy || movableInboxItems === 0" @click="executeInboxPlan">确认整理 {{ movableInboxItems }} 项</button>
                <button type="button" class="inbox-cancel" :disabled="actionBusy" @click="inboxPlan = null">取消</button>
              </div>
            </template>
          </section>
          <ChatPanel @request-inbox-plan="prepareDesktopInbox" />
        </aside>
      </div>
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

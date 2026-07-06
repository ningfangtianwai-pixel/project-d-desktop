<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  AppWindow,
  Archive,
  Bot,
  CloudSun,
  Code2,
  Database,
  FileQuestion,
  FileText,
  Film,
  Folder,
  FolderKanban,
  Image as ImageIcon,
  MonitorUp,
  Palette,
  PanelRightOpen,
  Settings,
  Sparkles
} from "lucide-vue-next";
import SettingsPage from "@settings/SettingsPage.vue";
import OverlayPage from "./views/OverlayPage.vue";
import WallpaperStage from "./components/WallpaperStage.vue";
import PetPage from "./views/PetPage.vue";
import WallpaperPage from "./views/WallpaperPage.vue";
import ChatPanel from "./components/ChatPanel.vue";
import type { AppInfo, ContainerWithFiles, DatabaseStatus, DesktopFileRecord, DesktopStatus, ScanResult, SettingsSnapshot } from "@shared/types";

const appInfo = ref<AppInfo | null>(null);
const databaseStatus = ref<DatabaseStatus | null>(null);
const containers = ref<ContainerWithFiles[]>([]);
const scanResult = ref<ScanResult | null>(null);
const selectedFile = ref<DesktopFileRecord | null>(null);
const settings = ref<SettingsSnapshot | null>(null);
const contextMenu = ref<{ file: DesktopFileRecord; x: number; y: number } | null>(null);
const recoveryNotice = ref("");
const desktopStatus = ref<DesktopStatus>({
  mode: "idle",
  lastChangedAt: new Date().toISOString()
});
const route = ref(window.location.hash);
const activityLog = ref<string[]>(["Project D shell ready"]);
const wallpaperStyles = [
  { id: "anime", label: "轻量动态" },
  { id: "aurora", label: "极光" },
  { id: "ink", label: "水墨" },
  { id: "garden", label: "花园" },
  { id: "ocean", label: "海洋" },
  { id: "sunset", label: "日落" }
];
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

function pushLog(message: string): void {
  activityLog.value = [message, ...activityLog.value].slice(0, 5);
}

async function refreshStatus(): Promise<void> {
  desktopStatus.value = await window.projectD.getDesktopStatus();
  databaseStatus.value = await window.projectD.getDatabaseStatus();
  containers.value = await window.projectD.getDesktopFiles();
  settings.value = await window.projectD.getSettings();
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
  pushLog("已执行安全归位占位流程");
}

function openSettings(): void {
  void window.projectD.openSettings();
}

async function switchWallpaperStyle(): Promise<void> {
  const current = settings.value?.wallpaper.currentStyle ?? "anime";
  const index = Math.max(0, wallpaperStyles.findIndex((style) => style.id === current));
  const next = wallpaperStyles[(index + 1) % wallpaperStyles.length] ?? wallpaperStyles[0];
  settings.value = await window.projectD.updateSettings({
    wallpaper: {
      currentStyle: next.id,
      currentIndex: (settings.value?.wallpaper.currentIndex ?? 0) + 1,
      isDynamic: true
    }
  });
  window.dispatchEvent(new Event("projectd:settings-changed"));
  pushLog(`拉绳切换壁纸：${next.label}`);
}

async function scanDesktop(): Promise<void> {
  scanResult.value = await window.projectD.scanDesktop();
  containers.value = await window.projectD.getDesktopFiles();
  databaseStatus.value = await window.projectD.getDatabaseStatus();
  selectedFile.value = null;
  contextMenu.value = null;
  pushLog(`扫描完成：${scanResult.value.insertedOrUpdated} 个条目`);
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

function handleHashChange(): void {
  route.value = window.location.hash;
}

onMounted(async () => {
  appInfo.value = await window.projectD.getAppInfo();
  await refreshStatus();
  await loadRecoveryNotice();

  window.addEventListener("hashchange", handleHashChange);

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
});

onUnmounted(() => {
  window.removeEventListener("hashchange", handleHashChange);
  unsubscribeMenu?.();
  unsubscribeDesktopUpdate?.();
});
</script>

<template>
  <SettingsPage v-if="isSettingsRoute" />
  <OverlayPage v-else-if="isOverlayRoute" />
  <PetPage v-else-if="isPetRoute" />
  <WallpaperPage v-else-if="isWallpaperRoute" />

  <main v-else class="app-shell">
    <WallpaperStage />
    <section class="desktop-band">
      <div class="topbar">
        <div>
          <p class="eyebrow">Project D</p>
          <h1>桌面整理控制台</h1>
        </div>
        <div class="status-pill" :data-mode="desktopStatus.mode">
          <span></span>
          {{ modeLabel }}
        </div>
      </div>
      <button class="wallpaper-pull-cord" type="button" title="拉绳切换壁纸" @click="switchWallpaperStyle">
        <span></span>
        {{ wallpaperStyles.find((style) => style.id === settings?.wallpaper.currentStyle)?.label ?? "壁纸" }}
      </button>
      <div v-if="desktopStatus.message && desktopStatus.mode !== 'idle'" class="recovery-banner">
        {{ desktopStatus.message }}
      </div>
      <div v-if="recoveryNotice" class="recovery-banner recovery-banner-persistent">
        <span>{{ recoveryNotice }}</span>
        <button type="button" @click="dismissRecoveryNotice">知道了</button>
      </div>

      <div class="control-grid">
      <div class="control-panel primary-panel">
          <div class="panel-title">
            <FolderKanban :size="22" />
            <h2>虚拟分区</h2>
          </div>
          <div class="zone-grid desktop-zone-grid" aria-label="desktop file zones">
            <article v-for="container in containers" :key="container.id" class="zone desktop-zone">
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
                    <component :is="fileIcon(file)" :size="34" :stroke-width="1.8" />
                  </span>
                  <span class="desktop-icon-name">{{ file.displayName || file.filename }}</span>
                  <small>{{ fileKindLabel(file) }}</small>
                </button>
              </div>
              <p v-if="container.files.length === 0" class="empty-zone">这里暂时没有文件</p>
            </article>
          </div>
        </div>

        <div class="control-panel">
          <div class="panel-title">
            <Sparkles :size="22" />
            <h2>桌面状态</h2>
          </div>
          <div class="action-row">
            <button class="action-button" type="button" @click="activateDesktop">
              <MonitorUp :size="18" />
              <span>启动整理</span>
            </button>
            <button class="action-button secondary" type="button" @click="deactivateDesktop">
              <PanelRightOpen :size="18" />
              <span>安全归位</span>
            </button>
            <button class="action-button muted" type="button" @click="scanDesktop">
              <FolderKanban :size="18" />
              <span>刷新</span>
            </button>
            <button class="icon-button" type="button" title="设置" @click="openSettings">
              <Settings :size="20" />
            </button>
          </div>
          <dl class="status-list">
            <div>
              <dt>应用</dt>
              <dd>{{ appInfo?.version ?? "0.1.0" }}</dd>
            </div>
            <div>
              <dt>平台</dt>
              <dd>{{ appInfo?.platform ?? "win32" }}</dd>
            </div>
            <div>
              <dt>更新时间</dt>
              <dd>{{ new Date(desktopStatus.lastChangedAt).toLocaleTimeString() }}</dd>
            </div>
            <div>
              <dt>数据库</dt>
              <dd>{{ databaseStatus?.containerCount ?? 0 }} containers</dd>
            </div>
            <div>
              <dt>最近扫描</dt>
              <dd>{{ scanResult ? `${scanResult.insertedOrUpdated} items` : "ready" }}</dd>
            </div>
          </dl>
          <div class="file-preview">
            <strong>{{ selectedFile ? selectedFile.displayName || selectedFile.filename : "未选择文件" }}</strong>
            <span>{{ selectedFile?.fullPath ?? desktopStatus.message ?? "单击文件项可查看路径，双击可打开。" }}</span>
          </div>
          <ChatPanel />
        </div>
      </div>
    </section>

    <section class="feature-band">
      <article>
        <Database :size="24" />
        <h3>本地状态</h3>
        <p>{{ databaseStatus?.initialized ? "SQLite ready" : "initializing" }}</p>
      </article>
      <article>
        <CloudSun :size="24" />
        <h3>天气粒子</h3>
        <p>rain / snow / leaves / light / fog</p>
      </article>
      <article>
        <Bot :size="24" />
        <h3>桌宠与 AI</h3>
        <p>pet placeholder / local fallback / provider adapter</p>
      </article>
    </section>

    <aside class="activity-strip">
      <strong>Activity</strong>
      <span v-for="entry in activityLog" :key="entry">{{ entry }}</span>
    </aside>

    <div v-if="contextMenu" class="context-menu" :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }">
      <button type="button" @click="openFile(contextMenu.file.id)">打开</button>
      <button type="button" @click="openFileLocation(contextMenu.file.id)">打开所在位置</button>
      <button
        v-for="container in containers"
        :key="container.id"
        type="button"
        @click="moveFileToContainer(contextMenu!.file.id, container.id)"
      >
        移动到：{{ container.name }}
      </button>
      <button type="button" @click="renameFileAlias(contextMenu.file)">重命名显示名</button>
      <button type="button" @click="hideFile(contextMenu.file.id)">从 Project D 隐藏</button>
      <button type="button" @click="scanDesktop">刷新文件信息</button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import {
  AppWindow, Archive, ArrowRight, ChevronLeft, ChevronRight, Code2,
  Copy, ExternalLink, EyeOff, FileQuestion, FileText, Film, Folder, FolderOpen, FolderPlus,
  Image as ImageIcon, Inbox, LayoutGrid, LocateFixed, MapPin, Palette, PanelRightOpen,
  Pencil, RefreshCcw, Save, Search, Sparkles, Undo2, X
} from "lucide-vue-next";
import { wallpaperDisplayLabel } from "@shared/wallpaper-library";
import { CONTAINER_ACCENT_OPTIONS, containerAccentOption, type ContainerAccent } from "@shared/container-accents";
import type {
  ActionExecution, ActionPlan, ContainerWithFiles, DesktopFileRecord, DesktopStatus,
  FilePreviewData, LayoutRecord, PortalConfig, PortalResource, ScanResult,
  SuggestionRecord, WallpaperLibraryItem, WorkspaceScene, WorkspaceSearchResult
} from "@shared/types";

const containers = ref<ContainerWithFiles[]>([]);
const layouts = ref<LayoutRecord[]>([]);
const status = ref<DesktopStatus | null>(null);
const scanResult = ref<ScanResult | null>(null);
const selectedFile = ref<DesktopFileRecord | null>(null);
const preview = ref<FilePreviewData | null>(null);
const previewLoading = ref(false);
const contextMenu = ref<{ file: DesktopFileRecord; x: number; y: number } | null>(null);
const containerMenu = ref<{ container: ContainerWithFiles; x: number; y: number } | null>(null);
const draggingFileId = ref<number | null>(null);
const dropTargetContainerId = ref<number | null>(null);
const layoutOperation = ref<{
  kind: "move" | "resize-height" | "resize-corner";
  containerId: number;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
} | null>(null);
const wallpaperLibrary = ref<WallpaperLibraryItem[]>([]);
const currentWallpaperId = ref<string | null>(null);
const currentWallpaperLabel = computed(() =>
  wallpaperDisplayLabel(wallpaperLibrary.value.find((item) => item.id === currentWallpaperId.value))
);
const showLayoutPicker = ref(false);
const showScenePicker = ref(false);
const scenes = ref<WorkspaceScene[]>([]);
const portals = ref<PortalConfig[]>([]);
const portalResources = ref<Record<string, PortalResource[]>>({});
const workspaceSearchQuery = ref("");
const workspaceSearchResults = ref<WorkspaceSearchResult[]>([]);
const workspaceSearchStatus = ref("");
const workspaceSearchInput = ref<HTMLInputElement | null>(null);
const selectedSearchIndex = ref(0);
const showSearchPanel = ref(false);
const showActionPanel = ref(false);
const inboxPlan = ref<ActionPlan | null>(null);
const actionHistory = ref<ActionExecution[]>([]);
const actionMessage = ref("");
const actionBusy = ref(false);
const latestSuggestion = ref<SuggestionRecord | null>(null);
const statusMessageVisible = ref(true);
let statusMessageTimer = 0;
let unsubscribeDesktopUpdate: (() => void) | null = null;
let unsubscribeSettingsUpdate: (() => void) | null = null;
let unsubscribePortalUpdate: (() => void) | null = null;
let unsubscribeSuggestionUpdate: (() => void) | null = null;
let unsubscribeSearchFocus: (() => void) | null = null;
let previewRequestToken = 0;
let searchRequestToken = 0;
const fileIconMap: Record<string, any> = {
  program: AppWindow, document: FileText, image: ImageIcon,
  media: Film, code: Code2, archive: Archive, folder: Folder,
  design: Palette, other: FileQuestion
};
const movableInboxItems = computed(() => inboxPlan.value?.items.filter((item) => item.status === "pending" && !item.conflict).length ?? 0);
const latestUndoableExecution = computed(() => actionHistory.value.find((item) => item.undoable) ?? null);

async function refresh(): Promise<void> {
  const [nextContainers, nextStatus, nextLayouts, settings, nextWallpaperLibrary] = await Promise.all([
    window.projectD.getDesktopFiles(),
    window.projectD.getDesktopStatus(),
    window.projectD.getLayouts(),
    window.projectD.getSettings(),
    window.projectD.getWallpaperLibrary()
  ]);
  containers.value = nextContainers;
  status.value = nextStatus;
  layouts.value = nextLayouts;
  wallpaperLibrary.value = nextWallpaperLibrary;
  currentWallpaperId.value = settings.wallpaper.dynamicId;
}

async function refreshWorkspaceFeatures(): Promise<void> {
  const [nextScenes, nextPortals, nextHistory, suggestion] = await Promise.all([
    window.projectD.getWorkspaceScenes(),
    window.projectD.getFolderPortals(),
    window.projectD.getActionHistory(),
    window.projectD.getLatestSuggestion()
  ]);
  scenes.value = nextScenes;
  portals.value = nextPortals;
  actionHistory.value = nextHistory;
  latestSuggestion.value = suggestion;
  await refreshPortalResources();
}

async function refreshPortalResources(): Promise<void> {
  const entries = await Promise.all(portals.value.map(async (portal) => {
    try {
      return [portal.id, await window.projectD.getFolderPortalResources(portal.id)] as const;
    } catch {
      return [portal.id, []] as const;
    }
  }));
  portalResources.value = Object.fromEntries(entries);
}
function scheduleStatusMessage(): void {
  if (statusMessageTimer) window.clearTimeout(statusMessageTimer);
  statusMessageVisible.value = true;
  if (status.value?.mode === "active") {
    statusMessageTimer = window.setTimeout(() => {
      statusMessageVisible.value = false;
    }, 4500);
  }
}
async function scan(): Promise<void> { scanResult.value = await window.projectD.scanDesktop(); await refresh(); }
async function deactivate(): Promise<void> { status.value = await window.projectD.deactivateDesktop(); }
async function openFile(fileId: number): Promise<void> { contextMenu.value = null; await window.projectD.openFile(fileId); }
async function openFileLocation(fileId: number): Promise<void> { contextMenu.value = null; await window.projectD.openFileLocation(fileId); }
async function moveFileToContainer(fileId: number, containerId: number): Promise<void> {
  await window.projectD.moveFileToContainer(fileId, containerId);
  contextMenu.value = null;
  selectedFile.value = null;
  preview.value = null;
  await refresh();
}
async function renameFileAlias(file: DesktopFileRecord): Promise<void> {
  const nextName = window.prompt("Project D 内部显示名", file.displayName ?? file.filename);
  if (nextName === null) return;
  await window.projectD.renameFileAlias(file.id, nextName.trim());
  contextMenu.value = null;
  await refresh();
}
async function hideFile(fileId: number): Promise<void> {
  await window.projectD.hideFile(fileId);
  contextMenu.value = null;
  selectedFile.value = null;
  preview.value = null;
  await refresh();
}

async function selectFile(file: DesktopFileRecord): Promise<void> {
  const requestToken = ++previewRequestToken;
  showSearchPanel.value = false;
  showActionPanel.value = false;
  selectedFile.value = file; contextMenu.value = null; previewLoading.value = true; preview.value = null;
  try {
    const nextPreview = await window.projectD.getFilePreview(file.id);
    if (requestToken === previewRequestToken) preview.value = nextPreview;
  } catch {
    if (requestToken === previewRequestToken) {
      preview.value = { type: "unsupported", content: "读取失败", filename: file.filename, sizeLabel: "", modifiedAt: "" };
    }
  } finally {
    if (requestToken === previewRequestToken) previewLoading.value = false;
  }
}
function clearPreview(): void { previewRequestToken += 1; selectedFile.value = null; preview.value = null; previewLoading.value = false; }
function showFileMenu(event: MouseEvent, file: DesktopFileRecord): void {
  event.preventDefault(); event.stopPropagation(); containerMenu.value = null; selectedFile.value = file; contextMenu.value = { file, x: event.clientX, y: event.clientY };
}
function showContainerMenu(event: MouseEvent, container: ContainerWithFiles): void {
  event.preventDefault();
  event.stopPropagation();
  contextMenu.value = null;
  containerMenu.value = {
    container,
    x: Math.min(event.clientX, Math.max(12, window.innerWidth - 246)),
    y: Math.min(event.clientY, Math.max(12, window.innerHeight - 188))
  };
}
function closeContextMenus(): void { contextMenu.value = null; containerMenu.value = null; }
async function setContainerAccent(container: ContainerWithFiles, accentColor: ContainerAccent): Promise<void> {
  await window.projectD.updateContainerAccent(container.id, accentColor);
  container.accentColor = accentColor;
  containerMenu.value = null;
}
function fileIcon(file: DesktopFileRecord) { return fileIconMap[file.category] ?? FileQuestion; }
function fileKindLabel(file: DesktopFileRecord): string {
  if (file.category === "folder") return "文件夹";
  return file.extension?.replace(".", "").toUpperCase() || file.category;
}
function resourceKindLabel(resource: PortalResource): string {
  if (resource.isDirectory) return "文件夹";
  const extension = resource.name.includes(".") ? resource.name.split(".").pop()?.toUpperCase() : null;
  return extension || resource.category;
}
function zoneStyle(container: ContainerWithFiles, index: number): Record<string, string> {
  const fallbackLeft = 32 + (index % 4) * 324;
  const fallbackTop = 96 + Math.floor(index / 4) * 330;
  const hasStoredPosition = container.positionX > 0 || container.positionY > 0;
  const left = Math.max(12, hasStoredPosition ? container.positionX : fallbackLeft);
  const top = Math.max(76, hasStoredPosition ? container.positionY : fallbackTop);
  const width = Math.max(180, container.width);
  const height = container.isCollapsed ? 54 : Math.max(120, container.height);
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `min(${width}px, calc(100vw - ${left + 16}px))`,
    height: `min(${height}px, calc(100vh - ${top + 18}px))`,
    "--container-accent": containerAccentOption(container.accentColor).rgb
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snap(value: number, candidates: number[], threshold = 10): number {
  let closest = value;
  let distance = threshold + 1;
  for (const candidate of candidates) {
    const nextDistance = Math.abs(candidate - value);
    if (nextDistance < distance) {
      closest = candidate;
      distance = nextDistance;
    }
  }
  return distance <= threshold ? closest : value;
}

function getContainerById(containerId: number): ContainerWithFiles | undefined {
  return containers.value.find((container) => container.id === containerId);
}

async function persistContainerLayout(container: ContainerWithFiles): Promise<void> {
  await window.projectD.updateContainerPosition(
    container.id,
    Math.round(container.positionX),
    Math.round(container.positionY),
    Math.round(container.width),
    Math.round(container.height),
    container.isCollapsed
  );
}

function startContainerMove(event: PointerEvent, container: ContainerWithFiles): void {
  if (event.button !== 0) return;
  if ((event.target as HTMLElement).closest("button")) return;
  event.preventDefault();
  contextMenu.value = null;
  layoutOperation.value = {
    kind: "move",
    containerId: container.id,
    startX: event.clientX,
    startY: event.clientY,
    initialX: container.positionX,
    initialY: container.positionY,
    initialWidth: container.width,
    initialHeight: container.height
  };
  window.addEventListener("pointermove", handleLayoutPointerMove);
  window.addEventListener("pointerup", finishLayoutOperation, { once: true });
}

function startContainerResize(event: PointerEvent, container: ContainerWithFiles, kind: "resize-height" | "resize-corner" = "resize-height"): void {
  event.preventDefault();
  event.stopPropagation();
  layoutOperation.value = {
    kind,
    containerId: container.id,
    startX: event.clientX,
    startY: event.clientY,
    initialX: container.positionX,
    initialY: container.positionY,
    initialWidth: container.width,
    initialHeight: container.height
  };
  window.addEventListener("pointermove", handleLayoutPointerMove);
  window.addEventListener("pointerup", finishLayoutOperation, { once: true });
}

function handleLayoutPointerMove(event: PointerEvent): void {
  const operation = layoutOperation.value;
  if (!operation) return;
  const container = getContainerById(operation.containerId);
  if (!container) return;

  const deltaX = event.clientX - operation.startX;
  const deltaY = event.clientY - operation.startY;
  if (operation.kind === "move") {
    const maxX = Math.max(12, window.innerWidth - container.width - 12);
    const maxY = Math.max(76, window.innerHeight - 58);
    const otherContainers = containers.value.filter((item) => item.id !== container.id);
    const xCandidates = [12, maxX];
    const yCandidates = [76, maxY];
    for (const other of otherContainers) {
      xCandidates.push(other.positionX, other.positionX + other.width + 14, other.positionX - container.width - 14);
      yCandidates.push(other.positionY, other.positionY + other.height + 14, other.positionY - container.height - 14);
    }
    container.positionX = clamp(snap(operation.initialX + deltaX, xCandidates), 12, maxX);
    container.positionY = clamp(snap(operation.initialY + deltaY, yCandidates), 76, maxY);
    return;
  }

  if (operation.kind === "resize-corner") {
    container.width = clamp(operation.initialWidth + deltaX, 180, Math.max(180, window.innerWidth - container.positionX - 16));
  }
  container.height = clamp(operation.initialHeight + deltaY, 120, Math.max(120, window.innerHeight - container.positionY - 18));
}

function finishLayoutOperation(): void {
  const operation = layoutOperation.value;
  window.removeEventListener("pointermove", handleLayoutPointerMove);
  layoutOperation.value = null;
  if (!operation) return;

  const container = getContainerById(operation.containerId);
  if (container) void persistContainerLayout(container);
}

function toggleContainerCollapse(container: ContainerWithFiles): void {
  container.isCollapsed = !container.isCollapsed;
  void persistContainerLayout(container);
}

async function switchWallpaper(dir: -1 | 1): Promise<void> {
  if (wallpaperLibrary.value.length === 0) return;
  const currentIndex = wallpaperLibrary.value.findIndex((item) => item.id === currentWallpaperId.value);
  const nextIndex = (currentIndex + dir + wallpaperLibrary.value.length) % wallpaperLibrary.value.length;
  const next = wallpaperLibrary.value[nextIndex] ?? wallpaperLibrary.value[0];
  await window.projectD.applyWallpaper(next.id);
  currentWallpaperId.value = next.id;
}
async function applyLayout(layout: LayoutRecord): Promise<void> {
  await window.projectD.applyLayout(layout.id);
  showLayoutPicker.value = false;
  await refresh();
}

function portalZoneStyle(index: number): Record<string, string> {
  const gridIndex = containers.value.length + index;
  const left = 32 + (gridIndex % 4) * 324;
  const top = 96 + Math.floor(gridIndex / 4) * 330;
  return { left: `${left}px`, top: `${top}px`, width: "300px", height: "280px" };
}

function folderName(folderPath: string): string {
  return folderPath.split(/[\\/]/).filter(Boolean).at(-1) || "文件门户";
}

async function addPortal(): Promise<void> {
  const selectedPath = await window.projectD.chooseFolderPortal();
  if (!selectedPath) return;
  const proposed = folderName(selectedPath);
  const name = window.prompt("门户名称", proposed)?.trim();
  if (!name) return;
  await window.projectD.addFolderPortal(selectedPath, name);
  await refreshWorkspaceFeatures();
}

async function removePortal(portal: PortalConfig): Promise<void> {
  if (!window.confirm(`从桌面移除“${portal.name}”门户？不会删除原文件。`)) return;
  await window.projectD.removeFolderPortal(portal.id);
  await refreshWorkspaceFeatures();
}

async function openPortalResource(resource: PortalResource): Promise<void> {
  if (resource.status !== "ready") return;
  await window.projectD.openFolderPortalResource(resource.portalId, resource.relativePath);
}

async function saveScene(): Promise<void> {
  const name = window.prompt("保存当前桌面场景", `工作场景 ${scenes.value.length + 1}`)?.trim();
  if (!name) return;
  const scene = await window.projectD.saveWorkspaceScene(name);
  scenes.value = [scene, ...scenes.value.filter((item) => item.id !== scene.id)];
  actionMessage.value = `已保存场景：${scene.name}`;
}

async function applyScene(scene: WorkspaceScene): Promise<void> {
  await window.projectD.applyWorkspaceScene(scene.id);
  showScenePicker.value = false;
  actionMessage.value = `已恢复场景：${scene.name}`;
  await Promise.all([refresh(), refreshWorkspaceFeatures()]);
}

async function prepareDesktopInbox(fromSuggestion = false): Promise<void> {
  showSearchPanel.value = false;
  clearPreview();
  showActionPanel.value = true;
  actionBusy.value = true;
  try {
    inboxPlan.value = await window.projectD.createDesktopInboxPlan();
    actionMessage.value = inboxPlan.value.summary;
    if (fromSuggestion && latestSuggestion.value) {
      await window.projectD.dismissSuggestion(latestSuggestion.value.id);
      latestSuggestion.value = null;
    }
  } finally {
    actionBusy.value = false;
  }
}

async function executeInboxPlan(): Promise<void> {
  if (!inboxPlan.value || movableInboxItems.value === 0 || actionBusy.value) return;
  if (!window.confirm(`确认移动 ${movableInboxItems.value} 项文件？同名冲突将跳过，完成后可以撤销。`)) return;
  actionBusy.value = true;
  try {
    const execution = await window.projectD.executeActionPlan(inboxPlan.value.id);
    actionMessage.value = execution.summary;
    inboxPlan.value = null;
    actionHistory.value = await window.projectD.getActionHistory();
    await refresh();
  } finally {
    actionBusy.value = false;
  }
}

async function undoLatestAction(): Promise<void> {
  if (!latestUndoableExecution.value || actionBusy.value) return;
  actionBusy.value = true;
  try {
    const execution = await window.projectD.undoActionExecution(latestUndoableExecution.value.id);
    actionMessage.value = execution.summary;
    actionHistory.value = await window.projectD.getActionHistory();
    await refresh();
  } finally {
    actionBusy.value = false;
  }
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

async function focusSearch(): Promise<void> {
  showActionPanel.value = false;
  clearPreview();
  showSearchPanel.value = true;
  await nextTick();
  workspaceSearchInput.value?.focus();
}

async function searchWorkspace(): Promise<void> {
  const query = workspaceSearchQuery.value.trim();
  if (!query) {
    workspaceSearchResults.value = [];
    workspaceSearchStatus.value = "输入文件名、扩展名，或使用 in:desktop / in:portal";
    return;
  }
  const requestToken = ++searchRequestToken;
  workspaceSearchStatus.value = "正在搜索桌面与已授权门户...";
  try {
    const results = await window.projectD.searchWorkspace(query, 12);
    if (requestToken !== searchRequestToken) return;
    workspaceSearchResults.value = results;
    selectedSearchIndex.value = 0;
    workspaceSearchStatus.value = results.length > 0 ? `找到 ${results.length} 项` : "没有找到匹配项";
  } catch {
    if (requestToken === searchRequestToken) {
      workspaceSearchResults.value = [];
      workspaceSearchStatus.value = "搜索暂时不可用，请稍后重试";
    }
  }
}

async function openSearchResult(result: WorkspaceSearchResult): Promise<void> {
  try {
    await window.projectD.openWorkspaceSearchResult(result.id);
    workspaceSearchStatus.value = `已打开：${result.title}`;
  } catch {
    workspaceSearchStatus.value = `无法打开：${result.title}，结果可能已失效`;
  }
}

async function revealSearchResult(result: WorkspaceSearchResult): Promise<void> {
  try {
    await window.projectD.revealWorkspaceSearchResult(result.id);
    workspaceSearchStatus.value = `已定位：${result.title}`;
  } catch {
    workspaceSearchStatus.value = `无法定位：${result.title}，结果可能已失效`;
  }
}

async function copySearchResultPath(result: WorkspaceSearchResult): Promise<void> {
  try {
    await window.projectD.copyWorkspaceSearchResultPath(result.id);
    workspaceSearchStatus.value = `已复制路径：${result.title}`;
  } catch {
    workspaceSearchStatus.value = `无法复制路径：${result.title}，结果可能已失效`;
  }
}

async function pinSearchResultToScene(result: WorkspaceSearchResult): Promise<void> {
  const scenes = await window.projectD.getWorkspaceScenes();
  if (scenes.length === 0) {
    workspaceSearchStatus.value = "没有可用场景，请先创建一个场景";
    return;
  }
  const sceneId = scenes[0].id;
  try {
    await window.projectD.pinSearchResultToScene(result.id, sceneId);
    workspaceSearchStatus.value = `已钉到场景：${result.title}`;
  } catch {
    workspaceSearchStatus.value = `无法钉到场景：${result.title}，结果可能已失效`;
  }
}

async function addSearchResultToPortal(result: WorkspaceSearchResult): Promise<void> {
  workspaceSearchStatus.value = `等待授权：${result.title}`;
  try {
    const portal = await window.projectD.addSearchResultToPortal(result.id);
    if (!portal) {
      workspaceSearchStatus.value = "已取消门户授权";
      return;
    }
    await refreshWorkspaceFeatures();
    workspaceSearchStatus.value = `已授权只读门户：${portal.name}`;
  } catch (error) {
    workspaceSearchStatus.value = error instanceof Error ? error.message : `无法授权门户：${result.title}`;
  }
}

function handleSearchKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    showSearchPanel.value = false;
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const count = workspaceSearchResults.value.length;
    if (count === 0) return;
    selectedSearchIndex.value = (selectedSearchIndex.value + (event.key === "ArrowDown" ? 1 : -1) + count) % count;
    return;
  }
  if (event.key === "Enter" && workspaceSearchResults.value[selectedSearchIndex.value]) {
    event.preventDefault();
    void openSearchResult(workspaceSearchResults.value[selectedSearchIndex.value]);
  }
}

function startFileDrag(event: DragEvent, file: DesktopFileRecord): void {
  draggingFileId.value = file.id;
  event.dataTransfer?.setData("application/x-projectd-file", String(file.id));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

function endFileDrag(): void {
  draggingFileId.value = null;
  dropTargetContainerId.value = null;
}

async function dropFile(event: DragEvent, container: ContainerWithFiles): Promise<void> {
  event.preventDefault();
  const transferred = Number(event.dataTransfer?.getData("application/x-projectd-file"));
  const fileId = draggingFileId.value ?? (Number.isInteger(transferred) ? transferred : null);
  dropTargetContainerId.value = null;
  draggingFileId.value = null;
  if (!fileId) return;
  const source = containers.value.find((item) => item.files.some((file) => file.id === fileId));
  if (source?.id === container.id) return;
  await moveFileToContainer(fileId, container.id);
}

onMounted(async () => {
  unsubscribeDesktopUpdate = window.projectD.onDesktopFilesUpdated(() => { void refresh(); });
  unsubscribeSettingsUpdate = window.projectD.onSettingsUpdated(() => { void refresh(); });
  unsubscribePortalUpdate = window.projectD.onPortalsUpdated(() => { void refreshWorkspaceFeatures(); });
  unsubscribeSuggestionUpdate = window.projectD.onSuggestionCreated((suggestion) => {
    latestSuggestion.value = suggestion;
  });
  unsubscribeSearchFocus = window.projectD.onFocusWorkspaceSearch(() => { void focusSearch(); });
  const initialized = await Promise.allSettled([refresh(), refreshWorkspaceFeatures()]);
  if (initialized.some((result) => result.status === "rejected")) {
    actionMessage.value = "部分桌面数据暂时不可用，Project D 会在下一次更新时自动重试。";
  }
  scheduleStatusMessage();
});
onUnmounted(() => {
  previewRequestToken += 1;
  searchRequestToken += 1;
  unsubscribeDesktopUpdate?.();
  unsubscribeSettingsUpdate?.();
  unsubscribePortalUpdate?.();
  unsubscribeSuggestionUpdate?.();
  unsubscribeSearchFocus?.();
  if (statusMessageTimer) window.clearTimeout(statusMessageTimer);
});
</script>

<template>
  <main class="overlay-page" @click="closeContextMenus">
    <header class="overlay-toolbar">
      <div class="toolbar-left">
        <p>Project D Desktop</p>
        <h1>{{ status?.mode === "safe-mode" ? "安全模式" : "桌面整理" }}</h1>
      </div>
      <div class="toolbar-right">
        <div class="pull-cord-group">
          <button type="button" title="上一张壁纸" @click="switchWallpaper(-1)"><ChevronLeft :size="18" /></button>
          <span class="pull-cord-label">{{ currentWallpaperLabel }}</span>
          <button type="button" title="下一张壁纸" @click="switchWallpaper(1)"><ChevronRight :size="18" /></button>
        </div>
        <div class="layout-picker-wrapper">
          <button type="button" title="切换布局" @click="showLayoutPicker = !showLayoutPicker"><LayoutGrid :size="18" /></button>
          <div v-if="showLayoutPicker" class="layout-picker-dropdown">
            <button v-for="layout in layouts" :key="layout.id" type="button" @click="applyLayout(layout)">
              {{ layout.name }} ({{ layout.columns }}列)
            </button>
          </div>
        </div>
        <div class="layout-picker-wrapper">
          <button type="button" title="恢复工作场景" @click="showScenePicker = !showScenePicker"><Sparkles :size="18" /></button>
          <div v-if="showScenePicker" class="layout-picker-dropdown scene-picker-dropdown">
            <small v-if="scenes.length === 0">还没有保存的场景</small>
            <button v-for="scene in scenes" :key="scene.id" type="button" @click="applyScene(scene)">
              <span>{{ scene.name }}</span><small>{{ new Date(scene.updatedAt).toLocaleDateString() }}</small>
            </button>
          </div>
        </div>
        <button type="button" title="保存当前场景" @click="saveScene"><Save :size="18" /></button>
        <button type="button" title="添加文件夹门户" @click="addPortal"><FolderPlus :size="18" /></button>
        <button type="button" title="搜索桌面与门户" @click="focusSearch"><Search :size="18" /></button>
        <button class="toolbar-badge-button" type="button" title="桌面收件箱" @click="prepareDesktopInbox(false)">
          <Inbox :size="18" /><span v-if="latestSuggestion" class="toolbar-badge"></span>
        </button>
        <button type="button" title="刷新" @click="scan"><RefreshCcw :size="18" /></button>
        <button type="button" title="安全归位" @click="deactivate"><PanelRightOpen :size="18" /></button>
      </div>
    </header>
    <p v-if="status?.message && (statusMessageVisible || status.mode === 'safe-mode' || status.mode === 'error')" class="overlay-message">{{ status.message }}</p>

    <section class="overlay-desktop desktop-grid">
      <article
        v-for="(container, index) in containers"
        :key="container.id"
        class="overlay-zone zone-card"
        :class="{
          collapsed: container.isCollapsed,
          moving: layoutOperation?.containerId === container.id,
          'drop-target': dropTargetContainerId === container.id
        }"
        :style="zoneStyle(container, index)"
        @dragenter.prevent="dropTargetContainerId = container.id"
        @dragover.prevent
        @drop="dropFile($event, container)"
        @contextmenu="showContainerMenu($event, container)"
      >
        <header class="zone-titlebar" @pointerdown="startContainerMove($event, container)">
          <div class="zone-titlebar-left">
            <span class="zone-dot" />
            <strong>{{ container.name }}</strong>
          </div>
          <span class="zone-count">{{ container.files.length }}</span>
          <button
            type="button"
            class="container-collapse-button"
            :title="container.isCollapsed ? '展开容器' : '折叠容器'"
            @click="toggleContainerCollapse(container)"
          >
            {{ container.isCollapsed ? "+" : "-" }}
          </button>
        </header>
        <div v-if="!container.isCollapsed" class="overlay-icon-grid">
          <button v-for="file in container.files" :key="file.id"
            class="overlay-file desktop-icon"
            :class="{ selected: selectedFile?.id === file.id }"
            type="button" :title="file.fullPath" draggable="true"
            @click="selectFile(file)" @dblclick="openFile(file.id)"
            @dragstart="startFileDrag($event, file)" @dragend="endFileDrag"
            @contextmenu.stop="showFileMenu($event, file)">
            <span class="desktop-icon-art" :data-kind="file.category">
              <img v-if="file.iconDataUrl" class="desktop-native-icon" :src="file.iconDataUrl" :alt="fileKindLabel(file)" />
              <component v-else :is="fileIcon(file)" :size="36" :stroke-width="1.75" />
            </span>
            <span class="desktop-icon-name">{{ file.displayName || file.filename }}</span>
            <small>{{ fileKindLabel(file) }}</small>
          </button>
        </div>
        <p v-if="!container.isCollapsed && container.files.length === 0" class="overlay-empty">这里暂时没有文件</p>
        <button
          v-if="!container.isCollapsed"
          type="button"
          class="overlay-zone-resize"
          title="调整容器高度"
          @pointerdown="startContainerResize($event, container)"
        ></button>
        <button
          v-if="!container.isCollapsed"
          type="button"
          class="overlay-zone-resize-corner"
          title="调整容器宽高"
          @pointerdown="startContainerResize($event, container, 'resize-corner')"
        ></button>
      </article>
      <article
        v-for="(portal, portalIndex) in portals"
        :key="portal.id"
        class="overlay-zone zone-card portal-zone"
        :style="portalZoneStyle(portalIndex)"
      >
        <header class="zone-titlebar">
          <div class="zone-titlebar-left"><span class="zone-dot portal-dot" /><strong>{{ portal.name }}</strong></div>
          <span class="zone-count">{{ portalResources[portal.id]?.length ?? 0 }}</span>
          <button type="button" class="container-collapse-button" title="移除门户" @click="removePortal(portal)"><X :size="14" /></button>
        </header>
        <div class="portal-resource-grid">
          <button
            v-for="resource in portalResources[portal.id] ?? []"
            :key="resource.relativePath"
            type="button"
            :disabled="resource.status !== 'ready'"
            :title="resource.status === 'ready' ? resource.name : `资源不可用：${resource.status}`"
            @dblclick="openPortalResource(resource)"
          >
            <span class="desktop-icon-art" :data-kind="resource.category">
              <Folder v-if="resource.isDirectory" :size="30" />
              <component v-else :is="fileIconMap[resource.category] ?? FileQuestion" :size="30" />
            </span>
            <strong>{{ resource.name }}</strong>
            <small>{{ resource.status === "ready" ? resourceKindLabel(resource) : resource.status }}</small>
          </button>
          <p v-if="(portalResources[portal.id]?.length ?? 0) === 0" class="overlay-empty">门户为空或暂时离线</p>
        </div>
      </article>
    </section>

    <section v-if="latestSuggestion" class="desktop-suggestion-toast" aria-live="polite">
      <Sparkles :size="18" />
      <div><strong>{{ latestSuggestion.title }}</strong><small>{{ latestSuggestion.detail }}</small></div>
      <button type="button" @click="prepareDesktopInbox(true)">查看方案</button>
    </section>

    <aside v-if="showSearchPanel" class="desktop-work-panel search-work-panel">
      <header><div><small>本地优先</small><strong>搜索桌面与门户</strong></div><button type="button" title="关闭搜索" @click="showSearchPanel = false"><X :size="18" /></button></header>
      <form class="desktop-search-form" @submit.prevent="searchWorkspace">
        <Search :size="17" />
        <input ref="workspaceSearchInput" v-model="workspaceSearchQuery" type="search" placeholder="文件名、.pdf、in:portal" @keydown="handleSearchKeydown" />
        <button type="submit">搜索</button>
      </form>
      <small class="desktop-work-status">{{ workspaceSearchStatus || "结果仅来自桌面和你明确授权的门户" }}</small>
      <div class="desktop-search-results">
        <article v-for="(result, index) in workspaceSearchResults" :key="result.id" :class="{ selected: index === selectedSearchIndex }">
          <button class="search-result-main" type="button" @click="selectedSearchIndex = index" @dblclick="openSearchResult(result)">
            <strong>{{ result.title }}</strong><small>{{ { desktop: "桌面", portal: "门户", everything: "Everything", "windows-search": "Windows 索引" }[result.origin] }} · {{ result.category }}</small>
          </button>
          <div class="search-result-actions">
            <button type="button" title="打开" @click="openSearchResult(result)"><ExternalLink :size="15" /></button>
            <button type="button" title="在资源管理器中定位" @click="revealSearchResult(result)"><LocateFixed :size="15" /></button>
            <button type="button" title="复制完整路径" @click="copySearchResultPath(result)"><Copy :size="15" /></button>
            <button type="button" title="钉到场景" @click="pinSearchResultToScene(result)"><MapPin :size="15" /></button>
            <button v-if="result.origin !== 'portal'" type="button" title="将所在文件夹授权为只读门户" @click="addSearchResultToPortal(result)"><FolderPlus :size="15" /></button>
          </div>
        </article>
      </div>
    </aside>

    <aside v-if="showActionPanel" class="desktop-work-panel action-plan-panel">
      <header>
        <div><small>执行前预览 · 风险 {{ inboxPlan?.riskLevel ?? "L2" }}</small><strong>桌面收件箱方案</strong></div>
        <button type="button" title="关闭方案" @click="showActionPanel = false"><X :size="18" /></button>
      </header>
      <p class="action-plan-summary">{{ inboxPlan?.summary || actionMessage || "正在生成安全整理方案..." }}</p>
      <div v-if="inboxPlan" class="action-plan-list">
        <article v-for="item in inboxPlan.items" :key="item.id" :class="{ conflict: item.conflict }">
          <div><strong>{{ item.label }}</strong><small>{{ item.category }} · {{ formatBytes(item.sizeBytes) }}</small></div>
          <p><span>来源</span>{{ item.sourcePath }}</p>
          <p><span>目标</span>{{ item.targetPath }}</p>
          <small v-if="item.conflict" class="action-conflict">已跳过：{{ item.conflict }}</small>
        </article>
      </div>
      <footer>
        <button v-if="latestUndoableExecution" class="action-secondary" type="button" :disabled="actionBusy" @click="undoLatestAction"><Undo2 :size="15" />撤销最近整理</button>
        <button class="action-primary" type="button" :disabled="actionBusy || movableInboxItems === 0" @click="executeInboxPlan">确认整理 {{ movableInboxItems }} 项</button>
      </footer>
    </aside>

    <aside v-if="preview" class="preview-panel visible">
      <header>
        <strong>{{ preview.filename }}</strong>
        <button type="button" title="关闭预览" @click="clearPreview"><X :size="18" /></button>
      </header>
      <div class="preview-meta"><span>{{ preview.sizeLabel }}</span><span>{{ preview.modifiedAt }}</span></div>
      <div class="preview-body">
        <div v-if="previewLoading" class="preview-loading">加载中...</div>
        <pre v-else-if="preview.type === 'text'" class="preview-text">{{ preview.content }}</pre>
        <img v-else-if="preview.type === 'image'" class="preview-image" :src="preview.content" :alt="preview.filename" />
        <p v-else class="preview-unsupported">{{ preview.content }}</p>
      </div>
    </aside>

    <footer v-if="scanResult" class="overlay-footer">扫描完成：{{ scanResult.insertedOrUpdated }} 个条目</footer>
    <div v-if="contextMenu" class="context-menu" :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }">
      <button type="button" @click="openFile(contextMenu.file.id)"><ExternalLink :size="15" />打开</button>
      <button type="button" @click="openFileLocation(contextMenu.file.id)"><FolderOpen :size="15" />打开所在位置</button>
      <button
        v-for="container in containers"
        :key="container.id"
        type="button"
        :disabled="container.id === contextMenu.file.containerId"
        @click="moveFileToContainer(contextMenu.file.id, container.id)"
      ><ArrowRight :size="15" />移动到：{{ container.name }}</button>
      <button type="button" @click="renameFileAlias(contextMenu.file)"><Pencil :size="15" />重命名显示名</button>
      <button type="button" @click="hideFile(contextMenu.file.id)"><EyeOff :size="15" />从 Project D 隐藏</button>
      <button type="button" @click="scan"><RefreshCcw :size="15" />刷新文件信息</button>
    </div>
    <div v-if="containerMenu" class="context-menu container-color-menu" :style="{ left: `${containerMenu.x}px`, top: `${containerMenu.y}px` }" @click.stop>
      <div class="container-color-heading"><Palette :size="15" /><span>{{ containerMenu.container.name }} · 容器配色</span></div>
      <div class="container-color-grid">
        <button
          v-for="accent in CONTAINER_ACCENT_OPTIONS"
          :key="accent.id"
          type="button"
          :class="{ selected: containerMenu.container.accentColor === accent.id }"
          :title="accent.label"
          @click="setContainerAccent(containerMenu.container, accent.id)"
        ><span :style="{ backgroundColor: accent.color }"></span><small>{{ accent.label }}</small></button>
      </div>
    </div>
  </main>
</template>

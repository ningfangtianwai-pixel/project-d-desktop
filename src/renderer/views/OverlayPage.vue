<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import {
  AppWindow, Archive, ChevronLeft, ChevronRight, Code2,
  FileQuestion, FileText, Film, Folder,
  Image as ImageIcon, Palette, PanelRightOpen,
  RefreshCcw, X, LayoutGrid
} from "lucide-vue-next";
import WallpaperStage from "../components/WallpaperStage.vue";
import type { ContainerWithFiles, DesktopFileRecord, DesktopStatus, FilePreviewData, LayoutRecord, ScanResult } from "@shared/types";

const containers = ref<ContainerWithFiles[]>([]);
const layouts = ref<LayoutRecord[]>([]);
const status = ref<DesktopStatus | null>(null);
const scanResult = ref<ScanResult | null>(null);
const selectedFile = ref<DesktopFileRecord | null>(null);
const preview = ref<FilePreviewData | null>(null);
const previewLoading = ref(false);
const contextMenu = ref<{ file: DesktopFileRecord; x: number; y: number } | null>(null);
const wallpaperStyleNames: Record<string, string> = {
  anime: "动漫", aurora: "极光", ink: "墨韵",
  garden: "花园", ocean: "海洋", sunset: "日落", user: "自定义"
};
const wallpaperStyleIds = ["anime", "aurora", "ink", "garden", "ocean", "sunset", "user"];
const currentStyleId = ref("anime");
const showLayoutPicker = ref(false);
let unsubscribeDesktopUpdate: (() => void) | null = null;
const fileIconMap: Record<string, any> = {
  program: AppWindow, document: FileText, image: ImageIcon,
  media: Film, code: Code2, archive: Archive, folder: Folder,
  design: Palette, other: FileQuestion
};

async function refresh(): Promise<void> {
  containers.value = await window.projectD.getDesktopFiles();
  status.value = await window.projectD.getDesktopStatus();
  layouts.value = await window.projectD.getLayouts();
  const settings = await window.projectD.getSettings();
  currentStyleId.value = settings.wallpaper.currentStyle;
}
async function scan(): Promise<void> { scanResult.value = await window.projectD.scanDesktop(); await refresh(); }
async function deactivate(): Promise<void> { status.value = await window.projectD.deactivateDesktop(); }
async function openFile(fileId: number): Promise<void> { contextMenu.value = null; await window.projectD.openFile(fileId); }
async function openFileLocation(fileId: number): Promise<void> { contextMenu.value = null; await window.projectD.openFileLocation(fileId); }

async function selectFile(file: DesktopFileRecord): Promise<void> {
  selectedFile.value = file; contextMenu.value = null; previewLoading.value = true; preview.value = null;
  try { preview.value = await window.projectD.getFilePreview(file.id); }
  catch { preview.value = { type: "unsupported", content: "读取失败", filename: file.filename, sizeLabel: "", modifiedAt: "" }; }
  previewLoading.value = false;
}
function clearPreview(): void { selectedFile.value = null; preview.value = null; }
function showFileMenu(event: MouseEvent, file: DesktopFileRecord): void {
  event.preventDefault(); selectedFile.value = file; contextMenu.value = { file, x: event.clientX, y: event.clientY };
}
function fileIcon(file: DesktopFileRecord) { return fileIconMap[file.category] ?? FileQuestion; }
function fileKindLabel(file: DesktopFileRecord): string {
  if (file.category === "folder") return "文件夹";
  return file.extension?.replace(".", "").toUpperCase() || file.category;
}
function zoneStyle(container: ContainerWithFiles, index: number): Record<string, string> {
  const fallbackLeft = 32 + (index % 4) * 324;
  const fallbackTop = 96 + Math.floor(index / 4) * 330;
  const hasPos = container.positionX > 0 || container.positionY > 0;
  const left = Math.max(18, Math.min(hasPos ? container.positionX : fallbackLeft, window.innerWidth - 280));
  const top = Math.max(60, Math.min(hasPos ? container.positionY : fallbackTop, window.innerHeight - 240));
  return { left: `${left}px`, top: `${top}px`, width: `${Math.max(260, Math.min(container.width, 600))}px`, height: `${Math.max(210, Math.min(container.height, 800))}px` };
}

// Drag state
interface DragInfo { el: HTMLElement; startX: number; startY: number; origLeft: number; origTop: number; cid: number }
let dragData: DragInfo | null = null;

function onHeaderDown(event: PointerEvent, container: ContainerWithFiles): void {
  const el = (event.currentTarget as HTMLElement).closest('.overlay-zone') as HTMLElement;
  if (!el) return;
  el.setPointerCapture(event.pointerId);
  dragData = {
    el, cid: container.id,
    startX: event.clientX, startY: event.clientY,
    origLeft: parseFloat(el.style.left) || 0,
    origTop: parseFloat(el.style.top) || 0
  };
}

function onZonePointerMove(event: PointerEvent): void {
  if (!dragData) return;
  const dx = event.clientX - dragData.startX;
  const dy = event.clientY - dragData.startY;
  dragData.el.style.left = `${Math.max(18, Math.min(window.innerWidth - 260, dragData.origLeft + dx))}px`;
  dragData.el.style.top = `${Math.max(60, Math.min(window.innerHeight - 220, dragData.origTop + dy))}px`;
}

async function onZonePointerUp(_event: PointerEvent): Promise<void> {
  const data = dragData;
  if (!data) return;
  dragData = null;
  const left = parseFloat(data.el.style.left) || 0;
  const top = parseFloat(data.el.style.top) || 0;
  await window.projectD.updateContainerPosition(data.cid, left, top, 300, 400);
}

async function switchWallpaper(dir: -1 | 1): Promise<void> {
  const idx = wallpaperStyleIds.indexOf(currentStyleId.value);
  const nextIdx = (idx + dir + wallpaperStyleIds.length) % wallpaperStyleIds.length;
  currentStyleId.value = wallpaperStyleIds[nextIdx];
  await window.projectD.updateSettings({ wallpaper: { currentStyle: currentStyleId.value as any, currentIndex: 0, isDynamic: false, autoRotate: false, rotateInterval: 300 } });
}
async function applyLayout(layout: LayoutRecord): Promise<void> { await window.projectD.applyLayout(layout.id); showLayoutPicker.value = false; }

onMounted(async () => { await refresh(); unsubscribeDesktopUpdate = window.projectD.onDesktopFilesUpdated(() => { void refresh(); }); });
onUnmounted(() => { unsubscribeDesktopUpdate?.(); });
</script>

<template>
  <main class="overlay-page">
    <WallpaperStage />
    <header class="overlay-toolbar">
      <div class="toolbar-left">
        <p>Project D Desktop</p>
        <h1>{{ status?.mode === "safe-mode" ? "安全模式" : "桌面整理" }}</h1>
      </div>
      <div class="toolbar-right">
        <div class="pull-cord-group">
          <button type="button" title="上一风格" @click="switchWallpaper(-1)"><ChevronLeft :size="18" /></button>
          <span class="pull-cord-label">{{ wallpaperStyleNames[currentStyleId] || currentStyleId }}</span>
          <button type="button" title="下一风格" @click="switchWallpaper(1)"><ChevronRight :size="18" /></button>
        </div>
        <div class="layout-picker-wrapper">
          <button type="button" title="切换布局" @click="showLayoutPicker = !showLayoutPicker"><LayoutGrid :size="18" /></button>
          <div v-if="showLayoutPicker" class="layout-picker-dropdown">
            <button v-for="layout in layouts" :key="layout.id" type="button" @click="applyLayout(layout)">
              {{ layout.name }} ({{ layout.columns }}列)
            </button>
          </div>
        </div>
        <button type="button" title="刷新" @click="scan"><RefreshCcw :size="18" /></button>
        <button type="button" title="安全归位" @click="deactivate"><PanelRightOpen :size="18" /></button>
      </div>
    </header>
    <p v-if="status?.message" class="overlay-message">{{ status.message }}</p>

    <section class="overlay-desktop">
      <article
        v-for="(container, index) in containers"
        :key="container.id"
        class="overlay-zone"
        :class="{ 'is-dragging': (dragData as any)?.cid === container.id }"
        :style="zoneStyle(container, index)"
        @pointermove="onZonePointerMove"
        @pointerup="onZonePointerUp"
        @pointercancel="onZonePointerUp"
      >
        <header @pointerdown="onHeaderDown($event, container)">
          <strong>{{ container.name }}</strong>
          <span>{{ container.files.length }}</span>
        </header>
        <div class="overlay-icon-grid">
          <button v-for="file in container.files" :key="file.id"
            class="overlay-file desktop-icon"
            :class="{ selected: selectedFile?.id === file.id }"
            type="button" :title="file.fullPath"
            @click="selectFile(file)" @dblclick="openFile(file.id)"
            @contextmenu="showFileMenu($event, file)">
            <span class="desktop-icon-art" :data-kind="file.category">
              <component :is="fileIcon(file)" :size="36" :stroke-width="1.75" />
            </span>
            <span class="desktop-icon-name">{{ file.displayName || file.filename }}</span>
            <small>{{ fileKindLabel(file) }}</small>
          </button>
        </div>
        <p v-if="container.files.length === 0" class="overlay-empty">这里暂时没有文件</p>
      </article>
    </section>

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
      <button type="button" @click="openFile(contextMenu.file.id)">打开</button>
      <button type="button" @click="openFileLocation(contextMenu.file.id)">打开所在位置</button>
    </div>
  </main>
</template>

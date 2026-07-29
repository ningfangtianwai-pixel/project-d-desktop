<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { ArrowLeft, Check, CheckCircle2, Download, Film, Image as ImageIcon, LoaderCircle, Monitor, Pause, Play, Plus, RefreshCcw, Trash2, TriangleAlert, Upload } from "lucide-vue-next";
import WallpaperStage from "../components/WallpaperStage.vue";
import { wallpaperDisplayLabel } from "@shared/wallpaper-library";
import type { LivePhotoImportPreview, SettingsSnapshot, WallpaperDisplayInfo, WallpaperLibraryItem } from "@shared/types";

const wallpaperLibrary = ref<WallpaperLibraryItem[]>([]);
const displays = ref<WallpaperDisplayInfo[]>([]);
const settings = ref<SettingsSnapshot | null>(null);
const selectedId = ref<string | null>(null);
const statusMessage = ref("");
type WallpaperStatusTone = "neutral" | "success" | "error";
const statusTone = ref<WallpaperStatusTone>("success");
const busy = ref(false);
const previewPlaying = ref(false);
const previewVideo = ref<HTMLVideoElement | null>(null);
const livePhotoDraft = ref<LivePhotoImportPreview | null>(null);
const livePhotoPreviewVideo = ref<HTMLVideoElement | null>(null);
const livePhotoDecodeState = ref<"waiting" | "ready" | "failed">("waiting");
let livePhotoDecodeTimer: number | null = null;

const selectedWallpaper = computed(() => wallpaperLibrary.value.find((item) => item.id === selectedId.value) ?? null);
const userWallpapers = computed(() => wallpaperLibrary.value.filter((item) => item.source === "user"));
const bundledWallpapers = computed(() => wallpaperLibrary.value.filter((item) => item.source !== "user"));

function assetUrl(item: WallpaperLibraryItem, variant: "original" | "thumbnail" | "cover" = "thumbnail"): string {
  if (item.source === "user") {
    return `projectd-media://wallpaper/${encodeURIComponent(item.id)}${variant === "original" ? "" : `?variant=${variant}`}`;
  }
  const file = variant === "cover" ? item.posterFile ?? item.file : item.file;
  return `${window.location.protocol === "file:" ? "./wallpapers/" : "/wallpapers/"}${file}`;
}

function selectWallpaper(item: WallpaperLibraryItem): void {
  selectedId.value = item.id;
  previewPlaying.value = false;
}

function setStatus(message: string, tone: WallpaperStatusTone = "success"): void {
  statusMessage.value = message;
  statusTone.value = tone;
  window.setTimeout(() => {
    if (statusMessage.value === message) statusMessage.value = "";
  }, 4200);
}

async function refreshLibrary(): Promise<void> {
  const [nextLibrary, nextSettings, nextDisplays] = await Promise.all([
    window.projectD.getWallpaperLibrary(),
    window.projectD.getSettings(),
    window.projectD.getWallpaperDisplays()
  ]);
  wallpaperLibrary.value = nextLibrary;
  settings.value = nextSettings;
  displays.value = nextDisplays;
  selectedId.value = nextSettings.wallpaper.dynamicId ?? nextLibrary[0]?.id ?? null;
}

async function applySelected(): Promise<void> {
  if (!selectedWallpaper.value || busy.value) return;
  const item = selectedWallpaper.value;
  busy.value = true;
  setStatus(`正在应用：${wallpaperDisplayLabel(item)}`, "neutral");
  try {
    settings.value = await window.projectD.applyWallpaper(item.id);
    await refreshLibrary();
    setStatus(`已应用：${wallpaperDisplayLabel(item)}`);
  } catch (error) {
    setStatus(`应用失败，已保留当前壁纸：${error instanceof Error ? error.message : String(error)}`, "error");
  } finally {
    busy.value = false;
  }
}

async function importWallpaper(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  setStatus("正在打开图片选择器……", "neutral");
  try {
    const imported = await window.projectD.importWallpaper();
    if (!imported) {
      setStatus("已取消图片导入", "neutral");
      return;
    }
    await refreshLibrary();
    selectedId.value = imported.id;
    setStatus(`已加入壁纸库：${imported.label}`);
  } catch (error) {
    setStatus(`导入失败：${error instanceof Error ? error.message : String(error)}`, "error");
  } finally {
    busy.value = false;
  }
}

async function importLivePhoto(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  setStatus("正在读取 Live Photo 配对媒体……", "neutral");
  try {
    const draft = await window.projectD.prepareLivePhotoImport();
    if (!draft) {
      setStatus("已取消 Live Photo 导入", "neutral");
      return;
    }
    livePhotoDraft.value = draft;
    livePhotoDecodeState.value = "waiting";
    if (livePhotoDecodeTimer !== null) window.clearTimeout(livePhotoDecodeTimer);
    livePhotoDecodeTimer = window.setTimeout(() => {
      if (livePhotoDecodeState.value === "waiting") livePhotoDecodeState.value = "failed";
    }, 8000);
  } catch (error) {
    setStatus(`Live Photo 导入失败：${error instanceof Error ? error.message : String(error)}`, "error");
  } finally {
    busy.value = false;
  }
}

async function confirmLivePhotoImport(): Promise<void> {
  const draft = livePhotoDraft.value;
  if (!draft || livePhotoDecodeState.value !== "ready" || busy.value) return;
  busy.value = true;
  setStatus("正在写入壁纸库……", "neutral");
  try {
    const imported = await window.projectD.confirmLivePhotoImport(draft.token);
    livePhotoDraft.value = null;
    await refreshLibrary();
    selectedId.value = imported.id;
    setStatus(`Live Photo 已确认导入：${imported.label}`);
  } catch (error) {
    setStatus(`Live Photo 导入失败：${error instanceof Error ? error.message : String(error)}`, "error");
  } finally {
    busy.value = false;
  }
}

function cancelLivePhotoPreview(): void {
  const token = livePhotoDraft.value?.token;
  if (livePhotoDecodeTimer !== null) window.clearTimeout(livePhotoDecodeTimer);
  livePhotoDecodeTimer = null;
  livePhotoDraft.value = null;
  if (token) void window.projectD.cancelLivePhotoImport(token);
}

function handleLivePhotoLoaded(): void {
  if (livePhotoDecodeTimer !== null) window.clearTimeout(livePhotoDecodeTimer);
  livePhotoDecodeTimer = null;
  const video = livePhotoPreviewVideo.value;
  livePhotoDecodeState.value = video && video.videoWidth > 0 && video.videoHeight > 0 ? "ready" : "failed";
}

function handleLivePhotoError(): void {
  if (livePhotoDecodeTimer !== null) window.clearTimeout(livePhotoDecodeTimer);
  livePhotoDecodeTimer = null;
  livePhotoDecodeState.value = "failed";
}

async function deleteSelected(): Promise<void> {
  const item = selectedWallpaper.value;
  if (!item || item.source !== "user" || busy.value) return;
  if (!window.confirm(`从壁纸库删除“${item.label}”？不会删除原始桌面文件。`)) return;
  busy.value = true;
  setStatus(`正在删除：${item.label}`, "neutral");
  try {
    await window.projectD.deleteWallpaper(item.id);
    await refreshLibrary();
    setStatus(`已删除：${item.label}`);
  } catch (error) {
    setStatus(`删除失败：${error instanceof Error ? error.message : String(error)}`, "error");
  } finally {
    busy.value = false;
  }
}

async function exportSelected(): Promise<void> {
  if (!selectedWallpaper.value || busy.value) return;
  const item = selectedWallpaper.value;
  setStatus(`正在准备原图：${item.label}`, "neutral");
  try {
    const result = await window.projectD.exportWallpaperOriginal(item.id);
    setStatus(result.cancelled ? "已取消原图导出" : `已导出：${result.filename ?? item.label}`, result.cancelled ? "neutral" : "success");
  } catch (error) {
    setStatus(`导出失败：${error instanceof Error ? error.message : String(error)}`, "error");
  }
}

async function assignDisplay(display: WallpaperDisplayInfo, wallpaperId: string): Promise<void> {
  setStatus(`正在更新 ${display.label} 的壁纸分配……`, "neutral");
  try {
    displays.value = await window.projectD.assignWallpaperToDisplay(display.id, wallpaperId || null);
    setStatus(`${display.label} 已更新壁纸分配`);
  } catch (error) {
    setStatus(`显示器分配失败：${error instanceof Error ? error.message : String(error)}`, "error");
  }
}

async function setDisplayFitMode(display: WallpaperDisplayInfo, fitMode: "cover" | "contain"): Promise<void> {
  setStatus(`正在更新 ${display.label} 的裁剪方式……`, "neutral");
  try {
    displays.value = await window.projectD.setWallpaperDisplayFitMode(display.id, fitMode);
    setStatus(`${display.label} 已更新裁剪方式`);
  } catch (error) {
    setStatus(`裁剪方式更新失败：${error instanceof Error ? error.message : String(error)}`, "error");
  }
}

async function togglePreview(): Promise<void> {
  const video = previewVideo.value;
  if (!video) return;
  if (video.paused) {
    await video.play().catch(() => undefined);
    previewPlaying.value = !video.paused;
  } else {
    video.pause();
    previewPlaying.value = false;
  }
}

function goBack(): void {
  window.location.hash = "";
}

onMounted(async () => {
  document.body.classList.add("wallpaper-window-body");
  try {
    await refreshLibrary();
  } catch (error) {
    setStatus(`壁纸库暂时不可用：${error instanceof Error ? error.message : String(error)}`, "error");
  }
});

onUnmounted(() => {
  cancelLivePhotoPreview();
  document.body.classList.remove("wallpaper-window-body");
});
</script>

<template>
  <main class="wallpaper-page wallpaper-studio-page">
    <WallpaperStage />
    <header class="wallpaper-studio-header">
      <button type="button" class="wallpaper-back-button" title="返回桌面" @click="goBack"><ArrowLeft :size="17" /><span>返回桌面</span></button>
      <div class="wallpaper-studio-title"><span>Project D / Wallpaper Studio</span><strong>壁纸工作台</strong></div>
      <div class="wallpaper-studio-actions">
        <button type="button" title="导入图片壁纸" :disabled="busy" @click="importWallpaper"><Upload :size="16" /><span>导入图片</span></button>
        <button type="button" title="导入 Live Photo" :disabled="busy" @click="importLivePhoto"><Film :size="16" /><span>Live Photo</span></button>
        <button type="button" title="刷新壁纸库" :disabled="busy" @click="refreshLibrary"><RefreshCcw :size="16" /></button>
      </div>
    </header>

    <section class="wallpaper-studio-layout">
      <div class="wallpaper-canvas-column">
        <section class="wallpaper-canvas-frame" aria-label="壁纸预览">
          <div v-if="selectedWallpaper" class="wallpaper-canvas-media">
            <video
              v-if="selectedWallpaper.type === 'video'"
              ref="previewVideo"
              :src="assetUrl(selectedWallpaper, 'original')"
              :poster="assetUrl(selectedWallpaper, 'cover')"
              muted
              loop
              playsinline
              preload="metadata"
              @pause="previewPlaying = false"
              @playing="previewPlaying = true"
            ></video>
            <img v-else :src="assetUrl(selectedWallpaper, 'original')" :alt="selectedWallpaper.label" />
          </div>
          <div v-else class="wallpaper-canvas-empty"><ImageIcon :size="28" /><span>选择一张壁纸开始</span></div>
          <div class="wallpaper-canvas-overlay">
            <span>{{ selectedWallpaper?.label || "未选择壁纸" }}</span>
            <button v-if="selectedWallpaper?.type === 'video'" type="button" :title="previewPlaying ? '暂停预览' : '播放预览'" @click="togglePreview">
              <Pause v-if="previewPlaying" :size="16" /><Play v-else :size="16" />
            </button>
          </div>
        </section>
        <div class="wallpaper-filmstrip" aria-label="壁纸胶片带">
          <button
            v-for="item in wallpaperLibrary"
            :key="item.id"
            type="button"
            class="wallpaper-filmstrip-item"
            :class="{ selected: selectedId === item.id, applied: settings?.wallpaper.dynamicId === item.id }"
            :title="wallpaperDisplayLabel(item)"
            @click="selectWallpaper(item)"
          >
            <img :src="assetUrl(item, item.type === 'video' ? 'cover' : 'thumbnail')" :alt="item.label" />
            <span>{{ item.label }}</span>
            <Check v-if="settings?.wallpaper.dynamicId === item.id" :size="12" />
          </button>
        </div>
      </div>

      <aside class="wallpaper-inspector">
        <div class="wallpaper-inspector-heading"><div><span>当前资产</span><strong>{{ selectedWallpaper?.label || "未选择" }}</strong></div><span v-if="selectedWallpaper" class="wallpaper-asset-badge">{{ selectedWallpaper.type === 'video' ? '动态' : '静态' }}</span></div>
        <p v-if="selectedWallpaper" class="wallpaper-asset-meta">{{ selectedWallpaper.style }} · {{ selectedWallpaper.source === 'user' ? '个人库' : '内置库' }}<span v-if="selectedWallpaper.livePhoto"> · Live Photo</span></p>
        <div class="wallpaper-inspector-actions">
          <button type="button" class="wallpaper-apply-primary" :disabled="!selectedWallpaper || busy" @click="applySelected"><Check :size="16" />应用到桌面</button>
          <button type="button" :disabled="!selectedWallpaper || busy" title="导出原图" @click="exportSelected"><Download :size="16" /></button>
          <button v-if="selectedWallpaper?.source === 'user'" type="button" :disabled="busy" title="删除个人壁纸" @click="deleteSelected"><Trash2 :size="16" /></button>
        </div>
        <div class="wallpaper-inspector-section">
          <div class="wallpaper-inspector-section-title"><Monitor :size="15" /><strong>显示器分配</strong></div>
          <label v-for="display in displays" :key="display.id" class="wallpaper-display-row">
            <span>{{ display.label }}<small>{{ display.bounds.width }}×{{ display.bounds.height }} · {{ display.scaleFactor }}x</small></span>
            <select :value="display.wallpaperId ?? ''" @change="assignDisplay(display, ($event.target as HTMLSelectElement).value)">
              <option value="">跟随主壁纸</option>
              <option v-for="item in wallpaperLibrary" :key="item.id" :value="item.id">{{ item.label }}</option>
            </select>
            <select :value="display.fitMode" title="每屏壁纸适配方式" @change="setDisplayFitMode(display, ($event.target as HTMLSelectElement).value as 'cover' | 'contain')">
              <option value="cover">裁切填满</option>
              <option value="contain">完整显示</option>
            </select>
          </label>
          <p v-if="displays.length === 0" class="wallpaper-inspector-empty">显示器信息暂不可用，将使用系统主屏。</p>
        </div>
        <div class="wallpaper-inspector-section wallpaper-asset-notes">
          <span>安全提示</span>
          <p>媒体导入先验证封面和视频容器；动态视频解码失败时保留上一张壁纸，不切换到黑屏。</p>
        </div>
      </aside>
    </section>

    <div v-if="statusMessage" class="wallpaper-studio-toast" :data-tone="statusTone" role="status" aria-live="polite">
      <LoaderCircle v-if="statusTone === 'neutral'" :size="14" class="wallpaper-status-spin" />
      <CheckCircle2 v-else-if="statusTone === 'success'" :size="14" />
      <TriangleAlert v-else :size="14" />
      <span>{{ statusMessage }}</span>
    </div>
    <div class="wallpaper-library-count"><Plus :size="13" />{{ bundledWallpapers.length }} 内置 · {{ userWallpapers.length }} 个人</div>

    <div v-if="livePhotoDraft" class="live-photo-preview-backdrop" role="dialog" aria-modal="true" aria-label="Live Photo 导入预览">
      <section class="live-photo-preview-dialog">
        <header>
          <div><span>导入前预览</span><strong>{{ livePhotoDraft.label }}</strong></div>
          <button type="button" title="取消预览" @click="cancelLivePhotoPreview">×</button>
        </header>
        <div class="live-photo-preview-media">
          <img :src="livePhotoDraft.coverUrl" :alt="`${livePhotoDraft.label} 封面`" />
          <video
            ref="livePhotoPreviewVideo"
            :src="livePhotoDraft.videoUrl"
            :poster="livePhotoDraft.coverUrl"
            muted
            autoplay
            loop
            playsinline
            preload="auto"
            @loadeddata="handleLivePhotoLoaded"
            @canplay="handleLivePhotoLoaded"
            @error="handleLivePhotoError"
          ></video>
        </div>
        <p v-if="livePhotoDecodeState === 'waiting'" class="live-photo-preview-status">正在验证浏览器真实解码……</p>
        <p v-else-if="livePhotoDecodeState === 'ready'" class="live-photo-preview-status ready">已解码，可确认写入壁纸库。{{ Math.round(livePhotoDraft.videoBytes / 1024 / 1024) }} MB · {{ livePhotoDraft.videoExtension }}</p>
        <p v-else class="live-photo-preview-status failed">视频无法真实解码，请更换配对视频；当前壁纸不会改变。</p>
        <footer>
          <button type="button" class="live-photo-preview-secondary" @click="cancelLivePhotoPreview">取消</button>
          <button type="button" class="live-photo-preview-primary" :disabled="livePhotoDecodeState !== 'ready' || busy" @click="confirmLivePhotoImport">确认导入</button>
        </footer>
      </section>
    </div>
  </main>
</template>

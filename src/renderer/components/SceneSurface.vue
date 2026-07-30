<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { Check, Image as ImageIcon, Layers3, Plus, Sparkles } from "lucide-vue-next";
import type { WallpaperLibraryItem, WallpaperSafeRegion, WallpaperDisplayInfo, WorkspaceScene } from "@shared/types";
import { getPetCharacter } from "@shared/pet-characters";

const props = defineProps<{
  wallpaperLabel: string;
  wallpaperId: string | null;
  city: string;
  hostLabel: string;
  weatherMode: string;
  weatherLabel: string;
  weatherIntensity: number;
  performanceMode: string;
  petPosition: { x: number; y: number };
  petVisible: boolean;
  petCharacterId: string;
  petOutfit: string;
  petPersonality: string;
  petTalkFrequency: string;
  safeRegion?: WallpaperSafeRegion;
  wallpapers: WallpaperLibraryItem[];
}>();

const emit = defineEmits<{
  nextWallpaper: [];
  openLibrary: [];
  applied: [];
}>();

const scenes = ref<WorkspaceScene[]>([]);
const activeSceneId = ref<string | null>(null);
const busySceneId = ref<string | null>(null);
const message = ref("");
const messageTone = computed(() => {
  if (/失败|未应用|不可用/.test(message.value)) return "error";
  if (/正在|读取中/.test(message.value)) return "neutral";
  return "success";
});
const displays = ref<WallpaperDisplayInfo[]>([]);
const focusedSceneId = ref<string | null>(null);
const focusedScene = computed(() => scenes.value.find((scene) => scene.id === focusedSceneId.value) ?? null);
const currentWallpaper = computed(() => props.wallpapers.find((wallpaper) => wallpaper.id === props.wallpaperId) ?? null);
const currentPetCharacter = computed(() => getPetCharacter(props.petCharacterId));
const assetBase = import.meta.env.BASE_URL;
const currentPetAsset = computed(() => `${assetBase}${currentPetCharacter.value.asset}`);
const currentWeatherText = computed(() => `${props.weatherLabel} · ${Math.round(props.weatherIntensity * 100)}%`);
const focusedSceneSafeRegion = computed(() => {
  const wallpaperId = focusedScene.value?.wallpaperId;
  return props.wallpapers.find((wallpaper) => wallpaper.id === wallpaperId)?.safeRegion ?? props.safeRegion;
});

function wallpaperPreviewStyle(item: WallpaperLibraryItem | null | undefined): Record<string, string> {
  if (!item) return {};
  if (item.source === "user") {
    return { backgroundImage: `url("projectd-media://wallpaper/${encodeURIComponent(item.id)}?variant=thumbnail")` };
  }
  const file = item.type === "video" ? item.posterFile || item.file : item.file;
  return { backgroundImage: `url("${import.meta.env.BASE_URL}wallpapers/${file}")` };
}

function sceneWallpaper(scene: WorkspaceScene | null | undefined): WallpaperLibraryItem | null {
  if (!scene) return null;
  return props.wallpapers.find((wallpaper) => wallpaper.id === scene.wallpaperId) ?? null;
}

function fitLabel(value: string | undefined): string {
  return value === "contain" ? "完整适配" : "铺满裁切";
}

function sceneWeatherLabel(scene: WorkspaceScene): string {
  const weather = scene.weatherProfile?.manualWeather || scene.weatherProfile?.mode || "自动天气";
  const intensity = typeof scene.weatherState?.particleIntensity === "number"
    ? ` · ${Math.round(scene.weatherState.particleIntensity * 100)}%`
    : "";
  return `${weather}${intensity}`;
}

function performanceLabel(value: string | undefined): string {
  if (value === "quality") return "Quality";
  if (value === "batterySaver") return "Battery saver";
  if (value === "balanced") return "Balanced";
  return "Auto";
}

function scenePetCharacter(scene: WorkspaceScene) {
  return getPetCharacter(scene.petState?.characterId ?? props.petCharacterId);
}

function scenePetSummary(scene: WorkspaceScene): string {
  if (!scene.petVisible) return "Hidden";
  return `${scenePetCharacter(scene).name} · ${scene.petState?.personality || props.petPersonality}`;
}

function petArtStyle(asset: string): Record<string, string> {
  return { backgroundImage: `url("${asset}")` };
}

function displayGeometryLabel(display: WallpaperDisplayInfo): string {
  return `${Math.round(display.bounds.width)}×${Math.round(display.bounds.height)} · ${Math.round(display.scaleFactor * 100)}%`;
}

function displayWallpaperLabel(display: WallpaperDisplayInfo): string {
  if (!display.wallpaperId) return props.wallpaperLabel || "No wallpaper";
  return props.wallpapers.find((wallpaper) => wallpaper.id === display.wallpaperId)?.label || props.wallpaperLabel || display.wallpaperId;
}

function displayFitLabel(display: WallpaperDisplayInfo): string {
  return display.fitMode === "contain" ? "Contain" : "Cover";
}

function displayScreenStyle(display: WallpaperDisplayInfo): Record<string, string> {
  return { aspectRatio: `${Math.max(1, display.bounds.width)} / ${Math.max(1, display.bounds.height)}` };
}

function sceneFitLabel(scene: WorkspaceScene): string {
  const displayCount = Object.keys(scene.displayFitModes ?? {}).length;
  const fit = scene.visualProfile?.displayFitMode ?? Object.values(scene.displayFitModes ?? {})[0];
  return `${displayCount || 1} 屏 · ${fitLabel(fit)}`;
}

function petAnchorLabel(scene: WorkspaceScene): string {
  const x = Math.round(scene.petAnchor?.positionX ?? props.petPosition.x);
  const y = Math.round(scene.petAnchor?.positionY ?? props.petPosition.y);
  return `桌宠锚点 ${x}, ${y}`;
}

function pinnedResourceLabel(resource: NonNullable<WorkspaceScene["pinnedResources"]>[number]): string {
  const label = resource.label?.trim();
  if (label) return label;
  return resource.path.split(/[\\/]/).pop() || resource.path;
}

function pinnedResourceOrigin(resource: NonNullable<WorkspaceScene["pinnedResources"]>[number]): string {
  if (resource.origin === "portal") return "只读门户";
  if (resource.origin === "external") return resource.provider === "everything" ? "Everything" : "Windows Search";
  return "桌面资源";
}

function petPreviewStyle(scene: WorkspaceScene): Record<string, string> {
  const primary = scene.displayAssignments?.find((display) => display.isPrimary) ?? scene.displayAssignments?.[0];
  const width = primary?.bounds.width || displays.value.find((display) => display.isPrimary)?.bounds.width || 1920;
  const height = primary?.bounds.height || displays.value.find((display) => display.isPrimary)?.bounds.height || 1080;
  const x = scene.petAnchor?.positionX ?? props.petPosition.x;
  const y = scene.petAnchor?.positionY ?? props.petPosition.y;
  const originX = primary?.bounds.x ?? 0;
  const originY = primary?.bounds.y ?? 0;
  const left = Math.max(7, Math.min(93, ((x - originX) / Math.max(1, width)) * 100));
  const top = Math.max(12, Math.min(88, ((y - originY) / Math.max(1, height)) * 100));
  return { left: `${left}%`, top: `${top}%` };
}

function safeRegionStyle(region = props.safeRegion): Record<string, string> {
  if (!region) return { left: "8%", top: "12%", width: "84%", height: "82%" };
  return {
    left: `${region.left * 100}%`,
    top: `${region.top * 100}%`,
    width: `${(region.right - region.left) * 100}%`,
    height: `${(region.bottom - region.top) * 100}%`
  };
}

async function loadScenes(): Promise<void> {
  try {
    const [nextScenes, nextDisplays] = await Promise.all([
      window.projectD.getWorkspaceScenes(),
      window.projectD.getWallpaperDisplays()
    ]);
    scenes.value = nextScenes;
    displays.value = nextDisplays;
    activeSceneId.value = scenes.value.find((scene) => scene.wallpaperId === props.wallpaperId)?.id ?? scenes.value[0]?.id ?? null;
    focusedSceneId.value = scenes.value[0]?.id ?? null;
  } catch (error) {
    message.value = `场景读取失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

async function applyScene(scene: WorkspaceScene): Promise<void> {
  if (busySceneId.value) return;
  busySceneId.value = scene.id;
  message.value = "正在恢复场景状态";
  try {
    await window.projectD.applyWorkspaceScene(scene.id);
    displays.value = await window.projectD.getWallpaperDisplays();
    activeSceneId.value = scene.id;
    focusedSceneId.value = scene.id;
    message.value = `Applied ${scene.name} · ${performanceLabel(scene.performanceMode)} · ${scenePetSummary(scene)}`;
    message.value = `已切换到「${scene.name}」`;
    message.value = `Scene ready · ${scene.name} · ${performanceLabel(scene.performanceMode)} · ${scenePetSummary(scene)}`;
    emit("applied");
  } catch (error) {
    message.value = `场景未应用：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    busySceneId.value = null;
  }
}

function focusScene(scene: WorkspaceScene): void {
  focusedSceneId.value = scene.id;
}

async function createScene(): Promise<void> {
  const name = window.prompt("保存当前桌面为场景", "我的沉浸空间");
  if (!name?.trim()) return;
  try {
    const scene = await window.projectD.saveWorkspaceScene(name.trim());
    scenes.value = [scene, ...scenes.value.filter((item) => item.id !== scene.id)];
    activeSceneId.value = scene.id;
    message.value = `已保存「${scene.name}」`;
  } catch (error) {
    message.value = `场景保存失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

onMounted(() => {
  void loadScenes();
});

watch(() => props.wallpaperId, (wallpaperId) => {
  const matchingScene = scenes.value.find((scene) => scene.wallpaperId === wallpaperId);
  if (matchingScene) activeSceneId.value = matchingScene.id;
});
</script>

<template>
  <section class="scene-surface" aria-label="场景与壁纸">
    <header class="scene-surface-header">
      <div>
        <span class="surface-kicker"><Sparkles :size="14" /> Ambient Scene</span>
        <h2>让桌面进入一个状态</h2>
        <p>壁纸、天气、桌宠位置和布局会一起恢复。</p>
      </div>
      <button type="button" class="scene-save-button" title="保存当前场景" @click="createScene">
        <Plus :size="16" />
        保存当前
      </button>
    </header>

    <div class="scene-current-glance">
      <div class="scene-current-art" :class="{ 'has-wallpaper': currentWallpaper }" :style="wallpaperPreviewStyle(currentWallpaper)" :data-wallpaper-id="currentWallpaper?.id || undefined">
        <ImageIcon v-if="!currentWallpaper" :size="22" />
      </div>
      <div>
        <span>正在使用</span>
        <strong>{{ wallpaperLabel }}</strong>
        <small>{{ city }} · {{ hostLabel }}</small>
      </div>
      <div class="scene-current-actions">
        <button type="button" title="切换下一张壁纸" @click="emit('nextWallpaper')">换一张</button>
        <button type="button" title="打开壁纸库" @click="emit('openLibrary')">壁纸库</button>
      </div>
    </div>

    <section class="scene-live-profile" aria-label="当前场景状态">
      <div class="scene-profile-preview">
        <span v-if="petVisible" class="scene-profile-pet-art" :style="petArtStyle(currentPetAsset)" aria-hidden="true"></span>
        <div class="scene-preview-safe-region" :style="safeRegionStyle()"></div>
        <span class="scene-preview-pet" :style="{ left: `${Math.max(7, Math.min(93, petPosition.x / 19.2))}%`, top: `${Math.max(12, Math.min(88, petPosition.y / 10.8))}%` }" aria-label="桌宠当前位置"></span>
        <small>当前安全区与桌宠锚点</small>
      </div>
      <div class="scene-profile-facts">
        <div><span>天气层</span><strong>{{ currentWeatherText }}</strong><small>{{ weatherMode === 'auto' ? '跟随定位' : '手动天气' }}</small></div>
        <div><span>显示器</span><strong>{{ displays.length || 1 }} 屏</strong><small>{{ displays.find((display) => display.isPrimary)?.label || '主屏' }}</small></div>
        <div><span>壁纸宿主</span><strong>{{ hostLabel }}</strong><small>{{ city }}</small></div>
        <div><span>Pet</span><strong>{{ petVisible ? currentPetCharacter.name : 'Hidden' }}</strong><small>{{ petVisible ? `${petPersonality} · ${petOutfit}` : 'No pet window' }}</small></div>
        <div><span>Performance</span><strong>{{ performanceLabel(performanceMode) }}</strong><small>{{ hostLabel }} · {{ city }}</small></div>
      </div>
    </section>

    <section class="scene-display-map" aria-label="显示器映射">
      <div class="scene-display-map-heading">
        <div><span>Display map</span><strong>每块屏幕独立呈现</strong></div>
        <small>{{ displays.length || 1 }} 屏 · 当前映射</small>
      </div>
      <div v-if="displays.length" class="scene-display-grid">
        <article v-for="display in displays" :key="display.id" class="scene-display-card" :data-primary="display.isPrimary">
          <div class="scene-display-screen" :style="displayScreenStyle(display)">
            <span class="scene-display-screen-light" :data-fit="display.fitMode"></span>
            <small>{{ display.isPrimary ? 'Primary' : 'Display' }}</small>
          </div>
          <div class="scene-display-copy">
            <strong>{{ display.label || 'Display' }}</strong>
            <span>{{ displayGeometryLabel(display) }}</span>
            <small>{{ displayWallpaperLabel(display) }}</small>
          </div>
          <span class="scene-display-fit">{{ displayFitLabel(display) }}</span>
        </article>
      </div>
      <div v-else class="scene-display-empty">Waiting for Windows display information</div>
    </section>

    <div class="scene-list-heading">
      <span>已保存场景</span>
      <small>{{ scenes.length }} 个</small>
    </div>
    <div v-if="scenes.length" class="scene-list">
      <article
        v-for="scene in scenes"
        :key="scene.id"
        class="scene-card"
        :class="{ active: scene.id === activeSceneId }"
      >
        <span v-if="sceneWallpaper(scene)" class="scene-card-thumb" :style="wallpaperPreviewStyle(sceneWallpaper(scene))" aria-hidden="true"></span>
        <span v-else class="scene-card-icon"><Check v-if="scene.id === activeSceneId" :size="17" /><Layers3 v-else :size="17" /></span>
        <span class="scene-card-copy">
          <strong>{{ scene.name }}</strong>
          <div class="scene-card-state" :data-active="scene.id === activeSceneId">
            <span>{{ performanceLabel(scene.performanceMode) }}</span>
            <span>{{ scenePetSummary(scene) }}</span>
            <span>{{ scene.wallpaperDynamic ? 'Dynamic wallpaper' : 'Static wallpaper' }}</span>
          </div>
          <small>{{ scene.wallpaperStyle || "壁纸" }} · {{ sceneFitLabel(scene) }} · {{ scene.pinnedResources?.length ?? 0 }} 个钉选</small>
          <small>{{ sceneWeatherLabel(scene) }} · {{ petAnchorLabel(scene) }}</small>
          <div v-if="scene.pinnedResources?.length" class="scene-pinned-resources" :aria-label="`${scene.name} 的钉选资源`">
            <span class="scene-pinned-heading">已钉选</span>
            <span v-for="resource in scene.pinnedResources.slice(0, 3)" :key="`${resource.origin}:${resource.path}`" class="scene-pinned-resource">
              <strong>{{ pinnedResourceLabel(resource) }}</strong>
              <small>{{ pinnedResourceOrigin(resource) }}</small>
            </span>
            <span v-if="scene.pinnedResources.length > 3" class="scene-pinned-more">+{{ scene.pinnedResources.length - 3 }}</span>
          </div>
        </span>
        <div class="scene-card-actions">
          <button type="button" title="预览场景状态" @click="focusScene(scene)">{{ focusedSceneId === scene.id ? "预览中" : "预览" }}</button>
          <button type="button" :disabled="busySceneId !== null" title="应用场景" @click="applyScene(scene)">{{ busySceneId === scene.id ? "恢复中" : scene.id === activeSceneId ? "当前" : "应用" }}</button>
        </div>
      </article>
    </div>
    <section v-if="focusedScene" class="scene-detail" aria-label="场景预览详情">
      <div class="scene-detail-heading"><span>场景预览</span><strong>{{ focusedScene.name }}</strong></div>
      <div class="scene-detail-canvas" :style="wallpaperPreviewStyle(sceneWallpaper(focusedScene))" :data-wallpaper-id="sceneWallpaper(focusedScene)?.id || undefined">
        <span v-if="focusedScene.petVisible" class="scene-detail-pet-art" :style="petArtStyle(`${assetBase}${scenePetCharacter(focusedScene).asset}`)" aria-hidden="true"></span>
        <div class="scene-preview-safe-region" :style="safeRegionStyle(focusedSceneSafeRegion)"></div>
        <span class="scene-preview-pet" :style="petPreviewStyle(focusedScene)" aria-label="场景桌宠锚点"></span>
        <small>安全区 · {{ focusedScene.visualProfile?.glassPreset || "quiet" }} 玻璃 · {{ focusedScene.visualProfile?.edgeRailPlacement || "left" }} 边缘轨</small>
      </div>
      <div class="scene-detail-grid">
        <span><b>Performance</b>{{ performanceLabel(focusedScene.performanceMode) }}</span>
        <span><b>Pet</b>{{ scenePetSummary(focusedScene) }}</span>
        <span><b>天气</b>{{ sceneWeatherLabel(focusedScene) }}</span>
        <span><b>显示</b>{{ sceneFitLabel(focusedScene) }}</span>
        <span><b>桌宠</b>{{ petAnchorLabel(focusedScene) }}</span>
        <span><b>映射</b>{{ focusedScene.displayAssignments?.length ?? 0 }} 个显示器快照</span>
      </div>
    </section>
    <div v-else class="scene-empty">
      <Layers3 :size="22" />
      <span>还没有保存的场景</span>
      <small>先调整好壁纸、天气和桌宠，再保存为一个可回到的状态。</small>
    </div>
    <p v-if="message" class="scene-message" :data-tone="messageTone" aria-live="polite">{{ message }}</p>
  </section>
</template>

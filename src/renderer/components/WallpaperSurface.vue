<script setup lang="ts">
import { ref } from "vue";
import { ArrowLeft, Download, Trash2 } from "lucide-vue-next";
import type { WallpaperLibraryItem } from "@shared/types";
import { wallpaperDisplayLabel } from "@shared/wallpaper-library";

const props = defineProps<{
  currentWallpaperId: string | null;
  wallpapers: WallpaperLibraryItem[];
}>();

const emit = defineEmits<{
  close: [];
  apply: [wallpaperId: string];
  importFile: [];
  removeWallpaper: [wallpaperId: string];
  openStudio: [];
}>();

const selectedId = ref<string | null>(props.currentWallpaperId);

function selectWallpaper(id: string): void {
  selectedId.value = id;
  emit("apply", id);
}

function getDisplayLabel(item: WallpaperLibraryItem): string {
  return wallpaperDisplayLabel(item);
}
</script>

<template>
  <section class="wallpaper-surface" role="region" aria-label="壁纸管理">
    <header class="wallpaper-surface-header">
      <button class="wallpaper-surface-back" type="button" @click="emit('close')" title="返回桌面">
        <ArrowLeft :size="18" />
      </button>
      <h2>壁纸库</h2>
      <button class="wallpaper-surface-studio" type="button" @click="emit('openStudio')">
        壁纸创作
      </button>
    </header>

    <div class="wallpaper-surface-grid">
      <article
        v-for="item in wallpapers"
        :key="item.id"
        class="wallpaper-surface-card"
        :class="{ selected: selectedId === item.id }"
        @click="selectWallpaper(item.id)"
      >
        <span class="wallpaper-surface-label">{{ getDisplayLabel(item) }}</span>
        <span v-if="item.source === 'user'" class="wallpaper-surface-user-badge">用户</span>
      </article>
    </div>

    <footer v-if="selectedId" class="wallpaper-surface-footer">
      <button type="button" @click="emit('importFile')">
        <Download :size="14" /> 导入本地图片
      </button>
      <button type="button" class="danger" @click="emit('removeWallpaper', selectedId!)">
        <Trash2 :size="14" /> 删除
      </button>
    </footer>
  </section>
</template>

<style scoped>
.wallpaper-surface { display: grid; grid-template-rows: auto 1fr auto; height: 100%; }
.wallpaper-surface-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.wallpaper-surface-header h2 { margin: 0; font-size: 16px; }
.wallpaper-surface-back { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #f4f1ea; background: transparent; }
.wallpaper-surface-studio { margin-left: auto; min-height: 32px; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 0 12px; color: #f4f1ea; background: rgba(255,255,255,0.06); font-size: 13px; }
.wallpaper-surface-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; padding: 16px; overflow-y: auto; }
.wallpaper-surface-card { position: relative; aspect-ratio: 16/9; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; background-size: cover; background-position: center; cursor: pointer; overflow: hidden; }
.wallpaper-surface-card.selected { border-color: #9fd7ed; box-shadow: 0 0 0 2px rgba(159,215,237,0.38); }
.wallpaper-surface-label { position: absolute; left: 6px; bottom: 6px; right: 6px; padding: 4px 6px; border-radius: 4px; background: rgba(0,0,0,0.55); color: #f4f1ea; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wallpaper-surface-user-badge { position: absolute; top: 6px; right: 6px; padding: 2px 6px; border-radius: 4px; background: rgba(159,215,237,0.3); color: #f4f1ea; font-size: 10px; }
.wallpaper-surface-footer { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.08); }
.wallpaper-surface-footer button { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 0 12px; color: #f4f1ea; background: rgba(255,255,255,0.06); font-size: 13px; }
.wallpaper-surface-footer button.danger { color: #f08778; border-color: rgba(240,135,120,0.3); }
</style>

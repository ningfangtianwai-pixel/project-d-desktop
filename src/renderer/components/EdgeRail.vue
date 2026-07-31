<script setup lang="ts">
import { Activity, EyeOff, FolderKanban, Search, Settings, Sparkles, Waypoints } from "lucide-vue-next";
import type { DesktopExperienceMode, DesktopTaskSurface } from "@shared/desktop-experience";

defineProps<{
  mode: DesktopExperienceMode;
  activeSurface: DesktopTaskSurface;
}>();

const emit = defineEmits<{
  wake: [];
  openSurface: [surface: Exclude<DesktopTaskSurface, null>];
  enterClean: [];
  openSettings: [];
  openDiagnostics: [];
}>();

const entries = [
  { surface: "search" as const, label: "搜索工作区", icon: Search },
  { surface: "organize" as const, label: "桌面整理", icon: FolderKanban },
  { surface: "scene" as const, label: "场景与壁纸", icon: Waypoints },
  { surface: "assistant" as const, label: "AI 助手", icon: Sparkles }
];
</script>

<template>
  <nav class="ambient-edge-rail" :data-mode="mode" aria-label="沉浸式桌面入口">
    <button
      v-if="mode === 'native'"
      type="button"
      class="edge-rail-wake"
      title="进入沉浸空间"
      aria-label="进入沉浸空间"
      @click="emit('wake')"
    >
      <Sparkles :size="18" />
    </button>
    <template v-else>
      <button
        v-for="entry in entries"
        :key="entry.surface"
        type="button"
        :class="{ active: activeSurface === entry.surface }"
        :title="entry.label"
        :aria-label="entry.label"
        @click="emit('openSurface', entry.surface)"
      >
        <component :is="entry.icon" :size="18" />
      </button>
      <span class="edge-rail-divider" aria-hidden="true"></span>
      <button
        v-if="mode === 'immersive'"
        type="button"
        title="纯净桌面"
        aria-label="纯净桌面"
        @click="emit('enterClean')"
      >
        <EyeOff :size="18" />
      </button>
    </template>
    <button type="button" title="诊断" aria-label="诊断" @click="emit('openDiagnostics')">
      <Activity :size="18" />
    </button>
    <button type="button" title="打开设置" aria-label="打开设置" @click="emit('openSettings')">
      <Settings :size="18" />
    </button>
  </nav>
</template>

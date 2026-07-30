<script setup lang="ts">
import { ArrowLeft, CloudRain, Sparkles } from "lucide-vue-next";
import type { DesktopExperienceMode, DesktopTaskSurface } from "@shared/desktop-experience";

defineProps<{
  mode: DesktopExperienceMode;
  wallpaperLabel: string;
  city: string;
  hostLabel: string;
  taskLabel: string;
  activeSurface: DesktopTaskSurface;
  weatherLabel: string;
  petLabel: string;
  petVisible: boolean;
}>();

const emit = defineEmits<{
  wake: [];
  closeTask: [];
  leaveImmersive: [];
}>();
</script>

<template>
  <div class="ambient-status-capsule" :data-mode="mode" aria-live="polite">
    <span class="ambient-status-dot" :data-mode="mode"></span>
    <span class="ambient-status-mode">{{ mode === 'native' ? '原生桌面' : mode === 'immersive' ? '沉浸空间' : mode === 'task' ? taskLabel : mode === 'clean' ? '纯净桌面' : '安全恢复' }}</span>
    <span class="ambient-status-divider">·</span>
    <span class="ambient-status-wallpaper">{{ wallpaperLabel }}</span>
    <span class="ambient-status-divider">·</span>
    <span class="ambient-status-city">{{ city }}</span>
    <span class="ambient-status-host">{{ hostLabel }}</span>
    <span v-if="mode !== 'native'" class="ambient-status-context" aria-label="环境状态">
      <span><CloudRain :size="12" />{{ weatherLabel }}</span>
      <span><Sparkles :size="12" />{{ petVisible ? petLabel : "桌宠已收起" }}</span>
    </span>
    <button v-if="mode === 'native'" type="button" title="进入沉浸空间" aria-label="进入沉浸空间" @click="emit('wake')"><Sparkles :size="15" /></button>
    <button v-else-if="activeSurface" type="button" title="返回沉浸空间" aria-label="返回沉浸空间" @click="emit('closeTask')"><ArrowLeft :size="15" /></button>
    <button v-else-if="mode === 'immersive'" type="button" title="返回原生桌面" aria-label="返回原生桌面" @click="emit('leaveImmersive')"><ArrowLeft :size="15" /></button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import WallpaperStage from "../components/WallpaperStage.vue";

onMounted(() => {
  document.body.classList.add("wallpaper-window-body");
});

onUnmounted(() => {
  document.body.classList.remove("wallpaper-window-body");
});
</script>

<template>
  <main class="wallpaper-page">
    <WallpaperStage />
  </main>
</template>

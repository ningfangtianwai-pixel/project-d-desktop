<script setup lang="ts">
import { computed } from "vue";
import { ArrowUpRight, FolderKanban, MoreHorizontal } from "lucide-vue-next";
import type { Component } from "vue";
import type { ContainerWithFiles, DesktopFileRecord } from "@shared/types";

const props = withDefaults(defineProps<{
  containers: ContainerWithFiles[];
  fileIcon: (file: DesktopFileRecord) => Component;
  fileKindLabel: (file: DesktopFileRecord) => string;
  containerVisualStyle: (container: ContainerWithFiles) => Record<string, string>;
  maxGroups?: number;
  maxFilesPerGroup?: number;
}>(), {
  maxGroups: 4,
  maxFilesPerGroup: 6
});

const emit = defineEmits<{
  selectFile: [file: DesktopFileRecord];
  openFile: [fileId: number];
  showFileMenu: [event: MouseEvent, file: DesktopFileRecord];
  openOrganizer: [];
}>();

const visibleGroups = computed(() => props.containers
  .filter((container) => container.isVisible && container.files.length > 0)
  .slice(0, props.maxGroups));

function visibleFiles(container: ContainerWithFiles): DesktopFileRecord[] {
  return container.files.slice(0, props.maxFilesPerGroup);
}

function remainingFiles(container: ContainerWithFiles): number {
  return Math.max(0, container.files.length - props.maxFilesPerGroup);
}

function displayName(file: DesktopFileRecord): string {
  return file.displayName || file.filename;
}
</script>

<template>
  <section v-if="visibleGroups.length" class="ambient-file-space" aria-label="沉浸式桌面文件">
    <header class="ambient-file-space-header">
      <div>
        <span>桌面空间</span>
        <strong>最近的文件</strong>
      </div>
      <button type="button" title="打开桌面整理" aria-label="打开桌面整理" @click="emit('openOrganizer')">
        <FolderKanban :size="14" />
        <span>整理</span>
      </button>
    </header>

    <div class="ambient-file-groups">
      <article
        v-for="container in visibleGroups"
        :key="container.id"
        class="ambient-file-group"
        :style="containerVisualStyle(container)"
      >
        <div class="ambient-file-group-heading">
          <span class="ambient-file-group-dot" aria-hidden="true"></span>
          <strong>{{ container.name }}</strong>
          <small>{{ container.files.length }}</small>
          <button type="button" :title="`在整理中查看${container.name}`" :aria-label="`在整理中查看${container.name}`" @click="emit('openOrganizer')">
            <MoreHorizontal :size="14" />
          </button>
        </div>
        <div class="ambient-file-icons">
          <button
            v-for="file in visibleFiles(container)"
            :key="file.id"
            type="button"
            class="ambient-file-icon"
            :title="file.fullPath"
            @click="emit('selectFile', file)"
            @dblclick="emit('openFile', file.id)"
            @contextmenu="emit('showFileMenu', $event, file)"
          >
            <span class="ambient-file-art" :data-kind="file.category">
              <span v-if="file.category === 'folder'" class="desktop-folder-art" aria-hidden="true">
                <i class="folder-tab"></i><i class="folder-sheet"></i><i class="folder-body"></i>
              </span>
              <img v-else-if="file.iconDataUrl" class="desktop-native-icon" :src="file.iconDataUrl" :alt="fileKindLabel(file)" />
              <component v-else :is="fileIcon(file)" :size="26" :stroke-width="1.8" />
              <span v-if="file.isShortcut" class="desktop-shortcut-badge" aria-label="快捷方式">↗</span>
            </span>
            <span class="ambient-file-name">{{ displayName(file) }}</span>
          </button>
          <button v-if="remainingFiles(container)" type="button" class="ambient-file-more" @click="emit('openOrganizer')">
            <span>+{{ remainingFiles(container) }}</span>
            <ArrowUpRight :size="13" />
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";
import { CheckCircle2, Copy, ExternalLink, FolderPlus, LocateFixed, LoaderCircle, MapPin, Search, TriangleAlert, X } from "lucide-vue-next";
import type { WorkspaceScene, WorkspaceSearchResult } from "@shared/types";

type SearchActionNotice = {
  resultId: string;
  tone: "neutral" | "success" | "error";
  message: string;
};

defineProps<{
  query: string;
  results: WorkspaceSearchResult[];
  status: string;
  scenes: WorkspaceScene[];
  pickerResultId: string | null;
  actionNotice?: SearchActionNotice | null;
}>();

const emit = defineEmits<{
  "update:query": [value: string];
  search: [];
  clear: [];
  open: [result: WorkspaceSearchResult];
  reveal: [result: WorkspaceSearchResult];
  copy: [result: WorkspaceSearchResult];
  portal: [result: WorkspaceSearchResult];
  toggleScene: [result: WorkspaceSearchResult];
  pinScene: [result: WorkspaceSearchResult, scene: WorkspaceScene];
}>();

const input = ref<HTMLInputElement | null>(null);

function updateQuery(event: Event): void {
  emit("update:query", (event.target as HTMLInputElement).value);
}

function handleEscape(): void {
  emit("clear");
}

async function focus(): Promise<void> {
  await nextTick();
  input.value?.focus();
}

defineExpose({ focus });
</script>

<template>
  <section class="search-surface" aria-label="工作区搜索">
    <header class="search-surface-header">
      <div>
        <span class="surface-kicker"><Search :size="14" /> Workspace search</span>
        <h2>找到你要的东西</h2>
        <p>只搜索桌面和你明确授权的门户，不会扫描未授权目录。</p>
      </div>
      <span class="search-surface-scope">本机优先</span>
    </header>
    <form class="workspace-search" @submit.prevent="emit('search')">
      <Search :size="17" />
      <input ref="input" :value="query" type="search" placeholder="搜索桌面与已授权门户" aria-label="搜索桌面与已授权门户" @input="updateQuery" @keydown.esc="handleEscape" />
      <button v-if="query" type="button" class="workspace-search-clear" title="清空搜索" aria-label="清空搜索" @click="emit('clear')"><X :size="15" /></button>
      <button type="submit" title="搜索" aria-label="搜索"><Search :size="16" /></button>
    </form>
    <div v-if="status" class="workspace-search-results" aria-live="polite" aria-atomic="true">
      <small class="workspace-search-status" role="status">{{ status }}</small>
      <p v-if="results.length === 0" class="search-empty">没有新的匹配项，试试文件名或扩展名。</p>
      <article v-for="result in results" :key="result.id" class="workspace-search-result">
        <p v-if="actionNotice?.resultId === result.id" class="search-result-feedback" :data-tone="actionNotice.tone" role="status">
          <LoaderCircle v-if="actionNotice.tone === 'neutral'" :size="13" class="search-result-feedback-spin" />
          <CheckCircle2 v-else-if="actionNotice.tone === 'success'" :size="13" />
          <TriangleAlert v-else :size="13" />
          <span>{{ actionNotice.message }}</span>
        </p>
        <button class="search-result-main" type="button" :aria-label="`打开 ${result.title}`" @click="emit('open', result)">
          <span><strong>{{ result.title }}</strong><small>{{ result.origin === 'desktop' ? '桌面' : '文件门户' }} · {{ result.category }}</small></span>
          <ExternalLink :size="14" aria-hidden="true" />
        </button>
        <div class="search-result-actions" aria-label="搜索结果操作">
          <button type="button" title="打开所在位置" aria-label="打开所在位置" @click="emit('reveal', result)"><LocateFixed :size="14" /></button>
          <button type="button" title="复制完整路径" aria-label="复制完整路径" @click="emit('copy', result)"><Copy :size="14" /></button>
          <button type="button" title="加入只读门户" aria-label="加入只读门户" @click="emit('portal', result)"><FolderPlus :size="14" /></button>
          <button type="button" title="钉到场景" aria-label="钉到场景" :aria-expanded="pickerResultId === result.id" @click="emit('toggleScene', result)"><MapPin :size="14" /></button>
        </div>
        <div v-if="pickerResultId === result.id" class="search-scene-picker" role="menu" aria-label="选择要钉入的场景">
          <span>选择要钉入的场景</span>
          <button v-for="scene in scenes" :key="scene.id" type="button" role="menuitem" @click="emit('pinScene', result, scene)">
            <MapPin :size="13" />
            <strong>{{ scene.name }}</strong>
            <small>{{ scene.pinnedResources?.length ?? 0 }} 项</small>
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

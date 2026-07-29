<script setup lang="ts">
import { nextTick, ref } from "vue";
import { FolderKanban, Inbox, PanelRightOpen, MonitorUp, EyeOff, Settings } from "lucide-vue-next";
import type { Component } from "vue";
import ChatPanel from "./ChatPanel.vue";
import SearchSurface from "./SearchSurface.vue";
import type {
  ActionExecution,
  ActionPlan,
  AppInfo,
  ContainerWithFiles,
  CurrentWeather,
  DatabaseStatus,
  DesktopFileRecord,
  SuggestionRecord,
  WorkspaceScene,
  WorkspaceSearchResult
} from "@shared/types";

const props = defineProps<{
  containers: ContainerWithFiles[];
  totalFiles: number;
  selectedFile: DesktopFileRecord | null;
  actionMessage: string;
  actionBusy: boolean;
  inboxPlan: ActionPlan | null;
  movableInboxItems: number;
  latestUndoableExecution: ActionExecution | null;
  appInfo: AppInfo | null;
  databaseStatus: DatabaseStatus | null;
  appVersion: string;
  wallpaperHostLabel: string;
  currentWeather: CurrentWeather | null;
  weatherSourceLabel: string;
  latestSuggestion: SuggestionRecord | null;
  workspaceSearchQuery: string;
  workspaceSearchResults: WorkspaceSearchResult[];
  workspaceSearchStatus: string;
  searchScenes: WorkspaceScene[];
  searchScenePickerResultId: string | null;
  fileIcon: (file: DesktopFileRecord) => Component;
  fileKindLabel: (file: DesktopFileRecord) => string;
  containerVisualStyle: (container: ContainerWithFiles) => Record<string, string>;
  formatBytes: (sizeBytes: number) => string;
}>();

const emit = defineEmits<{
  "select-file": [file: DesktopFileRecord];
  "open-file": [fileId: number];
  "show-file-menu": [event: MouseEvent, file: DesktopFileRecord];
  activate: [];
  restore: [];
  clean: [];
  scan: [];
  settings: [];
  "update:query": [value: string];
  search: [];
  clear: [];
  open: [result: WorkspaceSearchResult];
  reveal: [result: WorkspaceSearchResult];
  copy: [result: WorkspaceSearchResult];
  portal: [result: WorkspaceSearchResult];
  "toggle-scene": [result: WorkspaceSearchResult];
  "pin-scene": [result: WorkspaceSearchResult, scene: WorkspaceScene];
  "prepare-inbox": [];
  "execute-inbox": [];
  "undo-latest": [];
  "cancel-inbox": [];
  "snooze-suggestion": [];
  "disable-suggestions": [];
}>();

const searchSurfaceRef = ref<InstanceType<typeof SearchSurface> | null>(null);

async function focusSearch(): Promise<void> {
  await nextTick();
  await searchSurfaceRef.value?.focus();
}

function pinScene(result: WorkspaceSearchResult, scene: WorkspaceScene): void {
  emit("pin-scene", result, scene);
}

defineExpose({ focusSearch });
</script>

<template>
  <div class="control-grid compatibility-control-grid">
    <section class="desktop-library">
      <div class="panel-title panel-title-spread">
        <div>
          <p>安全恢复 · 兼容桌面</p>
          <h2>虚拟分区</h2>
        </div>
        <span>{{ props.totalFiles }} 个文件</span>
      </div>
      <div class="zone-grid desktop-zone-grid" aria-label="桌面文件分区">
        <article v-for="container in props.containers" :key="container.id" class="zone desktop-zone" :style="props.containerVisualStyle(container)">
          <div class="zone-heading">
            <strong>{{ container.name }}</strong>
            <span>{{ container.files.length }}</span>
          </div>
          <div class="desktop-icon-grid">
            <button
              v-for="file in container.files"
              :key="file.id"
              class="desktop-icon"
              :class="{ selected: props.selectedFile?.id === file.id }"
              type="button"
              :title="file.fullPath"
              @click="emit('select-file', file)"
              @dblclick="emit('open-file', file.id)"
              @contextmenu="emit('show-file-menu', $event, file)"
            >
              <span class="desktop-icon-art" :data-kind="file.category">
                <span v-if="file.category === 'folder'" class="desktop-folder-art" aria-hidden="true">
                  <i class="folder-tab"></i><i class="folder-sheet"></i><i class="folder-body"></i>
                </span>
                <img v-else-if="file.iconDataUrl" class="desktop-native-icon" :src="file.iconDataUrl" :alt="props.fileKindLabel(file)" />
                <component v-else :is="props.fileIcon(file)" :size="32" :stroke-width="1.8" />
                <span v-if="file.isShortcut" class="desktop-shortcut-badge" aria-label="快捷方式">↗</span>
              </span>
              <span class="desktop-icon-name">{{ file.displayName || file.filename }}</span>
              <small>{{ props.fileKindLabel(file) }}</small>
            </button>
          </div>
          <p v-if="container.files.length === 0" class="empty-zone">这里暂时没有文件</p>
        </article>
      </div>
    </section>

    <aside class="command-panel compatibility-command-panel">
      <div class="panel-title">
        <FolderKanban :size="22" />
        <div>
          <p>兼容控制中心</p>
          <h2>安全恢复路径</h2>
        </div>
      </div>
      <SearchSurface
        ref="searchSurfaceRef"
        :query="props.workspaceSearchQuery"
        :results="props.workspaceSearchResults"
        :status="props.workspaceSearchStatus"
        :scenes="props.searchScenes"
        :picker-result-id="props.searchScenePickerResultId"
        @update:query="emit('update:query', $event)"
        @search="emit('search')"
        @clear="emit('clear')"
        @open="emit('open', $event)"
        @reveal="emit('reveal', $event)"
        @copy="emit('copy', $event)"
        @portal="emit('portal', $event)"
        @toggle-scene="emit('toggle-scene', $event)"
        @pin-scene="pinScene"
      />
      <section v-if="props.latestSuggestion" class="inbox-review inbox-suggestion" aria-live="polite">
        <div class="inbox-review-heading"><div><span>智能建议</span><strong>{{ props.latestSuggestion.title }}</strong></div></div>
        <p>{{ props.latestSuggestion.detail }}</p>
        <small v-if="props.latestSuggestion.explanation" class="suggestion-reason">为什么出现：{{ props.latestSuggestion.explanation }}</small>
        <div class="inbox-review-actions">
          <button class="inbox-execute" type="button" :disabled="props.actionBusy" @click="emit('prepare-inbox')">查看方案</button>
          <button class="inbox-cancel" type="button" @click="emit('snooze-suggestion')">两小时后</button>
          <button class="inbox-cancel" type="button" @click="emit('disable-suggestions')">不再提醒</button>
        </div>
      </section>
      <div class="action-row">
        <button class="action-button" type="button" @click="emit('activate')"><MonitorUp :size="18" /><span>启动整理</span></button>
        <button class="action-button secondary" type="button" @click="emit('restore')"><PanelRightOpen :size="18" /><span>安全归位</span></button>
        <button class="action-button quiet" type="button" @click="emit('clean')"><EyeOff :size="18" /><span>纯净桌面</span></button>
        <button class="action-button muted" type="button" @click="emit('scan')"><FolderKanban :size="18" /><span>刷新</span></button>
        <button class="action-button inbox" type="button" :disabled="props.actionBusy" @click="emit('prepare-inbox')"><Inbox :size="18" /><span>收件箱</span></button>
        <button class="icon-button" type="button" title="设置" @click="emit('settings')"><Settings :size="20" /></button>
      </div>
      <dl class="status-list">
        <div><dt>桌面层</dt><dd>{{ props.wallpaperHostLabel }}</dd></div>
        <div><dt>天气</dt><dd>{{ props.currentWeather?.city || "自动定位" }} · {{ props.currentWeather?.condition || "检测中" }}</dd></div>
        <div><dt>定位</dt><dd>{{ props.weatherSourceLabel }}</dd></div>
        <div><dt>分区</dt><dd>{{ props.databaseStatus?.containerCount ?? 0 }} 个 · {{ props.totalFiles }} 个文件</dd></div>
        <div><dt>版本</dt><dd>{{ props.appInfo?.version ?? props.appVersion }} · {{ props.appInfo?.platform ?? "win32" }}</dd></div>
      </dl>
      <div v-if="props.selectedFile" class="file-preview">
        <strong>{{ props.selectedFile.displayName || props.selectedFile.filename }}</strong>
        <span>{{ props.selectedFile.fullPath }}</span>
      </div>
      <section class="inbox-review" aria-live="polite">
        <div class="inbox-review-heading">
          <div><span>可信整理</span><strong>桌面收件箱</strong></div>
          <button v-if="props.latestUndoableExecution" class="inbox-undo" type="button" :disabled="props.actionBusy" @click="emit('undo-latest')">撤销最近一次</button>
        </div>
        <p v-if="!props.inboxPlan">{{ props.actionMessage || "先生成整理方案，再确认执行。" }}</p>
        <template v-else>
          <p>{{ props.inboxPlan.summary }}</p>
          <ol>
            <li v-for="item in props.inboxPlan.items" :key="item.id" :class="{ conflict: item.conflict }">
              <div><span>{{ item.label }}</span><small>{{ item.conflict ? `已跳过：${item.conflict}` : `${item.category} · ${props.formatBytes(item.sizeBytes)}` }}</small></div>
              <small><b>来源</b>{{ item.sourcePath }}</small>
              <small><b>目标</b>{{ item.targetPath }}</small>
            </li>
          </ol>
          <div class="inbox-review-actions">
            <button type="button" class="inbox-execute" :disabled="props.actionBusy || props.movableInboxItems === 0" @click="emit('execute-inbox')">确认整理 {{ props.movableInboxItems }} 项</button>
            <button type="button" class="inbox-cancel" :disabled="props.actionBusy" @click="emit('cancel-inbox')">取消</button>
          </div>
        </template>
      </section>
      <ChatPanel @request-inbox-plan="emit('prepare-inbox')" />
    </aside>
  </div>
</template>

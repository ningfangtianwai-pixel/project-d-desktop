<script setup lang="ts">
import { computed } from "vue";
import { CheckCircle2, EyeOff, FolderKanban, Inbox, PanelRightOpen, RefreshCcw, Settings, ShieldCheck, TriangleAlert } from "lucide-vue-next";
import type { Component } from "vue";
import type { ActionExecution, ActionPlan, ContainerWithFiles, DesktopFileRecord } from "@shared/types";

const props = defineProps<{
  containers: ContainerWithFiles[];
  totalFiles: number;
  selectedFile: DesktopFileRecord | null;
  actionMessage: string;
  actionBusy: boolean;
  inboxPlan: ActionPlan | null;
  movableInboxItems: number;
  latestUndoableExecution: ActionExecution | null;
  fileIcon: (file: DesktopFileRecord) => Component;
  fileKindLabel: (file: DesktopFileRecord) => string;
  containerVisualStyle: (container: ContainerWithFiles) => Record<string, string>;
  formatBytes: (sizeBytes: number) => string;
}>();

const conflictInboxItems = computed(() => props.inboxPlan?.items.filter((item) => Boolean(item.conflict)).length ?? 0);
const organizerStateLabel = computed(() => props.inboxPlan ? "只预览，不会自动移动" : props.latestUndoableExecution ? "可撤销" : "等待你的决定");

const emit = defineEmits<{
  selectFile: [file: DesktopFileRecord];
  openFile: [fileId: number];
  showFileMenu: [event: MouseEvent, file: DesktopFileRecord];
  restore: [];
  scan: [];
  clean: [];
  settings: [];
  prepareInbox: [];
  executeInbox: [];
  undoLatest: [];
  cancelInbox: [];
}>();
</script>

<template>
  <div class="control-grid organizer-surface">
    <section class="desktop-library">
      <div class="panel-title panel-title-spread">
        <div>
          <p>当前任务 · 可逆整理</p>
          <h2>桌面内容</h2>
        </div>
        <span>{{ totalFiles }} 个文件</span>
      </div>
      <div class="zone-grid desktop-zone-grid" aria-label="桌面文件分区">
        <article v-for="container in containers" :key="container.id" class="zone desktop-zone" :style="containerVisualStyle(container)">
          <div class="zone-heading">
            <strong>{{ container.name }}</strong>
            <span>{{ container.files.length }}</span>
          </div>
          <div class="desktop-icon-grid">
            <button
              v-for="file in container.files"
              :key="file.id"
              class="desktop-icon"
              :class="{ selected: selectedFile?.id === file.id }"
              type="button"
              :title="file.fullPath"
              @click="emit('selectFile', file)"
              @dblclick="emit('openFile', file.id)"
              @contextmenu="emit('showFileMenu', $event, file)"
            >
              <span class="desktop-icon-art" :data-kind="file.category">
                <span v-if="file.category === 'folder'" class="desktop-folder-art" aria-hidden="true">
                  <i class="folder-tab"></i><i class="folder-sheet"></i><i class="folder-body"></i>
                </span>
                <img v-else-if="file.iconDataUrl" class="desktop-native-icon" :src="file.iconDataUrl" :alt="fileKindLabel(file)" />
                <component v-else :is="fileIcon(file)" :size="32" :stroke-width="1.8" />
                <span v-if="file.isShortcut" class="desktop-shortcut-badge" aria-label="快捷方式">↗</span>
              </span>
              <span class="desktop-icon-name">{{ file.displayName || file.filename }}</span>
              <small>{{ fileKindLabel(file) }}</small>
            </button>
          </div>
          <p v-if="container.files.length === 0" class="empty-zone">这里暂时没有文件</p>
        </article>
      </div>
    </section>

    <aside class="command-panel organizer-command-panel">
      <div class="panel-title">
        <FolderKanban :size="22" />
        <div><p>整理控制</p><h2>先预览，再改变桌面</h2></div>
      </div>
      <div class="action-row">
        <button class="action-button muted" type="button" @click="emit('scan')"><RefreshCcw :size="18" /><span>刷新扫描</span></button>
        <button class="action-button secondary" type="button" @click="emit('restore')"><PanelRightOpen :size="18" /><span>安全归位</span></button>
        <button class="action-button quiet" type="button" @click="emit('clean')"><EyeOff :size="18" /><span>纯净桌面</span></button>
        <button class="action-button inbox" type="button" :disabled="actionBusy" @click="emit('prepareInbox')"><Inbox :size="18" /><span>生成收件箱方案</span></button>
        <button class="icon-button" type="button" title="设置" @click="emit('settings')"><Settings :size="20" /></button>
      </div>
      <div class="organizer-state-strip" :data-state="inboxPlan ? 'review' : latestUndoableExecution ? 'undoable' : 'idle'" aria-live="polite">
        <span class="organizer-state-icon" aria-hidden="true">
          <TriangleAlert v-if="inboxPlan" :size="16" />
          <CheckCircle2 v-else-if="latestUndoableExecution" :size="16" />
          <ShieldCheck v-else :size="16" />
        </span>
        <div class="organizer-state-copy">
          <div class="organizer-state-heading">
            <strong>{{ inboxPlan ? "预览待确认" : latestUndoableExecution ? "最近整理可撤销" : "桌面未修改" }}</strong>
            <span>{{ organizerStateLabel }}</span>
          </div>
          <small>{{ actionMessage || "所有移动都会先生成方案，不会静默改变桌面。" }}</small>
        </div>
        <div v-if="inboxPlan" class="organizer-state-metrics" aria-label="整理方案摘要">
          <span><b>{{ movableInboxItems }}</b> 待整理</span>
          <span><b>{{ conflictInboxItems }}</b> 冲突跳过</span>
        </div>
        <div v-else-if="latestUndoableExecution" class="organizer-state-metrics">
          <span><b>{{ latestUndoableExecution.items.length }}</b> 项已记录</span>
          <span>原位置已保存</span>
        </div>
      </div>
      <div v-if="selectedFile" class="file-preview">
        <strong>{{ selectedFile.displayName || selectedFile.filename }}</strong>
        <span>{{ selectedFile.fullPath }}</span>
      </div>
      <section class="inbox-review" aria-live="polite">
        <div class="inbox-review-heading">
          <div><span>可信整理</span><strong>桌面收件箱</strong></div>
          <button v-if="latestUndoableExecution" class="inbox-undo" type="button" :disabled="actionBusy" @click="emit('undoLatest')">撤销最近一次</button>
        </div>
        <p v-if="!inboxPlan">{{ actionMessage || "扫描后生成方案，不会未经确认移动文件。" }}</p>
        <template v-else>
          <p>{{ inboxPlan.summary }}</p>
          <ol>
            <li v-for="item in inboxPlan.items" :key="item.id" :class="{ conflict: item.conflict }">
              <div><span>{{ item.label }}</span><small>{{ item.conflict ? `已跳过：${item.conflict}` : `${item.category} · ${formatBytes(item.sizeBytes)}` }}</small></div>
              <small><b>来源</b>{{ item.sourcePath }}</small>
              <small><b>目标</b>{{ item.targetPath }}</small>
            </li>
          </ol>
          <div class="inbox-review-actions">
            <button type="button" class="inbox-execute" :disabled="actionBusy || movableInboxItems === 0" @click="emit('executeInbox')">确认整理 {{ movableInboxItems }} 项</button>
            <button type="button" class="inbox-cancel" :disabled="actionBusy" @click="emit('cancelInbox')">取消</button>
          </div>
        </template>
      </section>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { CheckCircle2, EyeOff, FileText, Folder, FolderKanban, FolderOpen, FolderPlus, Inbox, PanelRightOpen, RefreshCcw, Settings, ShieldCheck, TriangleAlert, X } from "lucide-vue-next";
import type { Component } from "vue";
import type { ActionExecution, ActionPlan, ContainerWithFiles, DesktopFileRecord, FilePreviewData, PortalConfig, PortalResource } from "@shared/types";

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

const preview = ref<FilePreviewData | null>(null);
const previewLoading = ref(false);
let previewToken = 0;

const portals = ref<PortalConfig[]>([]);
const portalResources = ref<Record<string, PortalResource[]>>({});
const portalBusy = ref(false);

watch(
  () => props.selectedFile,
  (file) => {
    void loadPreview(file);
  },
  { immediate: true }
);

async function loadPreview(file: DesktopFileRecord | null): Promise<void> {
  if (!file) {
    preview.value = null;
    return;
  }
  const token = ++previewToken;
  previewLoading.value = true;
  preview.value = null;
  try {
    const next = await window.projectD.getFilePreview(file.id);
    if (token === previewToken) preview.value = next;
  } catch {
    if (token === previewToken) {
      preview.value = { type: "unsupported", content: "读取失败", filename: file.filename, sizeLabel: "", modifiedAt: "" };
    }
  } finally {
    if (token === previewToken) previewLoading.value = false;
  }
}

function resourceKindLabel(resource: PortalResource): string {
  if (resource.isDirectory) return "文件夹";
  const extension = resource.name.includes(".") ? resource.name.split(".").pop()?.toUpperCase() : null;
  return extension || resource.category;
}

function portalName(portalPath: string): string {
  return portalPath.split(/[\\/]/).filter(Boolean).at(-1) || "文件门户";
}

async function loadPortals(): Promise<void> {
  try {
    const nextPortals = await window.projectD.getFolderPortals();
    portals.value = nextPortals;
    const entries = await Promise.all(
      nextPortals.map(async (portal) => {
        try {
          return [portal.id, await window.projectD.getFolderPortalResources(portal.id)] as const;
        } catch {
          return [portal.id, []] as const;
        }
      })
    );
    portalResources.value = Object.fromEntries(entries);
  } catch {
    portals.value = [];
  }
}

async function addPortal(): Promise<void> {
  if (portalBusy.value) return;
  portalBusy.value = true;
  try {
    const selectedPath = await window.projectD.chooseFolderPortal();
    if (!selectedPath) return;
    const proposed = portalName(selectedPath);
    const name = window.prompt("门户名称", proposed)?.trim();
    if (!name) return;
    await window.projectD.addFolderPortal(selectedPath, name);
    await loadPortals();
  } finally {
    portalBusy.value = false;
  }
}

async function removePortal(portal: PortalConfig): Promise<void> {
  if (!window.confirm(`从桌面移除“${portal.name}”门户？不会删除原文件。`)) return;
  await window.projectD.removeFolderPortal(portal.id);
  await loadPortals();
}

async function openPortalResource(resource: PortalResource): Promise<void> {
  if (resource.status !== "ready") return;
  await window.projectD.openFolderPortalResource(resource.portalId, resource.relativePath);
}

onMounted(() => {
  void loadPortals();
});
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
        <div class="file-preview-head">
          <strong>{{ selectedFile.displayName || selectedFile.filename }}</strong>
          <span>{{ selectedFile.fullPath }}</span>
        </div>
        <div class="file-preview-body">
          <div v-if="previewLoading" class="preview-loading">加载中…</div>
          <pre v-else-if="preview && preview.type === 'text'" class="preview-text">{{ preview.content }}</pre>
          <img v-else-if="preview && preview.type === 'image'" class="preview-image" :src="preview.content" :alt="preview.filename" />
          <div v-else-if="preview && preview.type === 'folder'" class="folder-preview">
            <p>{{ preview.content }}</p>
            <div class="folder-preview-grid">
              <article v-for="entry in preview.entries ?? []" :key="entry.name">
                <span class="folder-preview-icon" :data-directory="entry.isDirectory">
                  <Folder v-if="entry.isDirectory" :size="22" />
                  <FileText v-else :size="22" />
                </span>
                <strong>{{ entry.name }}</strong>
                <small>{{ entry.isDirectory ? '文件夹' : (entry.extension.replace('.', '').toUpperCase() || '文件') }}</small>
              </article>
            </div>
          </div>
          <p v-else class="preview-unsupported">{{ preview?.content || '暂无可预览内容' }}</p>
        </div>
        <small v-if="preview" class="file-preview-meta">{{ preview.sizeLabel }} · {{ preview.modifiedAt }}</small>
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

      <section class="organizer-portals" aria-label="文件夹门户">
        <div class="panel-title panel-title-spread">
          <div><span>只读授权</span><strong>文件夹门户</strong></div>
          <button type="button" class="icon-button" title="添加文件夹门户" :disabled="portalBusy" @click="addPortal"><FolderPlus :size="18" /></button>
        </div>
        <div v-if="portals.length === 0" class="organizer-portals-empty">还没有授权门户。把常用文件夹钉到桌面，做只读访问。</div>
        <div v-else class="organizer-portal-list">
          <article v-for="portal in portals" :key="portal.id" class="organizer-portal">
            <header>
              <span class="organizer-portal-name"><FolderOpen :size="15" />{{ portal.name }}</span>
              <button type="button" class="icon-button small" title="移除门户" @click="removePortal(portal)"><X :size="14" /></button>
            </header>
            <div class="organizer-portal-resources">
              <button
                v-for="resource in portalResources[portal.id] ?? []"
                :key="resource.relativePath"
                type="button"
                :disabled="resource.status !== 'ready'"
                :title="resource.status === 'ready' ? resource.name : `资源不可用：${resource.status}`"
                @click="openPortalResource(resource)"
              >
                <span class="portal-resource-icon" :data-directory="resource.isDirectory"><Folder v-if="resource.isDirectory" :size="16" /><FileText v-else :size="16" /></span>
                <strong>{{ resource.name }}</strong>
                <small>{{ resource.status === 'ready' ? resourceKindLabel(resource) : resource.status }}</small>
              </button>
              <p v-if="(portalResources[portal.id]?.length ?? 0) === 0" class="organizer-portal-empty">门户为空或暂时离线</p>
            </div>
          </article>
        </div>
      </section>
    </aside>
  </div>
</template>

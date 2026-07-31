<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { AlertTriangle, Bug, Calendar, Clipboard, Filter, Trash2, Upload } from "lucide-vue-next";
import type { CrashLogEntry, CrashLogFilter } from "@shared/types";

const emit = defineEmits<{
  close: [];
}>();

const logs = ref<CrashLogEntry[]>([]);
const loading = ref(true);
const selectedLog = ref<CrashLogEntry | null>(null);
const filterType = ref<string>("");
const filterUploaded = ref<number>(-1);
const filterExpanded = ref(false);
const showStartupPrompt = ref(false);

const typeOptions = [
  { value: "", label: "全部类型" },
  { value: "uncaught-exception", label: "未捕获异常" },
  { value: "unhandled-rejection", label: "未处理拒绝" },
  { value: "render-process-gone", label: "渲染进程崩溃" },
  { value: "renderer-crashed", label: "渲染器崩溃" },
  { value: "renderer-error", label: "渲染器错误" },
  { value: "renderer-unhandledrejection", label: "渲染器拒绝" },
  { value: "vue-error", label: "Vue 组件错误" },
  { value: "renderer-unresponsive", label: "渲染器无响应" }
];

const uploadStatusOptions = [
  { value: -1, label: "全部状态" },
  { value: 0, label: "未上传" },
  { value: 1, label: "已上传" }
];

const filteredLogs = computed(() => {
  return logs.value.filter((l: CrashLogEntry) => {
    if (filterType.value && l.type !== filterType.value) return false;
    if (filterUploaded.value >= 0 && l.uploaded !== filterUploaded.value) return false;
    return true;
  });
});

const hasUnuploaded = computed(() => logs.value.some((l: CrashLogEntry) => !l.uploaded));

async function loadLogs() {
  loading.value = true;
  try {
    const filter: CrashLogFilter = { limit: 200, offset: 0, uploaded: -1 };
    logs.value = await window.projectD.getCrashLogs(filter);
    const unuploaded = await window.projectD.getUnuploadedCrashCount();
    showStartupPrompt.value = unuploaded > 0;
  } catch {
    logs.value = [];
  } finally {
    loading.value = false;
  }
}

async function deleteLog(id: number) {
  try {
    await window.projectD.deleteCrashLog(id);
    logs.value = logs.value.filter((l: CrashLogEntry) => l.id !== id);
    if (selectedLog.value?.id === id) selectedLog.value = null;
  } catch { /* 忽略删除失败 */ }
}

async function clearAll() {
  try {
    await window.projectD.clearCrashLogs();
    logs.value = [];
    selectedLog.value = null;
  } catch { /* 忽略清除失败 */ }
}

async function uploadLogs() {
  const unuploaded = logs.value.filter((l: CrashLogEntry) => !l.uploaded);
  if (unuploaded.length === 0) return;
  try {
    await window.projectD.uploadCrashLogs(unuploaded.map((l: CrashLogEntry) => l.id));
    for (const l of unuploaded) l.uploaded = 1;
    showStartupPrompt.value = false;
  } catch { /* 忽略上传失败 */ }
}

function copyLogDetails(log: CrashLogEntry) {
  const text = [
    `类型: ${log.type}`,
    `时间: ${log.crashedAt}`,
    `消息: ${log.message}`,
    `版本: ${log.appVersion}`,
    `系统: ${log.osInfo}`,
    `内存: ${log.memoryInfo}`,
    `操作路径: ${log.breadcrumbs ?? "无"}`,
    `堆栈:\n${log.stack ?? "无"}`
  ].join("\n");
  navigator.clipboard.writeText(text).catch(() => { /* 忽略 */ });
}

function typeLabel(type: string): string {
  return typeOptions.find((o) => o.value === type)?.label ?? type;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

onMounted(() => {
  loadLogs();
});
</script>

<template>
  <section class="crash-manager-overlay" role="dialog" aria-label="崩溃诊断" @click.self="emit('close')">
    <div class="crash-manager">
      <header class="crash-manager-header">
        <div class="header-left">
          <Bug :size="20" />
          <h2>崩溃诊断</h2>
          <span v-if="logs.length" class="log-count">{{ logs.length }} 条记录</span>
        </div>
        <div class="header-right">
          <button
            v-if="hasUnuploaded"
            type="button"
            class="action-btn upload-btn"
            title="上传所有未上报日志"
            @click="uploadLogs"
          >
            <Upload :size="15" /> 上传
          </button>
          <button
            v-if="logs.length"
            type="button"
            class="action-btn danger-btn"
            title="清空所有日志"
            @click="clearAll"
          >
            <Trash2 :size="15" /> 清空
          </button>
          <button type="button" class="close-btn" title="关闭" @click="emit('close')">\u2715</button>
        </div>
      </header>

      <!-- 启动提示横幅 -->
      <div v-if="showStartupPrompt" class="startup-prompt">
        <AlertTriangle :size="16" />
        <span>检测到未上报的崩溃日志，点击「上传」提交，帮助改善稳定性。</span>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <button type="button" class="filter-toggle" @click="filterExpanded = !filterExpanded">
          <Filter :size="14" /> 筛选 {{ filterExpanded ? "\u25B2" : "\u25BC" }}
        </button>
        <div v-if="filterExpanded" class="filter-options">
          <label>
            类型：
            <select v-model="filterType">
              <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </label>
          <label>
            状态：
            <select v-model="filterUploaded">
              <option v-for="opt in uploadStatusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </label>
        </div>
      </div>

      <!-- 加载/空状态 -->
      <div v-if="loading" class="crash-manager-state">
        <p>加载中...</p>
      </div>
      <div v-else-if="filteredLogs.length === 0" class="crash-manager-state">
        <Bug :size="32" class="empty-icon" />
        <p>{{ logs.length === 0 ? "暂无崩溃日志，应用运行良好！" : "没有匹配的日志" }}</p>
      </div>

      <!-- 日志列表 -->
      <div v-else class="crash-manager-body">
        <div class="log-list">
          <div
            v-for="log in filteredLogs"
            :key="log.id"
            :class="['log-item', { selected: selectedLog?.id === log.id }]"
            @click="selectedLog = selectedLog?.id === log.id ? null : log"
          >
            <div class="log-item-main">
              <span :class="['log-type-badge', log.type]">{{ typeLabel(log.type) }}</span>
              <span class="log-message">{{ log.message.slice(0, 80) }}</span>
            </div>
            <div class="log-item-meta">
              <span class="log-date"><Calendar :size="12" /> {{ formatDate(log.crashedAt) }}</span>
              <span :class="['log-uploaded-badge', log.uploaded ? 'yes' : 'no']">
                {{ log.uploaded ? "已上报" : "未上报" }}
              </span>
            </div>
          </div>
        </div>

        <!-- 详情面板 -->
        <div v-if="selectedLog" class="log-detail">
          <div class="detail-header">
            <h3>{{ typeLabel(selectedLog.type) }}</h3>
            <button type="button" class="copy-btn" title="复制详情" @click="copyLogDetails(selectedLog)">
              <Clipboard :size="14" /> 复制
            </button>
            <button type="button" class="delete-btn" title="删除此条" @click="deleteLog(selectedLog.id)">
              <Trash2 :size="14" />
            </button>
          </div>
          <dl>
            <dt>时间</dt>
            <dd>{{ selectedLog.crashedAt }}</dd>
            <dt>版本</dt>
            <dd>{{ selectedLog.appVersion }}</dd>
            <dt>系统</dt>
            <dd>{{ selectedLog.osInfo }}</dd>
            <dt>内存</dt>
            <dd>{{ selectedLog.memoryInfo }}</dd>
            <dt v-if="selectedLog.rendererPid">渲染进程 PID</dt>
            <dd v-if="selectedLog.rendererPid">{{ selectedLog.rendererPid }}</dd>
            <dt>用户操作路径</dt>
            <dd v-if="selectedLog.breadcrumbs">
              <div class="breadcrumbs-display">
                <div v-for="(bc, i) in JSON.parse(selectedLog.breadcrumbs)" :key="i" class="breadcrumb-row">
                  <span class="bc-category">{{ bc.category }}</span>
                  <span class="bc-label">{{ bc.label }}</span>
                  <span class="bc-time">{{ formatDate(bc.timestamp) }}</span>
                </div>
              </div>
            </dd>
            <dd v-else class="muted">无记录</dd>
            <dt>堆栈</dt>
            <dd v-if="selectedLog.stack">
              <pre class="stack-trace">{{ selectedLog.stack }}</pre>
            </dd>
            <dd v-else class="muted">无堆栈</dd>
          </dl>
        </div>
      </div>

      <footer class="crash-manager-footer">
        <span>崩溃日志存储在本地，仅在你点击上传时发送。</span>
      </footer>
    </div>
  </section>
</template>

<style scoped>
/* overlay */
.crash-manager-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 12, 16, 0.72);
  backdrop-filter: blur(4px);
}

/* main panel */
.crash-manager {
  width: min(820px, 92vw);
  max-height: 86vh;
  background: rgba(18, 20, 26, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

/* header */
.crash-manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f08778;
}
.header-left h2 {
  margin: 0;
  font-size: 16px;
  color: #f6f3ec;
}
.log-count {
  font-size: 12px;
  color: rgba(246, 243, 236, 0.45);
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 8px;
  border-radius: 10px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: transparent;
  color: rgba(246, 243, 236, 0.7);
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s, color 0.15s;
}
.action-btn:hover { background: rgba(255, 255, 255, 0.08); color: #f6f3ec; }
.upload-btn { color: #7ecf8c; border-color: rgba(126, 207, 140, 0.2); }
.upload-btn:hover { background: rgba(126, 207, 140, 0.1); }
.danger-btn:hover { color: #f08778; border-color: rgba(240, 135, 120, 0.2); }
.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(246, 243, 236, 0.5);
  cursor: pointer;
  font-size: 14px;
  display: grid;
  place-items: center;
}
.close-btn:hover { background: rgba(255, 255, 255, 0.08); color: #f6f3ec; }

/* startup prompt */
.startup-prompt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(240, 135, 120, 0.08);
  border-bottom: 1px solid rgba(240, 135, 120, 0.12);
  color: #f08778;
  font-size: 13px;
}

/* filter bar */
.filter-bar {
  padding: 8px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}
.filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: transparent;
  color: rgba(246, 243, 236, 0.55);
  cursor: pointer;
  font-size: 12px;
}
.filter-toggle:hover { background: rgba(255, 255, 255, 0.05); }
.filter-options {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}
.filter-options label {
  font-size: 12px;
  color: rgba(246, 243, 236, 0.5);
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-options select {
  padding: 3px 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
  color: #f6f3ec;
  font-size: 12px;
}

/* state */
.crash-manager-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 20px;
  color: rgba(246, 243, 236, 0.35);
  font-size: 14px;
}
.empty-icon { opacity: 0.3; }

/* body */
.crash-manager-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* log list */
.log-list {
  flex: 0 0 340px;
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}
.log-list::-webkit-scrollbar { width: 4px; }
.log-list::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }

.log-item {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: background 0.1s;
}
.log-item:hover { background: rgba(255, 255, 255, 0.03); }
.log-item.selected { background: rgba(255, 255, 255, 0.06); }

.log-item-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.log-type-badge {
  display: inline-block;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  width: fit-content;
  color: #f6f3ec;
}
.log-type-badge.uncaught-exception,
.log-type-badge.unhandled-rejection,
.log-type-badge.renderer-unhandledrejection,
.log-type-badge.vue-error,
.log-type-badge.renderer-error { background: rgba(240, 135, 120, 0.3); }
.log-type-badge.render-process-gone,
.log-type-badge.renderer-crashed,
.log-type-badge.renderer-unresponsive { background: rgba(240, 135, 120, 0.45); }

.log-message {
  font-size: 13px;
  color: rgba(246, 243, 236, 0.75);
  line-height: 1.35;
  word-break: break-word;
}
.log-item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
}
.log-date {
  font-size: 11px;
  color: rgba(246, 243, 236, 0.3);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.log-uploaded-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
}
.log-uploaded-badge.no { background: rgba(240, 135, 120, 0.15); color: #f08778; }
.log-uploaded-badge.yes { background: rgba(126, 207, 140, 0.12); color: #7ecf8c; }

/* detail panel */
.log-detail {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.log-detail::-webkit-scrollbar { width: 4px; }
.log-detail::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.detail-header h3 {
  margin: 0;
  flex: 1;
  font-size: 15px;
  color: #f6f3ec;
}
.copy-btn, .delete-btn {
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: transparent;
  color: rgba(246, 243, 236, 0.5);
  cursor: pointer;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.copy-btn:hover { color: #f6f3ec; border-color: rgba(255, 255, 255, 0.2); }
.delete-btn:hover { color: #f08778; border-color: rgba(240, 135, 120, 0.3); }

dl {
  margin: 0;
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 4px 12px;
  font-size: 13px;
}
dt {
  color: rgba(246, 243, 236, 0.4);
  text-align: right;
  padding-top: 4px;
}
dd {
  margin: 0;
  color: rgba(246, 243, 236, 0.7);
  padding-top: 4px;
  word-break: break-all;
}
dd.muted { color: rgba(246, 243, 236, 0.2); }

.stack-trace {
  margin: 4px 0 0;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.5;
  color: rgba(246, 243, 236, 0.55);
  white-space: pre-wrap;
  max-height: 250px;
  overflow-y: auto;
}

.breadcrumbs-display {
  margin: 4px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 120px;
  overflow-y: auto;
}
.breadcrumb-row {
  display: flex;
  gap: 8px;
  font-size: 11px;
  align-items: baseline;
}
.bc-category {
  color: rgba(246, 243, 236, 0.25);
  min-width: 40px;
}
.bc-label { color: rgba(246, 243, 236, 0.6); flex: 1; }
.bc-time { color: rgba(246, 243, 236, 0.2); }

/* footer */
.crash-manager-footer {
  padding: 10px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 11px;
  color: rgba(246, 243, 236, 0.25);
  text-align: center;
  flex-shrink: 0;
}
</style>

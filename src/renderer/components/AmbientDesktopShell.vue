<script setup lang="ts">
import type { Component } from "vue";
import {
  AppWindow, Archive, ArrowRight, Code2, ExternalLink,
  EyeOff, FileQuestion, FileText, Film, Folder, FolderOpen,
  Image as ImageIcon, Palette, Pencil, RefreshCcw, Sparkles, X
} from "lucide-vue-next";
import WallpaperStage from "./WallpaperStage.vue";
import EdgeRail from "./EdgeRail.vue";
import AmbientStatus from "./AmbientStatus.vue";
import AmbientFileSpace from "./AmbientFileSpace.vue";
import SceneSurface from "./SceneSurface.vue";
import SearchSurface from "./SearchSurface.vue";
import AssistantSurface from "./AssistantSurface.vue";
import OrganizerSurface from "./OrganizerSurface.vue";
import CompatibilitySurface from "./CompatibilitySurface.vue";
import OnboardingFlow from "./OnboardingFlow.vue";
import TaskSurface from "./TaskSurface.vue";
import type { DesktopExperienceMode, DesktopTaskSurface } from "@shared/desktop-experience";
import type {
  ContainerWithFiles, CurrentWeather, DesktopFileRecord, SettingsSnapshot,
  SuggestionRecord, WorkspaceSearchResult, WallpaperLibraryItem, AppInfo,
  DatabaseStatus, ActionPlan, ActionExecution, DesktopStatus, WorkspaceScene
} from "@shared/types";

defineProps<{
  experienceMode: DesktopExperienceMode;
  activeTaskSurface: DesktopTaskSurface;
  showOnboarding: boolean;
  containers: ContainerWithFiles[];
  totalFiles: number;
  selectedFile: DesktopFileRecord | null;
  settings: SettingsSnapshot | null;
  contextMenu: { file: DesktopFileRecord; x: number; y: number } | null;
  recoveryNotice: string;
  currentWallpaperLabel: string;
  currentWallpaperId: string | null;
  currentWallpaper: WallpaperLibraryItem | null;
  wallpaperLibrary: WallpaperLibraryItem[];
  currentWeather: CurrentWeather | null;
  currentWeatherLabel: string;
  weatherSourceLabel: string;
  wallpaperHostLabel: string;
  taskSurfaceLabel: string;
  currentPetLabel: string;
  effectivePerformanceProfile: string;
  desktopStatus: DesktopStatus;
  inboxPlan: ActionPlan | null;
  movableInboxItems: number;
  actionMessage: string;
  actionBusy: boolean;
  latestUndoableExecution: ActionExecution | null;
  latestSuggestion: SuggestionRecord | null;
  appInfo: AppInfo | null;
  databaseStatus: DatabaseStatus | null;
  appVersion: string;
  workspaceSearchQuery: string;
  workspaceSearchResults: WorkspaceSearchResult[];
  workspaceSearchStatus: string;
  searchScenes: WorkspaceScene[];
  searchScenePickerResultId: string | null;
  searchActionNotice: {
    resultId: string; tone: "neutral" | "success" | "error"; message: string;
  } | null;
  experienceModeLabel: string;
  actionHistory: ActionExecution[];
}>();

const emit = defineEmits<{
  wake: [];
  openSurface: [surface: Exclude<DesktopTaskSurface, null>];
  enterClean: [];
  openSettings: [];
  openDiagnostics: [];
  closeSurface: [];
  leaveImmersive: [];
  dismissOnboarding: [];
  selectFile: [file: DesktopFileRecord];
  openFile: [id: number];
  showFileMenu: [payload: { file: DesktopFileRecord; event: MouseEvent }];
  openFileLocation: [id: number];
  moveFileToContainer: [fileId: number, containerId: number];
  renameFileAlias: [file: DesktopFileRecord];
  hideFile: [id: number];
  switchWallpaper: [];
  openWallpaperPage: [];
  refreshStatus: [];
  scanDesktop: [];
  deactivateDesktop: [];
  activateDesktop: [];
  enterCleanDesktop: [];
  prepareDesktopInbox: [];
  executeInboxPlan: [];
  undoLatestAction: [];
  cancelInbox: [];
  dismissRecoveryNotice: [];
  openLatestSuggestionTask: [];
  dismissLatestSuggestion: [];
  snoozeSuggestion: [];
  disableSuggestions: [];
  searchWorkspace: [query: string];
  clearWorkspaceSearch: [];
  openSearchResult: [result: WorkspaceSearchResult];
  revealSearchResult: [result: WorkspaceSearchResult];
  copySearchResultPath: [result: WorkspaceSearchResult];
  addSearchResultToPortal: [result: WorkspaceSearchResult];
  toggleSearchScenePicker: [result: WorkspaceSearchResult];
  pinSearchResultToScene: [result: WorkspaceSearchResult, scene: WorkspaceScene];
}>();

const fileIconMap: Record<string, typeof AppWindow> = {
  program: AppWindow, document: FileText, image: ImageIcon, media: Film,
  code: Code2, archive: Archive, folder: Folder, design: Palette, other: FileQuestion,
};

function fileIcon(file: DesktopFileRecord): Component {
  return fileIconMap[file.category] ?? FileQuestion;
}

function fileKindLabelFn(file: DesktopFileRecord): string {
  if (file.category === "folder") return "文件夹";
  return file.extension?.replace(".", "").toUpperCase() || file.category;
}

const containerAccents: Record<string, string> = {
  blue: "#3b82f6", purple: "#8b5cf6", green: "#22c55e", orange: "#f97316",
  pink: "#ec4899", teal: "#14b8a6", default: "#6366f1",
};

function containerVisualStyle(container: ContainerWithFiles): Record<string, string> {
  const accent = containerAccents[container.accentColor ?? ""] ?? containerAccents.default;
  return { "--container-accent": accent };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<template>
  <main
    class="app-shell"
    :data-experience-mode="experienceMode"
    :data-task-surface="activeTaskSurface || undefined"
  >
    <OnboardingFlow v-if="showOnboarding" @completed="emit('dismissOnboarding')" @skipped="emit('dismissOnboarding')" />
    <WallpaperStage />
    <EdgeRail
      :mode="experienceMode"
      :active-surface="activeTaskSurface"
      @wake="emit('wake')"
      @open-surface="emit('openSurface', $event)"
      @enter-clean="emit('enterClean')"
      @open-settings="emit('openSettings')"
      @open-diagnostics="emit('openDiagnostics')"
    />
    <AmbientStatus
      :mode="experienceMode"
      :wallpaper-label="currentWallpaperLabel"
      :city="currentWeather?.city || '自动定位'"
      :host-label="wallpaperHostLabel"
      :task-label="taskSurfaceLabel"
      :active-surface="activeTaskSurface"
      :weather-label="currentWeatherLabel"
      :pet-label="currentPetLabel"
      :pet-visible="settings?.pet.isVisible ?? false"
      @wake="emit('wake')"
      @close-task="emit('closeSurface')"
      @leave-immersive="emit('leaveImmersive')"
    />
    <AmbientFileSpace
      v-if="experienceMode === 'immersive' && !activeTaskSurface"
      :containers="containers"
      :file-icon="fileIcon"
      :file-kind-label="fileKindLabelFn"
      :container-visual-style="containerVisualStyle"
      @select-file="emit('selectFile', $event)"
      @open-file="emit('openFile', $event)"
      @show-file-menu="(event: MouseEvent, file: DesktopFileRecord) => emit('showFileMenu', { event, file })"
      @open-organizer="emit('openSurface', 'organize')"
    />
    <section
      v-if="latestSuggestion && experienceMode === 'immersive' && !activeTaskSurface"
      class="ambient-suggestion" aria-live="polite"
    >
      <span class="ambient-suggestion-icon"><Sparkles :size="16" /></span>
      <div>
        <span>桌宠提醒</span>
        <strong>{{ latestSuggestion.title }}</strong>
        <small>{{ latestSuggestion.detail }}</small>
      </div>
      <button type="button" @click="emit('openLatestSuggestionTask')">查看整理</button>
      <button type="button" class="ambient-suggestion-dismiss" title="收起提醒" aria-label="收起提醒" @click="emit('dismissLatestSuggestion')">
        <X :size="15" />
      </button>
    </section>

    <section
      class="desktop-band"
      :data-visible="Boolean(activeTaskSurface || !['native', 'immersive', 'clean'].includes(experienceMode))"
    >
      <header class="topbar">
        <div class="brand-lockup">
          <span class="brand-mark">D</span>
          <div>
            <strong>Project D</strong>
            <span>桌面空间</span>
          </div>
        </div>
        <div class="topbar-state">
          <span class="host-state">{{ wallpaperHostLabel }}</span>
          <div class="status-pill" :data-mode="experienceMode">
            <span></span>
            {{ experienceModeLabel }}
          </div>
        </div>
      </header>
      <button class="wallpaper-pull-cord" type="button" title="切换到下一张壁纸" @click="emit('switchWallpaper')">
        <span></span>
        {{ currentWallpaperLabel }}
      </button>
      <div v-if="desktopStatus.message && desktopStatus.mode !== 'idle'" class="recovery-banner">
        {{ desktopStatus.message }}
      </div>
      <div v-if="recoveryNotice" class="recovery-banner recovery-banner-persistent">
        <span>{{ recoveryNotice }}</span>
        <button type="button" @click="emit('dismissRecoveryNotice')">知道了</button>
      </div>

      <TaskSurface
        :active="activeTaskSurface"
        :label="taskSurfaceLabel"
        :experience-mode="experienceMode"
        @close="emit('closeSurface')"
      >
        <template #assistant>
          <AssistantSurface
            :wallpaper-label="currentWallpaperLabel"
            :weather-label="currentWeather?.condition || settings?.weather.manualWeather || 'clear'"
            :city="currentWeather?.city || settings?.weather.city || '自动定位'"
            :performance-mode="effectivePerformanceProfile"
            :pet-character-id="settings?.pet.characterId || 'luna-q'"
            :pet-personality="settings?.pet.personality || 'gentle'"
            :pet-visible="settings?.pet.isVisible ?? false"
            :provider-label="settings?.ai.provider || 'AI provider'"
            :provider-configured="Boolean(settings?.ai.enabled && settings?.ai.apiKeyConfigured)"
            @request-inbox-plan="emit('prepareDesktopInbox')"
          />
        </template>
        <template #search>
          <SearchSurface
            :query="workspaceSearchQuery"
            :results="workspaceSearchResults"
            :status="workspaceSearchStatus"
            :scenes="searchScenes"
            :picker-result-id="searchScenePickerResultId"
            :action-notice="searchActionNotice"
            @update:query="(q: string) => emit('searchWorkspace', q)"
            @search="emit('searchWorkspace', workspaceSearchQuery)"
            @clear="emit('clearWorkspaceSearch')"
            @open="(r: WorkspaceSearchResult) => emit('openSearchResult', r)"
            @reveal="(r: WorkspaceSearchResult) => emit('revealSearchResult', r)"
            @copy="(r: WorkspaceSearchResult) => emit('copySearchResultPath', r)"
            @portal="(r: WorkspaceSearchResult) => emit('addSearchResultToPortal', r)"
            @toggle-scene="(r: WorkspaceSearchResult) => emit('toggleSearchScenePicker', r)"
            @pin-scene="(result: WorkspaceSearchResult, scene: WorkspaceScene) => emit('pinSearchResultToScene', result, scene)"
          />
        </template>
        <template #organize>
          <OrganizerSurface
            :containers="containers"
            :total-files="totalFiles"
            :selected-file="selectedFile"
            :action-message="actionMessage"
            :action-busy="actionBusy"
            :inbox-plan="inboxPlan"
            :movable-inbox-items="movableInboxItems"
            :latest-undoable-execution="latestUndoableExecution"
            :file-icon="fileIcon"
            :file-kind-label="fileKindLabelFn"
            :container-visual-style="containerVisualStyle"
            :format-bytes="formatBytes"
            @select-file="emit('selectFile', $event)"
            @open-file="emit('openFile', $event)"
            @show-file-menu="(event: MouseEvent, file: DesktopFileRecord) => emit('showFileMenu', { event, file })"
            @restore="emit('deactivateDesktop')"
            @scan="emit('scanDesktop')"
            @clean="emit('enterCleanDesktop')"
            @settings="emit('openSettings')"
            @prepare-inbox="emit('prepareDesktopInbox')"
            @execute-inbox="emit('executeInboxPlan')"
            @undo-latest="emit('undoLatestAction')"
            @cancel-inbox="emit('cancelInbox')"
          />
        </template>
        <template #scene>
          <SceneSurface
            :wallpaper-label="currentWallpaperLabel"
            :wallpaper-id="currentWallpaperId"
            :city="currentWeather?.city || '自动定位'"
            :host-label="wallpaperHostLabel"
            :weather-mode="settings?.weather.mode || 'auto'"
            :weather-label="currentWeather?.condition || settings?.weather.manualWeather || 'clear'"
            :weather-intensity="settings?.weather.particleIntensity ?? 0.55"
            :performance-mode="effectivePerformanceProfile"
            :pet-position="{ x: settings?.pet.positionX ?? 36, y: settings?.pet.positionY ?? 36 }"
            :pet-visible="settings?.pet.isVisible ?? false"
            :pet-character-id="settings?.pet.characterId ?? 'luna-q'"
            :pet-outfit="settings?.pet.currentOutfit ?? 'default'"
            :pet-personality="settings?.pet.personality ?? 'gentle'"
            :pet-talk-frequency="settings?.pet.talkFrequency ?? 'normal'"
            :safe-region="currentWallpaper?.safeRegion"
            :wallpapers="wallpaperLibrary"
            @next-wallpaper="emit('switchWallpaper')"
            @open-library="emit('openWallpaperPage')"
            @applied="emit('refreshStatus')"
          />
        </template>
      </TaskSurface>

      <CompatibilitySurface
        v-if="experienceMode === 'safe'"
        :containers="containers"
        :total-files="totalFiles"
        :selected-file="selectedFile"
        :action-message="actionMessage"
        :action-busy="actionBusy"
        :inbox-plan="inboxPlan"
        :movable-inbox-items="movableInboxItems"
        :latest-undoable-execution="latestUndoableExecution"
        :app-info="appInfo"
        :database-status="databaseStatus"
        :app-version="appVersion"
        :wallpaper-host-label="wallpaperHostLabel"
        :current-weather="currentWeather"
        :weather-source-label="weatherSourceLabel"
        :latest-suggestion="latestSuggestion"
        :workspace-search-query="workspaceSearchQuery"
        :workspace-search-results="workspaceSearchResults"
        :workspace-search-status="workspaceSearchStatus"
        :search-scenes="searchScenes"
        :search-scene-picker-result-id="searchScenePickerResultId"
        :file-icon="fileIcon"
        :file-kind-label="fileKindLabelFn"
        :container-visual-style="containerVisualStyle"
        :format-bytes="formatBytes"
        @select-file="emit('selectFile', $event)"
        @open-file="emit('openFile', $event)"
        @show-file-menu="(event: MouseEvent, file: DesktopFileRecord) => emit('showFileMenu', { event, file })"
        @activate="emit('activateDesktop')"
        @restore="emit('deactivateDesktop')"
        @clean="emit('enterCleanDesktop')"
        @scan="emit('scanDesktop')"
        @settings="emit('openSettings')"
        @update:query="(q: string) => emit('searchWorkspace', q)"
        @search="emit('searchWorkspace', workspaceSearchQuery)"
        @clear="emit('clearWorkspaceSearch')"
        @open="(r: WorkspaceSearchResult) => emit('openSearchResult', r)"
        @reveal="(r: WorkspaceSearchResult) => emit('revealSearchResult', r)"
        @copy="(r: WorkspaceSearchResult) => emit('copySearchResultPath', r)"
        @portal="(r: WorkspaceSearchResult) => emit('addSearchResultToPortal', r)"
        @toggle-scene="(r: WorkspaceSearchResult) => emit('toggleSearchScenePicker', r)"
        @pin-scene="(result: WorkspaceSearchResult, scene: WorkspaceScene) => emit('pinSearchResultToScene', result, scene)"
        @prepare-inbox="emit('prepareDesktopInbox')"
        @execute-inbox="emit('executeInboxPlan')"
        @undo-latest="emit('undoLatestAction')"
        @cancel-inbox="emit('cancelInbox')"
        @snooze-suggestion="emit('snoozeSuggestion')"
        @disable-suggestions="emit('disableSuggestions')"
      />
    </section>

    <div v-if="contextMenu" class="context-menu" :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }">
      <button type="button" @click="emit('openFile', contextMenu.file.id)">
        <ExternalLink :size="15" />打开
      </button>
      <button type="button" @click="emit('openFileLocation', contextMenu.file.id)">
        <FolderOpen :size="15" />打开所在位置
      </button>
      <button
        v-for="container in containers"
        :key="container.id"
        type="button"
        @click="emit('moveFileToContainer', contextMenu!.file.id, container.id)"
      >
        <ArrowRight :size="15" />移动到：{{ container.name }}
      </button>
      <button type="button" @click="emit('renameFileAlias', contextMenu.file)">
        <Pencil :size="15" />重命名显示名
      </button>
      <button type="button" @click="emit('hideFile', contextMenu.file.id)">
        <EyeOff :size="15" />从 Project D 隐藏
      </button>
      <button type="button" @click="emit('scanDesktop')">
        <RefreshCcw :size="15" />刷新文件信息
      </button>
    </div>
  </main>
</template>

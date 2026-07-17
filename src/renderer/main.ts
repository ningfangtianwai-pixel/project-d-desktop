import { createApp } from "vue";
import App from "./App.vue";
import "./styles.css";
import { findWallpaperByInput, nextWallpaperId, WALLPAPER_LIBRARY } from "../shared/wallpaper-library";
import type { ActionExecution, ActionPlan, ChatMessage, PortalConfig, PortalResource, ProjectDApi, SettingsSnapshot, WorkspaceScene } from "../shared/types";
import type { AutoRule } from "../shared/auto-rules";
import type { UpdateStatus } from "../shared/update";

if (!window.projectD) {
  const memoryState = new Map<string, string>();
  memoryState.set("wallpaper_host", "Progman");
  memoryState.set("weather_location_source", "ipwhois");
  memoryState.set("recovery_script_path", "ProjectD-Recover-Desktop.bat");
  memoryState.set("performance_mode", "auto");
  memoryState.set("auto_activate_on_start", "false");
  memoryState.set("launch_at_login", "false");
  memoryState.set("cover_all_displays", "false");
  const chatHistory: ChatMessage[] = [];
  const actionPlans = new Map<string, ActionPlan>();
  const actionHistory: ActionExecution[] = [];
  const autoRules: AutoRule[] = [];
  const workspaceScenes: WorkspaceScene[] = [];
  const folderPortals: PortalConfig[] = [];
  const settingsListeners = new Set<() => void>();
  const updateListeners = new Set<(status: UpdateStatus) => void>();
  let mockDisplayWallpaperId: string | null = null;
  let mockUpdateStatus: UpdateStatus = {
    phase: "disabled",
    channel: "stable",
    currentVersion: "0.1.0",
    availableVersion: null,
    progressPercent: null,
    transferredBytes: null,
    totalBytes: null,
    lastCheckedAt: null,
    feedConfigured: false,
    stagedRolloutSupported: true,
    message: "浏览器预览未连接更新服务器"
  };
  const now = () => new Date().toISOString();
  const mockSettings: SettingsSnapshot = {
    wallpaper: {
      currentStyle: "anime",
      currentIndex: 0,
      borderStyle: "rounded",
      borderColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      isDynamic: true,
      dynamicId: null,
      autoRotate: false,
      rotateInterval: 300
    },
    weather: {
      mode: "manual",
      manualWeather: "clear",
      city: null,
      particleIntensity: 0.55,
      enableBorderInteraction: true,
      apiKeyConfigured: false
    },
    pet: {
      characterId: "default",
      currentOutfit: "default",
      positionX: 36,
      positionY: 36,
      scale: 1,
      isVisible: true,
      personality: "gentle",
      autoOutfit: true,
      actionInterval: 120,
      talkFrequency: "normal"
    },
    ai: {
      provider: "local-fallback",
      apiEndpoint: "browser-preview",
      model: "local-fallback",
      temperature: 0.8,
      maxTokens: 150,
      dailyCount: 0,
      dailyLimit: 999,
      enabled: true,
      apiKeyConfigured: false
    }
  };
  const cloneSettings = () => JSON.parse(JSON.stringify(mockSettings)) as SettingsSnapshot;
  const notifySettingsUpdated = () => {
    window.dispatchEvent(new Event("projectd:settings-changed"));
    for (const listener of settingsListeners) {
      listener();
    }
  };
  const mockApi: ProjectDApi = {
    getAppInfo: async () => ({ name: "Project D", version: "0.1.0", platform: "win32", isPackaged: false }),
    showMain: async () => undefined,
    setOnboardingActive: async () => undefined,
    getDesktopStatus: async () => ({ mode: "idle", lastChangedAt: now(), message: "浏览器预览模式" }),
    activateDesktop: async () => ({ mode: "safe-mode", lastChangedAt: now(), message: "浏览器预览不会接管真实桌面" }),
    deactivateDesktop: async () => ({ mode: "idle", lastChangedAt: now(), message: "浏览器预览模式" }),
    enterCleanDesktop: async () => ({ mode: "safe-mode", lastChangedAt: now(), message: "浏览器预览模式：纯净桌面只在 Electron 中隐藏真实桌面图标" }),
    exitCleanDesktop: async () => ({ mode: "idle", lastChangedAt: now(), message: "浏览器预览模式" }),
    scanDesktop: async () => ({
      desktopPath: "browser-preview",
      scannedAt: now(),
      totalEntries: 4,
      insertedOrUpdated: 4,
      markedMissing: 0,
      durationMs: 12
    }),
    getDesktopFiles: async () => [
      {
        id: 1,
        name: "文档",
        icon: "file-text",
        categoryFilter: ["document"],
        positionX: 32,
        positionY: 116,
        width: 300,
        height: 400,
        sortOrder: 0,
        isCollapsed: false,
        isVisible: true,
        layoutGroup: 0,
        accentColor: "mint",
        files: [
          {
            id: 1,
            filename: "ProjectD需求.md",
            displayName: null,
            fullPath: "browser-preview/ProjectD需求.md",
            extension: ".md",
            category: "document",
            sizeBytes: 2048,
            modifiedAt: now(),
            isShortcut: false,
            customCategory: null,
            containerId: 1,
            sortOrder: 0,
            isMissing: false
          }
        ]
      },
      {
        id: 2,
        name: "程序与快捷方式",
        icon: "app-window",
        categoryFilter: ["program"],
        positionX: 356,
        positionY: 116,
        width: 300,
        height: 400,
        sortOrder: 1,
        isCollapsed: false,
        isVisible: true,
        layoutGroup: 0,
        accentColor: "sky",
        files: []
      }
    ],
    openFile: async () => undefined,
    openFileLocation: async () => undefined,
    moveFileToContainer: async () => undefined,
    renameFileAlias: async () => undefined,
    hideFile: async () => undefined,
    createDesktopInboxPlan: async () => {
      const plan: ActionPlan = {
        id: `preview-plan-${Date.now()}`,
        source: "desktop-inbox",
        riskLevel: "L2",
        status: "ready",
        summary: "浏览器预览：已生成 1 项可撤销整理方案。",
        createdAt: now(),
        items: [{
          id: `preview-item-${Date.now()}`,
          kind: "move",
          sourcePath: "browser-preview/ProjectD需求.md",
          targetPath: "browser-preview/Project D 收纳/文档/ProjectD需求.md",
          label: "ProjectD需求.md",
          category: "document",
          sizeBytes: 2048,
          status: "pending"
        }]
      };
      actionPlans.set(plan.id, plan);
      return plan;
    },
    executeActionPlan: async (planId) => {
      const plan = actionPlans.get(planId);
      if (!plan) throw new Error("浏览器预览中没有找到整理方案");
      const execution: ActionExecution = {
        id: `preview-execution-${Date.now()}`,
        planId,
        status: "completed",
        startedAt: now(),
        completedAt: now(),
        undoable: true,
        summary: "浏览器预览：已模拟整理 1 项，可撤销。",
        items: plan.items.map((item) => ({ ...item, status: "completed" }))
      };
      actionHistory.unshift(execution);
      return execution;
    },
    undoActionExecution: async (executionId) => {
      const execution = actionHistory.find((item) => item.id === executionId);
      if (!execution) throw new Error("浏览器预览中没有找到操作记录");
      execution.status = "undone";
      execution.undoable = false;
      execution.completedAt = now();
      execution.summary = "浏览器预览：已模拟恢复到原位置。";
      execution.items = execution.items.map((item) => ({ ...item, status: "undone" }));
      return execution;
    },
    resumeActionExecution: async (executionId) => {
      const execution = actionHistory.find((item) => item.id === executionId);
      if (!execution) throw new Error("浏览器预览中没有找到操作记录");
      return execution;
    },
    rollbackActionExecution: async (executionId) => {
      const execution = actionHistory.find((item) => item.id === executionId);
      if (!execution) throw new Error("浏览器预览中没有找到操作记录");
      execution.status = "undone";
      execution.undoable = false;
      return execution;
    },
    getActionHistory: async () => actionHistory,
    getInterruptedActionRecoveries: async () => [],
    getAutoRules: async () => autoRules,
    saveAutoRule: async (rule) => {
      const index = autoRules.findIndex((item) => item.id === rule.id);
      if (index >= 0) autoRules[index] = rule;
      else autoRules.push(rule);
      return rule;
    },
    deleteAutoRule: async (ruleId) => {
      const index = autoRules.findIndex((item) => item.id === ruleId);
      if (index >= 0) autoRules.splice(index, 1);
    },
    previewAutoRules: async () => [],
    searchWorkspace: async (query) => {
      const normalized = query.toLocaleLowerCase();
      return [
        { id: "desktop:1", title: "ProjectD需求.md", origin: "desktop" as const, category: "document" as const, modifiedAt: now() },
        { id: "portal:preview:项目资料.pdf", title: "项目资料.pdf", origin: "portal" as const, category: "document" as const, modifiedAt: now() }
      ].filter((item) => item.title.toLocaleLowerCase().includes(normalized.replace(/^(in:[^ ]+|ext:[^ ]+)\s*/g, "")) || normalized.startsWith("ext:"));
    },
    openWorkspaceSearchResult: async () => undefined,
    revealWorkspaceSearchResult: async () => undefined,
    copyWorkspaceSearchResultPath: async () => undefined,
    getLatestSuggestion: async () => null,
    dismissSuggestion: async () => undefined,
    getSuggestionDeliveryControls: async () => ({
      snoozedUntil: null,
      mutedUntil: null,
      disabled: false,
      policy: { timeZoneOffsetMinutes: -new Date().getTimezoneOffset(), quietHours: { enabled: true, start: "22:00", end: "08:00" }, dailyBudget: 3, perKind: { "desktop-inbox": { cooldownMs: 21600000, dailyBudget: 2 } } }
    }),
    snoozeSuggestions: async () => undefined,
    setSuggestionsEnabled: async () => undefined,
    updateSuggestionPolicy: async (policy) => ({ snoozedUntil: null, mutedUntil: null, disabled: false, policy }),
    getDiagnosticsReport: async () => ({
      generatedAt: now(),
      app: { version: "0.1.0", platform: "win32", architecture: "x64" },
      health: "healthy",
      counts: { desktopFiles: 4, portals: 0, recentErrors: 0, configuredProviders: 0, schemaVersion: 2, migrationCount: 1 },
      statusCodes: { database: "ok", desktop: "ok", wallpaperHost: "ok", aiProvider: "not-configured" },
      recentErrors: []
    }),
    exportDiagnosticsReport: async () => ({ status: "saved", filename: "ProjectD-diagnostics-preview.json" }),
    getWorkspaceScenes: async () => workspaceScenes,
    saveWorkspaceScene: async (name) => {
      const scene: WorkspaceScene = {
        id: `preview-scene-${Date.now()}`,
        name,
        createdAt: now(),
        updatedAt: now(),
        layoutId: 2,
        wallpaperId: mockSettings.wallpaper.dynamicId,
        performanceMode: memoryState.get("performance_mode") ?? "auto",
        petVisible: mockSettings.pet.isVisible,
        containerLayout: []
      };
      workspaceScenes.unshift(scene);
      return scene;
    },
    applyWorkspaceScene: async (sceneId) => {
      const scene = workspaceScenes.find((item) => item.id === sceneId);
      if (!scene) throw new Error("浏览器预览中没有找到场景");
      if (scene.wallpaperId) mockSettings.wallpaper.dynamicId = scene.wallpaperId;
      mockSettings.pet.isVisible = scene.petVisible;
      memoryState.set("performance_mode", scene.performanceMode);
      notifySettingsUpdated();
      return scene;
    },
    chooseFolderPortal: async () => "browser-preview/资料库",
    addFolderPortal: async (folderPath, name) => {
      const portal: PortalConfig = {
        id: `preview-portal-${Date.now()}`,
        name,
        path: folderPath,
        realPath: folderPath,
        isEnabled: true,
        createdAt: now(),
        updatedAt: now()
      };
      folderPortals.unshift(portal);
      return portal;
    },
    removeFolderPortal: async (portalId) => {
      const index = folderPortals.findIndex((portal) => portal.id === portalId);
      if (index >= 0) folderPortals.splice(index, 1);
    },
    getFolderPortals: async () => folderPortals,
    getFolderPortalResources: async (portalId) => {
      const portal = folderPortals.find((item) => item.id === portalId);
      const resources: PortalResource[] = portal ? [{
        portalId,
        name: "项目资料.pdf",
        relativePath: "项目资料.pdf",
        fullPath: `${portal.path}/项目资料.pdf`,
        category: "document",
        isDirectory: false,
        sizeBytes: 2048,
        modifiedAt: now(),
        status: "ready"
      }] : [];
      return resources;
    },
    openFolderPortalResource: async () => undefined,
    getDatabaseStatus: async () => ({ path: "browser-preview", initialized: true, createdNow: false, containerCount: 2, layoutCount: 1 }),
    getContainers: async () => [],
    updateContainerPosition: async () => undefined,
    updateContainerAccent: async () => undefined,
    getLayouts: async () => [
      { id: 1, name: "舒展 2 列", columns: 2, isActive: false },
      { id: 2, name: "默认 4 列", columns: 4, isActive: true },
      { id: 3, name: "紧凑 6 列", columns: 6, isActive: false },
      { id: 4, name: "高密 8 列", columns: 8, isActive: false }
    ],
    applyLayout: async () => undefined,
    getFilePreview: async (fileId) => ({ type: "text", content: "浏览器预览模式：文件内容预览仅在 Electron 中可用。", filename: `file-${fileId}`, sizeLabel: "—", modifiedAt: "—" }),
    getSettings: async () => cloneSettings(),
    updateSettings: async (patch) => {
      if (patch.wallpaper) {
        mockSettings.wallpaper = { ...mockSettings.wallpaper, ...patch.wallpaper };
      }
      if (patch.weather) {
        const { apiKey: _apiKey, ...weatherPatch } = patch.weather;
        mockSettings.weather = { ...mockSettings.weather, ...weatherPatch };
      }
      if (patch.pet) {
        mockSettings.pet = { ...mockSettings.pet, ...patch.pet };
      }
      if (patch.ai) {
        const { apiKey: _apiKey, ...aiPatch } = patch.ai;
        mockSettings.ai = { ...mockSettings.ai, ...aiPatch };
      }
      if (patch.appState) {
        for (const [key, value] of Object.entries(patch.appState)) {
          memoryState.set(key, value);
        }
      }
      notifySettingsUpdated();
      return cloneSettings();
    },
    getWallpaperLibrary: async () => WALLPAPER_LIBRARY,
    applyWallpaper: async (wallpaperId) => {
      const wallpaper = WALLPAPER_LIBRARY.find((item) => item.id === wallpaperId);
      if (!wallpaper) {
        throw new Error("Wallpaper was not found in the local library");
      }
      mockSettings.wallpaper = {
        ...mockSettings.wallpaper,
        currentStyle: "user",
        dynamicId: wallpaper.id,
        isDynamic: true,
        currentIndex: mockSettings.wallpaper.currentIndex + 1
      };
      notifySettingsUpdated();
      return cloneSettings();
    },
    getWallpaperDisplays: async () => [{
      id: "preview-display",
      label: "预览显示器",
      isPrimary: true,
      bounds: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
      scaleFactor: window.devicePixelRatio,
      wallpaperId: mockDisplayWallpaperId
    }],
    assignWallpaperToDisplay: async (_displayId, wallpaperId) => {
      mockDisplayWallpaperId = wallpaperId;
      notifySettingsUpdated();
      return [{
        id: "preview-display",
        label: "预览显示器",
        isPrimary: true,
        bounds: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
        scaleFactor: window.devicePixelRatio,
        wallpaperId: mockDisplayWallpaperId
      }];
    },
    getCurrentWeather: async () => ({
      mode: "manual",
      condition: "clear",
      city: null,
      temperatureC: null,
      humidity: null,
      windSpeed: null,
      fetchedAt: now(),
      source: "manual"
    }),
    sendChatMessage: async (content) => {
      const userMessage: ChatMessage = { id: chatHistory.length + 1, role: "user", content, createdAt: now() };
      const requestedWallpaper = findWallpaperByInput(content);
      const wallpaperIntent = content.includes("壁纸") || content.includes("背景") || (requestedWallpaper && /换|切|改|用|设置/.test(content));
      let assistantContent = "浏览器预览模式：真实 AI 通道在 Electron 中运行。";
      if (wallpaperIntent) {
        const wallpaper = requestedWallpaper ?? WALLPAPER_LIBRARY.find((item) => item.id === nextWallpaperId(mockSettings.wallpaper.dynamicId));
        if (wallpaper) {
          mockSettings.wallpaper = {
            ...mockSettings.wallpaper,
            currentStyle: "user",
            dynamicId: wallpaper.id,
            isDynamic: true,
            currentIndex: mockSettings.wallpaper.currentIndex + 1
          };
          notifySettingsUpdated();
          assistantContent = `浏览器预览模式：已模拟切换为「${wallpaper.label}」。`;
        }
      }
      const assistantMessage: ChatMessage = {
        id: chatHistory.length + 2,
        role: "assistant",
        content: assistantContent,
        createdAt: now()
      };
      chatHistory.push(userMessage, assistantMessage);
      return { message: assistantMessage, provider: "browser-preview", fallback: true };
    },
    getChatHistory: async () => chatHistory,
    clearChatHistory: async () => {
      chatHistory.splice(0, chatHistory.length);
    },
    exportAllData: async () => ({ cancelled: false, filename: "preview.json" }),
    resetAllData: async () => {},
    getPrivacyNetworkState: async () => ({ paused: memoryState.get("privacy_network_paused") === "true", changedAt: null }),
    setPrivacyNetworkPaused: async (paused) => {
      memoryState.set("privacy_network_paused", paused ? "true" : "false");
      return { paused, changedAt: now() };
    },
    getRecoverySystemStatus: async () => ({
      checkedAt: now(),
      explorer: { status: "ready", detail: "Explorer 正在运行 · 浏览器预览" },
      wallpaperHost: { status: "ready", detail: "壁纸宿主已连接 · Progman" },
      shortcut: { status: "ready", detail: "工作区快捷键可用 · Control+Alt+Space" },
      runtimeRecovery: { status: "ready", detail: "display-metrics-changed · 浏览器预览" }
    }),
    getState: async (key) => memoryState.get(key) ?? null,
    setState: async (key, value) => {
      memoryState.set(key, value);
    },
    getPetWindowBounds: async () => ({ x: 36, y: 36, width: 250, height: 250 }),
    movePetWindow: async () => ({ x: 36, y: 36, width: 250, height: 250 }),
    resetPetWindow: async () => ({ x: 36, y: 36, width: 250, height: 250 }),
    setPetInteractive: async () => undefined,
    showPetContextMenu: async () => undefined,
    showPet: async () => undefined,
    hidePet: async () => undefined,
    openLogs: async () => undefined,
    openSettings: async () => undefined,
    setPeekShortcut: async () => ({ success: true, accelerator: "Control+Alt+Space" }),
    getUpdateStatus: async () => ({ ...mockUpdateStatus }),
    setUpdateChannel: async (channel) => {
      mockUpdateStatus = { ...mockUpdateStatus, channel, message: channel === "beta" ? "已切换到灰度体验通道" : "已切换到稳定通道" };
      for (const listener of updateListeners) listener({ ...mockUpdateStatus });
      return { ...mockUpdateStatus };
    },
    checkForUpdates: async () => ({ ...mockUpdateStatus }),
    downloadUpdate: async () => ({ ...mockUpdateStatus }),
    installDownloadedUpdate: async () => undefined,
    getRuntimeState: async () => ({
      paused: false,
      reasons: [],
      manual: false,
      externalFullscreen: false,
      screenLocked: false,
      suspended: false,
      onBattery: false,
      batteryLevel: null,
      thermalState: "nominal",
      configuredMode: "auto",
      effectiveProfile: "balanced",
      changedAt: now()
    }),
    setRuntimeManualPaused: async (paused) => ({
      paused,
      reasons: paused ? ["manual"] : [],
      manual: paused,
      externalFullscreen: false,
      screenLocked: false,
      suspended: false,
      onBattery: false,
      batteryLevel: null,
      thermalState: "nominal",
      configuredMode: "auto",
      effectiveProfile: "balanced",
      changedAt: now()
    }),
    getRuntimeMetrics: async () => ({
      generatedAt: now(), sampleCount: 0, windowMinutes: 0, cpuMedianPercent: 0,
      cpuP95Percent: 0, peakWorkingSetBytes: 0, memoryGrowthPercent: 0,
      pausedSampleCount: 0, samples: []
    }),
    pinSearchResultToScene: async () => undefined,
    addSearchResultToPortal: async () => null,
    resolveSearchResultPath: async (resultId: string) => resultId,
    onMenuCommand: () => () => undefined,
    onDesktopFilesUpdated: () => () => undefined,
    onPortalsUpdated: () => () => undefined,
    onSuggestionCreated: () => () => undefined,
    onFocusWorkspaceSearch: () => () => undefined,
    onSettingsUpdated: (handler) => {
      settingsListeners.add(handler);
      return () => {
        settingsListeners.delete(handler);
      };
    },
    onUpdateStatusChanged: (handler) => {
      updateListeners.add(handler);
      return () => {
        updateListeners.delete(handler);
      };
    },
    onRuntimeStateChanged: () => () => undefined
  };

  window.projectD = mockApi;
}

createApp(App).mount("#app");

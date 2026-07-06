import { createApp } from "vue";
import App from "./App.vue";
import "./styles.css";
import type { ChatMessage, ProjectDApi } from "../shared/types";

if (!window.projectD) {
  const memoryState = new Map<string, string>();
  const chatHistory: ChatMessage[] = [];
  const now = () => new Date().toISOString();
  const mockApi: ProjectDApi = {
    getAppInfo: async () => ({ name: "Project D", version: "0.1.0", platform: "win32", isPackaged: false }),
    showMain: async () => undefined,
    getDesktopStatus: async () => ({ mode: "idle", lastChangedAt: now(), message: "浏览器预览模式" }),
    activateDesktop: async () => ({ mode: "safe-mode", lastChangedAt: now(), message: "浏览器预览不会接管真实桌面" }),
    deactivateDesktop: async () => ({ mode: "idle", lastChangedAt: now(), message: "浏览器预览模式" }),
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
        files: []
      }
    ],
    openFile: async () => undefined,
    openFileLocation: async () => undefined,
    moveFileToContainer: async () => undefined,
    renameFileAlias: async () => undefined,
    hideFile: async () => undefined,
    getDatabaseStatus: async () => ({ path: "browser-preview", initialized: true, createdNow: false, containerCount: 2, layoutCount: 1 }),
    getContainers: async () => [],
    updateContainerPosition: async () => undefined,
    getLayouts: async () => [{ id: 1, name: "默认 4 列布局", columns: 4, isActive: true }],
    applyLayout: async () => undefined,
    getFilePreview: async (fileId) => ({ type: "text", content: "浏览器预览模式：文件内容预览仅在 Electron 中可用。", filename: `file-${fileId}`, sizeLabel: "—", modifiedAt: "—" }),
    getSettings: async () => ({
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
    }),
    updateSettings: async (patch) => {
      if (patch.appState) {
        for (const [key, value] of Object.entries(patch.appState)) {
          memoryState.set(key, value);
        }
      }
      return mockApi.getSettings();
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
      const assistantMessage: ChatMessage = {
        id: chatHistory.length + 2,
        role: "assistant",
        content: "浏览器预览模式：真实 AI 通道在 Electron 中运行。",
        createdAt: now()
      };
      chatHistory.push(userMessage, assistantMessage);
      return { message: assistantMessage, provider: "browser-preview", fallback: true };
    },
    getChatHistory: async () => chatHistory,
    getState: async (key) => memoryState.get(key) ?? null,
    setState: async (key, value) => {
      memoryState.set(key, value);
    },
    getPetWindowBounds: async () => ({ x: 36, y: 36, width: 220, height: 190 }),
    movePetWindow: async () => ({ x: 36, y: 36, width: 220, height: 190 }),
    resetPetWindow: async () => ({ x: 36, y: 36, width: 220, height: 190 }),
    showPet: async () => undefined,
    hidePet: async () => undefined,
    openLogs: async () => undefined,
    openSettings: async () => undefined,
    onMenuCommand: () => () => undefined,
    onDesktopFilesUpdated: () => () => undefined
  };

  window.projectD = mockApi;
}

createApp(App).mount("#app");

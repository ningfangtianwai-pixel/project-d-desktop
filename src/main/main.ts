import { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, shell, Tray } from "electron";
import fs from "node:fs";
import path from "node:path";
import { DatabaseService } from "./database.js";
import { DesktopController } from "./desktop-controller.js";
import { FileScanner } from "./file-scanner.js";
import { AppLogger } from "./logger.js";
import { AiService } from "./ai-service.js";
import { WeatherService } from "./weather-service.js";
import { WallpaperHost, type WallpaperAttachResult } from "./wallpaper-host.js";
import { IPC_CHANNELS, MENU_COMMANDS, type MenuCommand } from "../shared/ipc.js";
import type { AppInfo, ChatResponse, CurrentWeather, DesktopStatus, PetWindowBounds, SettingsPatch, SettingsSnapshot } from "../shared/types.js";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let petWindow: BrowserWindow | null = null;
let wallpaperWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let logger: AppLogger | null = null;
let database: DatabaseService | null = null;
let fileScanner: FileScanner | null = null;
let desktopController: DesktopController | null = null;
let wallpaperHost: WallpaperHost | null = null;
let weatherService: WeatherService | null = null;
let aiService: AiService | null = null;
let wallpaperRepairTimer: NodeJS.Timeout | null = null;
let wallpaperRepairInFlight = false;
let desktopStatus: DesktopStatus = {
  mode: "idle",
  lastChangedAt: new Date().toISOString()
};

function writeBootstrapLog(message: string, data?: Record<string, unknown>): void {
  const line = `${JSON.stringify({ at: new Date().toISOString(), message, data: data ?? null })}\n`;
  try {
    const logDir = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, "bootstrap.log"), line);
  } catch {
    try {
      const fallbackRoot = process.env.APPDATA ? path.join(process.env.APPDATA, "Project D", "logs") : path.join(process.cwd(), "logs");
      fs.mkdirSync(fallbackRoot, { recursive: true });
      fs.appendFileSync(path.join(fallbackRoot, "bootstrap.log"), line);
    } catch {
      // Bootstrap logging must never affect app startup.
    }
  }
}

function rendererUrl(route = ""): string {
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    return `${process.env.VITE_DEV_SERVER_URL}${route}`;
  }

  const rendererPath = path.join(__dirname, "../renderer/index.html");
  return `file://${rendererPath}${route}`;
}

function preloadPath(): string {
  return path.join(__dirname, "../preload/preload.js");
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 920,
    minHeight: 620,
    title: "Project D",
    show: false,
    backgroundColor: "#101114",
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.loadURL(rendererUrl());

  window.once("ready-to-show", () => {
    window.show();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  window.on("closed", () => {
    mainWindow = null;
  });

  return window;
}

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
  sendMenuCommand(MENU_COMMANDS.SHOW_MAIN);
}

function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }

  const window = new BrowserWindow({
    width: 820,
    height: 620,
    minWidth: 680,
    minHeight: 520,
    title: "Project D Settings",
    show: false,
    backgroundColor: "#f5f3ef",
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.loadURL(rendererUrl("#/settings"));

  window.once("ready-to-show", () => {
    window.show();
  });

  window.on("closed", () => {
    settingsWindow = null;
  });

  settingsWindow = window;
  return window;
}

function createOverlayWindow(safeMode: boolean): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.show();
    overlayWindow.focus();
    return overlayWindow;
  }

  const display = screen.getPrimaryDisplay();
  const bounds = safeMode ? display.workArea : display.bounds;
  const window = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 900,
    minHeight: 600,
    title: safeMode ? "Project D Safe Mode" : "Project D Desktop",
    frame: safeMode,
    fullscreen: !safeMode,
    skipTaskbar: !safeMode,
    show: false,
    backgroundColor: "#101114",
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.loadURL(rendererUrl("#/overlay"));

  window.once("ready-to-show", () => {
    window.show();
    window.focus();
    if (!safeMode) {
      window.setAlwaysOnTop(true, "normal");
      setTimeout(() => {
        if (!window.isDestroyed()) {
          window.setAlwaysOnTop(false);
        }
      }, 800);
    }
  });

  window.on("closed", () => {
    overlayWindow = null;
    logger?.info("desktop-state", "overlay window destroyed");
  });

  overlayWindow = window;
  logger?.info("desktop-state", "overlay window created", { safeMode, bounds });
  return window;
}

function createWallpaperWindow(): BrowserWindow {
  if (wallpaperWindow && !wallpaperWindow.isDestroyed()) {
    wallpaperWindow.showInactive();
    return wallpaperWindow;
  }

  const display = screen.getPrimaryDisplay();
  const bounds = display.bounds;
  const window = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    title: "Project D Wallpaper",
    frame: false,
    transparent: false,
    focusable: false,
    fullscreenable: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    show: false,
    paintWhenInitiallyHidden: true,
    backgroundColor: "#101114",
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.loadURL(rendererUrl("#/wallpaper"));

  window.webContents.once("did-finish-load", () => {
    void (async () => {
      const result = await attachWallpaperWindow(window);
      if (result.attached) {
        window.setIgnoreMouseEvents(true, { forward: true });
        window.showInactive();
        startWallpaperRepairTimer();
        database?.setAppState("wallpaper_host", result.parentKind ?? "attached");
        logger?.info("app", "wallpaper window shown on desktop host", result);
        return;
      }

      window.hide();
      database?.setAppState("wallpaper_host", "fallback-window-hidden");
      logger?.warn("app", "wallpaper window hidden after attach failure", result);
    })();
  });

  window.on("closed", () => {
    wallpaperWindow = null;
    logger?.info("app", "wallpaper window destroyed");
  });

  wallpaperWindow = window;
  logger?.info("app", "wallpaper window created", bounds);
  return window;
}

async function attachWallpaperWindow(window: BrowserWindow): Promise<WallpaperAttachResult> {
  if (!wallpaperHost) {
    return {
      attached: false,
      childHwnd: "0",
      error: "Wallpaper host is not initialized"
    };
  }

  return wallpaperHost.attachToDesktop(window);
}

function defaultPetBounds(): PetWindowBounds {
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  return {
    x: workArea.x + 36,
    y: workArea.y + 36,
    width: 220,
    height: 190
  };
}

function normalizePetBounds(bounds: PetWindowBounds): PetWindowBounds {
  const display = screen.getDisplayMatching(bounds);
  const workArea = display.workArea;
  const width = Math.max(180, Math.min(280, Math.round(bounds.width)));
  const height = Math.max(160, Math.min(260, Math.round(bounds.height)));
  const x = Math.max(workArea.x, Math.min(Math.round(bounds.x), workArea.x + workArea.width - width));
  const y = Math.max(workArea.y, Math.min(Math.round(bounds.y), workArea.y + workArea.height - height));
  return { x, y, width, height };
}

function readPetBounds(): PetWindowBounds {
  const saved = database?.getAppState("pet_window_bounds");
  if (!saved) {
    return defaultPetBounds();
  }

  try {
    const parsed = JSON.parse(saved) as PetWindowBounds;
    if (
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y) &&
      Number.isFinite(parsed.width) &&
      Number.isFinite(parsed.height)
    ) {
      return normalizePetBounds(parsed);
    }
  } catch {
    logger?.warn("app", "failed to parse saved pet window bounds");
  }

  return defaultPetBounds();
}

function savePetBounds(bounds: PetWindowBounds): void {
  const normalized = normalizePetBounds(bounds);
  database?.setAppState("pet_window_bounds", JSON.stringify(normalized));
}

function currentPetBounds(): PetWindowBounds {
  if (!petWindow || petWindow.isDestroyed()) {
    return readPetBounds();
  }

  return normalizePetBounds(petWindow.getBounds());
}

function createPetWindow(): BrowserWindow {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.show();
    petWindow.setAlwaysOnTop(true, "screen-saver");
    return petWindow;
  }

  const bounds = readPetBounds();
  const window = new BrowserWindow({
    ...bounds,
    title: "Project D Pet",
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    paintWhenInitiallyHidden: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.loadURL(rendererUrl("#/pet"));

  window.webContents.once("did-finish-load", () => {
    window.showInactive();
    window.setAlwaysOnTop(true, "screen-saver");
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    logger?.info("app", "pet window shown", window.getBounds());
  });

  window.on("move", () => {
    savePetBounds(window.getBounds());
  });

  window.on("closed", () => {
    petWindow = null;
    logger?.info("app", "pet window destroyed");
  });

  petWindow = window;
  logger?.info("app", "pet window created", bounds);
  return window;
}

function movePetWindow(deltaX: number, deltaY: number): PetWindowBounds {
  const window = createPetWindow();
  const current = window.getBounds();
  const next = normalizePetBounds({
    ...current,
    x: current.x + Math.round(deltaX),
    y: current.y + Math.round(deltaY)
  });
  window.setBounds(next, false);
  savePetBounds(next);
  window.setAlwaysOnTop(true, "screen-saver");
  return next;
}

function resetPetWindow(): PetWindowBounds {
  const window = createPetWindow();
  const next = defaultPetBounds();
  window.setBounds(next, false);
  savePetBounds(next);
  window.setAlwaysOnTop(true, "screen-saver");
  return next;
}

function closeOverlayWindow(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    overlayWindow = null;
    return;
  }

  overlayWindow.close();
  overlayWindow = null;
}

function closePetWindow(): void {
  if (!petWindow || petWindow.isDestroyed()) {
    petWindow = null;
    return;
  }

  petWindow.close();
  petWindow = null;
}

function closeWallpaperWindow(): void {
  stopWallpaperRepairTimer();
  if (!wallpaperWindow || wallpaperWindow.isDestroyed()) {
    wallpaperWindow = null;
    return;
  }

  wallpaperWindow.close();
  wallpaperWindow = null;
}

function startWallpaperRepairTimer(): void {
  if (wallpaperRepairTimer) {
    return;
  }

  wallpaperRepairTimer = setInterval(() => {
    void repairWallpaperHost();
  }, 30_000);
  wallpaperRepairTimer.unref?.();
}

function stopWallpaperRepairTimer(): void {
  if (!wallpaperRepairTimer) {
    return;
  }

  clearInterval(wallpaperRepairTimer);
  wallpaperRepairTimer = null;
}

async function repairWallpaperHost(): Promise<void> {
  if (wallpaperRepairInFlight || !wallpaperWindow || wallpaperWindow.isDestroyed()) {
    return;
  }

  wallpaperRepairInFlight = true;
  try {
    const result = await attachWallpaperWindow(wallpaperWindow);
    if (result.attached) {
      wallpaperWindow.setIgnoreMouseEvents(true, { forward: true });
      database?.setAppState("wallpaper_host", result.parentKind ?? "attached");
      logger?.info("app", "wallpaper host repair completed", result);
    } else {
      logger?.warn("app", "wallpaper host repair skipped", result);
    }
  } finally {
    wallpaperRepairInFlight = false;
  }
}

function syncWindowsFromSettings(settings: SettingsSnapshot): void {
  if (settings.pet.isVisible) {
    createPetWindow();
  } else {
    petWindow?.hide();
  }

  if (settings.wallpaper.isDynamic) {
    createWallpaperWindow();
  } else {
    closeWallpaperWindow();
  }
}

function scheduleDemoAutorun(): void {
  if (process.env.PROJECTD_DEMO_AUTORUN !== "1") {
    return;
  }

  logger?.info("app", "demo autorun scheduled");

  setTimeout(() => {
    void (async () => {
      logger?.info("app", "demo autorun activating");
      desktopStatus = (await desktopController?.activate()) ?? updateDesktopStatus("safe-mode");
      createOverlayWindow(desktopStatus.mode === "safe-mode");

      setTimeout(() => {
        void (async () => {
          logger?.info("app", "demo autorun deactivating");
          desktopStatus = (await desktopController?.deactivate()) ?? updateDesktopStatus("idle");
          closeOverlayWindow();

          if (process.env.PROJECTD_DEMO_EXIT === "1") {
            setTimeout(() => app.quit(), 1500);
          }
        })();
      }, 7000);
    })();
  }, 4500);
}

function sendMenuCommand(command: MenuCommand): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC_CHANNELS.MENU_COMMAND, command);
  }
}

function broadcastDesktopFilesUpdated(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC_CHANNELS.DESKTOP_FILES_UPDATED);
  }
}

function updateDesktopStatus(mode: DesktopStatus["mode"]): DesktopStatus {
  desktopStatus = {
    mode,
    lastChangedAt: new Date().toISOString()
  };
  database?.setAppState("desktop_state", mode);
  database?.setAppState("is_active", mode === "active" ? "true" : "false");
  logger?.info("desktop-state", "desktop status changed", desktopStatus);
  return desktopStatus;
}

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#14161a"/>
      <path d="M16 18h18c9 0 16 6 16 14s-7 14-16 14H16V18z" fill="#8dd8ff"/>
      <path d="M27 27h8c3 0 6 2 6 5s-3 5-6 5h-8V27z" fill="#14161a"/>
    </svg>
  `;

  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

function createTray(): Tray {
  const appTray = new Tray(createTrayIcon());
  appTray.setToolTip("Project D");

  const menu = Menu.buildFromTemplate([
    {
      label: "显示 Project D",
      click: () => {
        if (!mainWindow) {
          mainWindow = createWindow();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
        sendMenuCommand(MENU_COMMANDS.SHOW_MAIN);
      }
    },
    {
      label: "启动整理",
      click: async () => {
        desktopStatus = (await desktopController?.activate()) ?? updateDesktopStatus("safe-mode");
        createOverlayWindow(desktopStatus.mode === "safe-mode");
        mainWindow?.hide();
        sendMenuCommand(MENU_COMMANDS.ACTIVATE_DESKTOP);
      }
    },
    {
      label: "安全归位",
      click: async () => {
        desktopStatus = (await desktopController?.deactivate()) ?? updateDesktopStatus("idle");
        closeOverlayWindow();
        mainWindow?.show();
        sendMenuCommand(MENU_COMMANDS.DEACTIVATE_DESKTOP);
      }
    },
    { type: "separator" },
    {
      label: "启动动态壁纸",
      click: () => {
        createWallpaperWindow();
      }
    },
    {
      label: "关闭动态壁纸",
      click: () => {
        closeWallpaperWindow();
      }
    },
    { type: "separator" },
    {
      label: "显示桌宠",
      click: () => {
        createPetWindow();
      }
    },
    {
      label: "隐藏桌宠",
      click: () => {
        petWindow?.hide();
      }
    },
    {
      label: "复位桌宠位置",
      click: () => {
        resetPetWindow();
      }
    },
    { type: "separator" },
    {
      label: "设置",
      click: () => {
        createSettingsWindow();
        sendMenuCommand(MENU_COMMANDS.OPEN_SETTINGS);
      }
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        sendMenuCommand(MENU_COMMANDS.QUIT);
        app.quit();
      }
    }
  ]);

  appTray.setContextMenu(menu);
  appTray.on("click", () => {
    if (!mainWindow) {
      mainWindow = createWindow();
      return;
    }

    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });

  return appTray;
}

function registerIpc(): void {
  ipcMain.handle(IPC_CHANNELS.APP_INFO, (): AppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    isPackaged: app.isPackaged
  }));

  ipcMain.handle(IPC_CHANNELS.WINDOW_SHOW_MAIN, (): void => {
    showMainWindow();
  });

  ipcMain.handle(IPC_CHANNELS.DESKTOP_STATUS, (): DesktopStatus => desktopController?.getStatus() ?? desktopStatus);

  ipcMain.handle(IPC_CHANNELS.DESKTOP_ACTIVATE, async (): Promise<DesktopStatus> => {
    desktopStatus = (await desktopController?.activate()) ?? updateDesktopStatus("safe-mode");
    createOverlayWindow(desktopStatus.mode === "safe-mode");
    mainWindow?.hide();
    return desktopStatus;
  });

  ipcMain.handle(IPC_CHANNELS.DESKTOP_DEACTIVATE, async (): Promise<DesktopStatus> => {
    desktopStatus = (await desktopController?.deactivate()) ?? updateDesktopStatus("idle");
    closeOverlayWindow();
    mainWindow?.show();
    return desktopStatus;
  });

  ipcMain.handle(IPC_CHANNELS.DESKTOP_SCAN, async () => {
    if (!fileScanner) {
      throw new Error("File scanner is not initialized");
    }
    return fileScanner.scanDesktop();
  });

  ipcMain.handle(IPC_CHANNELS.DESKTOP_GET_FILES, () => database?.getContainersWithFiles() ?? []);

  ipcMain.handle(IPC_CHANNELS.DESKTOP_OPEN_FILE, async (_event, fileId: unknown) => {
    if (typeof fileId !== "number" || !Number.isInteger(fileId) || fileId <= 0) {
      throw new Error("Invalid file id");
    }
    const file = database?.getDesktopFileById(fileId);
    if (!file) {
      throw new Error("File record was not found");
    }
    logger?.info("app", "opening file", { fileId, filename: file.filename });
    await shell.openPath(file.fullPath);
  });

  ipcMain.handle(IPC_CHANNELS.DESKTOP_OPEN_FILE_LOCATION, (_event, fileId: unknown) => {
    if (typeof fileId !== "number" || !Number.isInteger(fileId) || fileId <= 0) {
      throw new Error("Invalid file id");
    }
    const file = database?.getDesktopFileById(fileId);
    if (!file) {
      throw new Error("File record was not found");
    }
    shell.showItemInFolder(file.fullPath);
  });

  ipcMain.handle(IPC_CHANNELS.DESKTOP_MOVE_FILE, (_event, fileId: unknown, containerId: unknown) => {
    if (typeof fileId !== "number" || !Number.isInteger(fileId) || fileId <= 0) {
      throw new Error("Invalid file id");
    }
    if (typeof containerId !== "number" || !Number.isInteger(containerId) || containerId <= 0) {
      throw new Error("Invalid container id");
    }
    database?.moveFileToContainer(fileId, containerId);
    logger?.info("app", "file moved to virtual container", { fileId, containerId });
    broadcastDesktopFilesUpdated();
  });

  ipcMain.handle(IPC_CHANNELS.DESKTOP_RENAME_ALIAS, (_event, fileId: unknown, displayName: unknown) => {
    if (typeof fileId !== "number" || !Number.isInteger(fileId) || fileId <= 0) {
      throw new Error("Invalid file id");
    }
    if (typeof displayName !== "string" || displayName.length > 120) {
      throw new Error("Invalid display name");
    }
    database?.renameFileAlias(fileId, displayName);
    logger?.info("app", "file display alias changed", { fileId });
    broadcastDesktopFilesUpdated();
  });

  ipcMain.handle(IPC_CHANNELS.DESKTOP_HIDE_FILE, (_event, fileId: unknown) => {
    if (typeof fileId !== "number" || !Number.isInteger(fileId) || fileId <= 0) {
      throw new Error("Invalid file id");
    }
    database?.hideFile(fileId);
    logger?.info("app", "file hidden from Project D", { fileId });
    broadcastDesktopFilesUpdated();
  });

  ipcMain.handle(IPC_CHANNELS.DATABASE_STATUS, () => database?.getStatus());

  ipcMain.handle(IPC_CHANNELS.CONTAINERS_GET_ALL, () => database?.getContainers() ?? []);

  ipcMain.handle(IPC_CHANNELS.CONTAINERS_UPDATE_POSITION, (_event, containerId: unknown, x: unknown, y: unknown, width: unknown, height: unknown) => {
    if (typeof containerId !== "number" || !Number.isInteger(containerId) || containerId <= 0) throw new Error("Invalid container id");
    if (typeof x !== "number" || !Number.isFinite(x)) throw new Error("Invalid x");
    if (typeof y !== "number" || !Number.isFinite(y)) throw new Error("Invalid y");
    if (typeof width !== "number" || !Number.isFinite(width)) throw new Error("Invalid width");
    if (typeof height !== "number" || !Number.isFinite(height)) throw new Error("Invalid height");
    database?.updateContainerPosition(containerId, x, y, width, height);
  });

  ipcMain.handle(IPC_CHANNELS.LAYOUTS_GET_ALL, () => database?.getLayouts() ?? []);

  ipcMain.handle(IPC_CHANNELS.LAYOUTS_APPLY, (_event, layoutId: unknown) => {
    if (typeof layoutId !== "number" || !Number.isInteger(layoutId) || layoutId <= 0) throw new Error("Invalid layout id");
    database?.applyLayout(layoutId);
  });

  ipcMain.handle(IPC_CHANNELS.PREVIEW_FILE, async (_event, fileId: unknown) => {
    if (typeof fileId !== "number" || !Number.isInteger(fileId) || fileId <= 0) throw new Error("Invalid file id");
    const file = database?.getDesktopFileById(fileId);
    if (!file) throw new Error("File not found");
    const fs = await import("node:fs/promises");
    const previewableExtensions = new Set([".txt", ".md", ".csv", ".json", ".xml", ".yml", ".yaml", ".log", ".ini", ".cfg", ".py", ".js", ".ts", ".html", ".css", ".sh", ".bat", ".ps1", ".env", ".gitignore"]);
    const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"]);
    const ext = file.extension?.toLowerCase() ?? "";
    const sizeLabel = file.sizeBytes >= 1_000_000 ? `${(file.sizeBytes / 1_000_000).toFixed(1)} MB` : file.sizeBytes >= 1_000 ? `${(file.sizeBytes / 1_000).toFixed(0)} KB` : `${file.sizeBytes} B`;
    const modifiedAt = file.modifiedAt ? new Date(file.modifiedAt).toLocaleString() : "";

    if (previewableExtensions.has(ext)) {
      const content = await fs.readFile(file.fullPath, "utf8");
      return { type: "text", content: content.slice(0, 4000), filename: file.filename, sizeLabel, modifiedAt };
    }
    if (imageExtensions.has(ext)) {
      const buffer = await fs.readFile(file.fullPath);
      const base64 = buffer.toString("base64");
      const mime = ext === ".svg" ? "image/svg+xml" : `image/${ext.replace(".", "")}`;
      return { type: "image", content: `data:${mime};base64,${base64}`, filename: file.filename, sizeLabel, modifiedAt };
    }
    return { type: "unsupported", content: "该文件类型暂不支持预览", filename: file.filename, sizeLabel, modifiedAt };
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, () => database?.getSettings());

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, (_event, patch: unknown): SettingsSnapshot => {
    if (!database || typeof patch !== "object" || patch === null || Array.isArray(patch)) {
      throw new Error("Invalid settings patch");
    }

    const settings = database.updateSettings(patch as SettingsPatch);
    syncWindowsFromSettings(settings);
    return settings;
  });

  ipcMain.handle(IPC_CHANNELS.WEATHER_GET_CURRENT, async (): Promise<CurrentWeather> => {
    if (!weatherService) {
      throw new Error("Weather service is not initialized");
    }
    return weatherService.getCurrentWeather();
  });

  ipcMain.handle(IPC_CHANNELS.AI_CHAT_SEND, async (_event, content: unknown): Promise<ChatResponse> => {
    if (!aiService) {
      throw new Error("AI service is not initialized");
    }
    if (typeof content !== "string") {
      throw new Error("Invalid chat message");
    }
    return aiService.sendMessage(content);
  });

  ipcMain.handle(IPC_CHANNELS.AI_CHAT_HISTORY, () => {
    if (!aiService) {
      throw new Error("AI service is not initialized");
    }
    return aiService.getHistory();
  });

  ipcMain.handle(IPC_CHANNELS.STATE_GET, (_event, key: unknown) => {
    if (typeof key !== "string" || key.length > 80) {
      throw new Error("Invalid app state key");
    }
    return database?.getAppState(key) ?? null;
  });

  ipcMain.handle(IPC_CHANNELS.STATE_SET, (_event, key: unknown, value: unknown) => {
    if (typeof key !== "string" || key.length > 80) {
      throw new Error("Invalid app state key");
    }
    if (typeof value !== "string" || value.length > 10_000) {
      throw new Error("Invalid app state value");
    }
    database?.setAppState(key, value);
  });

  ipcMain.handle(IPC_CHANNELS.PET_GET_WINDOW_BOUNDS, (): PetWindowBounds => currentPetBounds());

  ipcMain.handle(IPC_CHANNELS.PET_MOVE_WINDOW, (_event, deltaX: unknown, deltaY: unknown): PetWindowBounds => {
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
      throw new Error("Invalid pet movement delta");
    }

    return movePetWindow(Number(deltaX), Number(deltaY));
  });

  ipcMain.handle(IPC_CHANNELS.PET_RESET_WINDOW, (): PetWindowBounds => resetPetWindow());

  ipcMain.handle(IPC_CHANNELS.PET_SHOW, (): void => {
    createPetWindow();
  });

  ipcMain.handle(IPC_CHANNELS.PET_HIDE, (): void => {
    petWindow?.hide();
  });

  ipcMain.handle(IPC_CHANNELS.LOGS_OPEN, async () => {
    await logger?.openDirectory();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_OPEN_SETTINGS, () => {
    createSettingsWindow();
  });
}

async function initializeCoreServices(): Promise<void> {
  logger = new AppLogger();
  logger.info("app", "application starting", {
    version: app.getVersion(),
    platform: process.platform,
    userData: app.getPath("userData")
  });

  database = new DatabaseService(logger);
  const status = await database.initialize();
  wallpaperHost = new WallpaperHost(logger);
  weatherService = new WeatherService(database, logger);
  aiService = new AiService(database, weatherService, logger);
  desktopController = new DesktopController(database, logger);
  desktopController.initialize();
  desktopStatus = await desktopController.bootRecoveryCheck();
  fileScanner = new FileScanner(database, logger);

  logger.info("app", "core services ready", status);

  try {
    await fileScanner.scanDesktop();
    await fileScanner.startWatching(() => {
      broadcastDesktopFilesUpdated();
    });
  } catch (error) {
    logger.error("error", "initial desktop scan failed", {
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

app.setName("Project D");
writeBootstrapLog("main module loaded", { isPackaged: app.isPackaged, argv: process.argv.slice(0, 3) });

const singleInstanceLock = app.requestSingleInstanceLock();
writeBootstrapLog("single instance lock result", { locked: singleInstanceLock });

if (!singleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app
    .whenReady()
    .then(async () => {
      writeBootstrapLog("app ready");
      await initializeCoreServices();
      registerIpc();
      tray = createTray();
      const startupSettings = database?.getSettings();
      if (startupSettings?.wallpaper.isDynamic) {
        createWallpaperWindow();
      }
      mainWindow = createWindow();
      if (startupSettings?.pet.isVisible) {
        createPetWindow();
      }
      scheduleDemoAutorun();
    })
    .catch((error: unknown) => {
      logger?.error("error", "failed to initialize Project D", {
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    });
}

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    mainWindow = null;
  }
});

app.on("before-quit", () => {
  logger?.info("app", "application quitting");
  void fileScanner?.stopWatching();
  closeOverlayWindow();
  closeWallpaperWindow();
  closePetWindow();
  database?.close();
  tray?.destroy();
  tray = null;
});

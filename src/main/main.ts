import { app, BrowserWindow, dialog, globalShortcut, Menu, nativeImage, powerMonitor, screen, shell, Tray } from "electron";
import type { IpcMainInvokeEvent, OpenDialogOptions } from "electron";
import { autoUpdater } from "electron-updater";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseService } from "./database.js";
import { DesktopController } from "./desktop-controller.js";
import { FileScanner } from "./file-scanner.js";
import { AppLogger } from "./logger.js";
import { AiService } from "./ai-service.js";
import { WeatherService } from "./weather-service.js";
import { WallpaperHost, type WallpaperAttachResult } from "./wallpaper-host.js";
import { presentWallpaperWindow, WallpaperAttachQueue, WallpaperHostSupervisor, retryWallpaperAttach } from "./wallpaper-supervisor.js";
import { createPetMenuTemplate } from "./pet-menu.js";
import { ActionEngine } from "./actions/action-engine.js";
import { SceneService } from "./scenes/scene-service.js";
import { PortalService } from "./portals/portal-service.js";
import { PortalWatcher } from "./portals/portal-watcher.js";
import { createAuthorizedSearchPortal } from "./portals/portal-authorization.js";
import { SearchService } from "./search/search-service.js";
import { SearchResultRegistry } from "./search/search-result-registry.js";
import { isEverythingAvailable, searchEverything } from "./search/everything-provider.js";
import { searchWindowsSearch } from "./search/windows-search-provider.js";
import { SuggestionEngine } from "./suggestions/suggestion-engine.js";
import { DiagnosticsService } from "./diagnostics/diagnostics-service.js";
import { readRecentLogMetadata } from "./diagnostics/diagnostics-source.js";
import { SystemPresenceMonitor } from "./system-presence.js";
import { DesktopRuntimeRecovery } from "./desktop-runtime-recovery.js";
import { ExplorerProcessMonitor, probeWindowsExplorerProcess } from "./explorer-monitor.js";
import { getPrivacyNetworkState, setPrivacyNetworkPaused } from "./privacy-network.js";
import { inspectInterruptedAction } from "./actions/action-recovery.js";
import { runWithDeadline } from "./shutdown-deadline.js";
import { isMostlyWhiteBitmap, WindowResilienceSupervisor, type RendererRecoveryEvent, type WindowRole } from "./window-resilience.js";
import { UpdateService, validateUpdateFeedUrl } from "./update-service.js";
import { PauseArbiter } from "./pause-arbiter.js";
import { RuntimeMetricsService } from "./runtime-metrics.js";
import { CleanDesktopEscapeGuard } from "./clean-desktop-escape.js";
import { defaultPetWindowForWorkArea, fitPetWindowToWorkArea } from "./pet-window-layout.js";
import { validateSettingsPatch } from "./settings-patch-validator.js";
import { OperationsControlService } from "./operations/operations-control.js";
import { OperationsTelemetryService } from "./operations/operations-telemetry.js";
import { IPC_CHANNELS, MENU_COMMANDS, type MenuCommand } from "../shared/ipc.js";
import { registerAllIpcHandlers, type ServiceDeps } from "./ipc/register-all.js";
import { WALLPAPER_LIBRARY } from "../shared/wallpaper-library.js";
import type { ActionExecution, DesktopStatus, InterruptedActionRecovery, PetWindowBounds, PrivacyNetworkState, RecoveryHealthCode, RecoverySystemStatus, SettingsPatch, SettingsSnapshot, SuggestionDeliveryControls, SuggestionPolicy, SuggestionRecord, SupportDiagnosticsReport, WallpaperDisplayInfo, WorkspaceSearchResult } from "../shared/types.js";
import type { UpdateStatus } from "../shared/update.js";
import type { PerformanceMode, RuntimePauseSnapshot, ThermalState } from "../shared/runtime.js";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const SAFE_RENDERER_ARG = "--projectd-safe-renderer";
const START_HIDDEN_ARG = "--projectd-start-hidden";
const safeRendererMode = process.argv.includes(SAFE_RENDERER_ARG);
const startHidden = process.argv.includes(START_HIDDEN_ARG);
if (safeRendererMode) app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let petWindow: BrowserWindow | null = null;
let wallpaperWindow: BrowserWindow | null = null;
const wallpaperWindows = new Map<string, BrowserWindow>();
const wallpaperStartupAttachments = new Map<string, {
  window: BrowserWindow;
  settled: boolean;
  attached: boolean;
  renderReady: boolean;
  promise: Promise<WallpaperAttachResult>;
  resolve: (result: WallpaperAttachResult) => void;
}>();
let tray: Tray | null = null;
let logger: AppLogger | null = null;
let database: DatabaseService | null = null;
let fileScanner: FileScanner | null = null;
let desktopController: DesktopController | null = null;
let wallpaperHost: WallpaperHost | null = null;
let weatherService: WeatherService | null = null;
let aiService: AiService | null = null;
let wallpaperSupervisor: WallpaperHostSupervisor | null = null;
let actionEngine: ActionEngine | null = null;
let sceneService: SceneService | null = null;
let portalService: PortalService | null = null;
let portalWatcher: PortalWatcher | null = null;
let searchService: SearchService | null = null;
let suggestionEngine: SuggestionEngine | null = null;
let runtimeRecovery: DesktopRuntimeRecovery | null = null;
let explorerMonitor: ExplorerProcessMonitor | null = null;
let updateService: UpdateService | null = null;
let operationsControl: OperationsControlService | null = null;
let operationsTelemetry: OperationsTelemetryService | null = null;
let runtimePresenceTimer: NodeJS.Timeout | null = null;
let runtimeMetricsService: RuntimeMetricsService | null = null;
let suggestionEvaluationQueue: Promise<void> = Promise.resolve();
let interruptedActionRecoveries: InterruptedActionRecovery[] = [];
const approvedPortalSelections = new Map<string, number>();
let shutdownInProgress = false;
let rendererRestartScheduled = false;
let onboardingActive = false;
let cleanDesktopExitPromise: Promise<DesktopStatus> | null = null;
const fileIconCache = new Map<string, string | null>();
const diagnosticsService = new DiagnosticsService();
const systemPresenceMonitor = new SystemPresenceMonitor(undefined, 1_800);
const pauseArbiter = new PauseArbiter({}, handleRuntimeStateChanged);
const searchResultRegistry = new SearchResultRegistry();
const wallpaperAttachQueue = new WallpaperAttachQueue();
const cleanDesktopEscapeGuard = new CleanDesktopEscapeGuard(globalShortcut, () => {
  void exitCleanDesktop("escape-key");
});
let desktopStatus: DesktopStatus = {
  mode: "idle",
  lastChangedAt: new Date().toISOString()
};

const rendererResilience = new WindowResilienceSupervisor({
  isShuttingDown: () => shutdownInProgress,
  record: (event) => recordRendererRecovery(event),
  onExhausted: (event) => scheduleSafeRendererRestart(event)
});

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

function recordRendererRecovery(event: RendererRecoveryEvent): void {
  const data = { ...event };
  if (event.status === "healthy" || event.status === "recovered") {
    logger?.info("app", "renderer lifecycle", data);
    return;
  }
  if (event.status === "failed" || event.status === "exhausted") {
    operationsTelemetry?.recordCrash("renderer", `${event.role}:${event.reason}:${event.status}`, false);
    logger?.error("error", "renderer lifecycle", data);
    return;
  }
  logger?.warn("app", "renderer lifecycle", data);
}

function scheduleSafeRendererRestart(event: RendererRecoveryEvent): void {
  if (shutdownInProgress || rendererRestartScheduled) return;
  rendererRestartScheduled = true;
  writeBootstrapLog("renderer recovery exhausted", {
    role: event.role,
    reason: event.reason,
    safeRendererMode
  });
  logger?.error("error", "renderer recovery exhausted", event);
  if (!safeRendererMode) {
    const relaunchArgs = process.argv.slice(1).filter((argument) => argument !== SAFE_RENDERER_ARG);
    app.relaunch({ args: [...relaunchArgs, SAFE_RENDERER_ARG] });
  }
  shutdownInProgress = true;
  setTimeout(() => app.exit(1), 200);
}

function superviseRendererWindow(
  window: BrowserWindow,
  role: WindowRole,
  healthSelector: string,
  afterLoad?: () => void | Promise<void>,
  rejectUniformWhite = false
): void {
  window.webContents.on("console-message", (details, level, message, line, sourceId) => {
    const resolvedLevel = details.level ?? (level >= 3 ? "error" : level === 2 ? "warning" : "info");
    if (resolvedLevel !== "error") return;
    logger?.error("error", "renderer console error", {
      role,
      message: details.message ?? message,
      line: details.lineNumber ?? line,
      sourceId: details.sourceId ?? sourceId
    });
  });
  rendererResilience.register({ window, role, healthSelector, afterLoad, rejectUniformWhite });
}

function scheduleQaRendererFaultInjection(): void {
  if (app.isPackaged) return;
  const requestedRole = process.env.PROJECTD_QA_CRASH_RENDERER as WindowRole | undefined;
  const windowsByRole: Partial<Record<WindowRole, BrowserWindow | null>> = {
    main: mainWindow,
    settings: settingsWindow,
    overlay: overlayWindow,
    wallpaper: wallpaperWindow,
    pet: petWindow
  };
  const target = requestedRole ? windowsByRole[requestedRole] : null;
  if (requestedRole && target && !target.isDestroyed()) {
    const crash = () => {
      if (target.isDestroyed() || target.webContents.isDestroyed()) return;
      writeBootstrapLog("QA renderer crash injected", { role: requestedRole });
      target.webContents.forcefullyCrashRenderer();
    };
    if (target.webContents.isLoading()) target.webContents.once("did-finish-load", () => setTimeout(crash, 500));
    else setTimeout(crash, 500);
  }

  const autoQuitMs = Number(process.env.PROJECTD_QA_AUTO_QUIT_MS);
  if (Number.isFinite(autoQuitMs) && autoQuitMs >= 1_000) {
    setTimeout(() => app.quit(), autoQuitMs);
  }
}

function scheduleQaSoakChurn(): void {
  if (app.isPackaged || process.env.PROJECTD_QA_SOAK !== "1") return;
  let cycle = 0;
  const timer = setInterval(() => {
    cycle += 1;
    void rendererResilience.probeAll(`qa-soak-${cycle}`);
    if (cycle % 4 === 0 && settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.reloadIgnoringCache();
    }
    if (cycle % 6 === 0 && wallpaperWindow && !wallpaperWindow.isDestroyed()) {
      wallpaperWindow.webContents.reloadIgnoringCache();
    }
    writeBootstrapLog("QA soak cycle", { cycle });
  }, 3_000);
  timer.unref?.();
  app.once("before-quit", () => clearInterval(timer));
}

function rendererUrl(route = ""): string {
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    return `${process.env.VITE_DEV_SERVER_URL}${route}`;
  }

  const rendererPath = path.join(__dirname, "../renderer/index.html");
  return `file://${rendererPath}${route}`;
}

function loadRendererWindow(window: BrowserWindow, route: string, role: WindowRole): void {
  void window.loadURL(rendererUrl(route)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ERR_ABORTED")) {
      logger?.info("app", "renderer navigation superseded", { role, route });
      return;
    }
    logger?.error("error", "renderer load promise rejected", {
      role,
      route,
      message
    });
  });
}

function preloadPath(): string {
  return path.join(__dirname, "../preload/preload.js");
}

function canOpenExternal(url: string): boolean {
  try {
    return ["https:", "http:", "mailto:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function isTrustedRendererUrl(url: string): boolean {
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    try {
      return new URL(url).origin === new URL(process.env.VITE_DEV_SERVER_URL).origin;
    } catch {
      return false;
    }
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "file:") return false;
    const rendererEntry = path.resolve(__dirname, "../renderer/index.html");
    return path.resolve(fileURLToPath(parsed)) === rendererEntry;
  } catch {
    return false;
  }
}

function assertTrustedIpcSender(event: IpcMainInvokeEvent, allowedHashes: readonly string[] = ["", "#/settings"]): void {
  const url = event.senderFrame?.url ?? "";
  if (!isTrustedRendererUrl(url)) {
    logger?.warn("error", "blocked IPC sender", { url });
    throw new Error("Untrusted IPC sender");
  }
  try {
    const hash = new URL(url).hash;
    const windowByHash: Record<string, BrowserWindow | null> = {
      "": mainWindow,
      "#/settings": settingsWindow,
      "#/overlay": overlayWindow,
      "#/pet": petWindow,
      "#/wallpaper": wallpaperWindow
    };
    const expectedWindow = windowByHash[hash];
    const expectedWindows = hash === "#/wallpaper" ? [...wallpaperWindows.values()] : expectedWindow ? [expectedWindow] : [];
    if (
      !allowedHashes.includes(hash)
      || expectedWindows.length === 0
      || !expectedWindows.some((candidate) => !candidate.isDestroyed() && candidate.webContents.id === event.sender.id)
    ) {
      logger?.warn("error", "blocked IPC route", { url });
      throw new Error("This window cannot perform that operation");
    }
  } catch (error) {
    if (error instanceof Error && error.message !== "Invalid URL") throw error;
    throw new Error("Invalid IPC sender URL");
  }
}

function secureRendererWindow(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (canOpenExternal(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (isTrustedRendererUrl(url)) return;
    event.preventDefault();
    if (canOpenExternal(url)) {
      void shell.openExternal(url);
    }
  });
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
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0d0f12",
      symbolColor: "#f4f1ea",
      height: 38
    },
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.setMenuBarVisibility(false);

  secureRendererWindow(window);
  superviseRendererWindow(window, "main", ".app-shell", undefined, true);
  loadRendererWindow(window, "", "main");

  window.once("ready-to-show", () => {
    if (!startHidden) window.show();
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

function showMainWindowAndFocusSearch(): void {
  const needsCreation = !mainWindow || mainWindow.isDestroyed();
  showMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const targetWindow = mainWindow;
  const focusSearch = () => {
    if (!targetWindow.isDestroyed()) targetWindow.webContents.send(IPC_CHANNELS.WINDOW_FOCUS_SEARCH);
  };
  if (needsCreation || targetWindow.webContents.isLoading()) {
    targetWindow.webContents.once("did-finish-load", focusSearch);
  } else {
    focusSearch();
  }
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
    backgroundColor: "#0d0f12",
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0d0f12",
      symbolColor: "#f4f1ea",
      height: 38
    },
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.setMenuBarVisibility(false);

  secureRendererWindow(window);
  superviseRendererWindow(window, "settings", ".settings-content", undefined, true);
  loadRendererWindow(window, "#/settings", "settings");

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
  const bounds = display.workArea;
  const window = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: Math.min(900, bounds.width),
    minHeight: Math.min(600, bounds.height),
    title: safeMode ? "Project D Safe Mode" : "Project D Desktop",
    frame: safeMode,
    transparent: !safeMode,
    fullscreen: false,
    fullscreenable: false,
    resizable: safeMode,
    movable: safeMode,
    skipTaskbar: !safeMode,
    show: false,
    backgroundColor: safeMode ? "#101114" : "#00000000",
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  secureRendererWindow(window);
  superviseRendererWindow(window, "overlay", ".overlay-page");
  loadRendererWindow(window, "#/overlay", "overlay");

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
  const primary = screen.getPrimaryDisplay();
  const coverAllDisplays = database?.getAppState("cover_all_displays") === "true";
  const desiredDisplays = coverAllDisplays ? screen.getAllDisplays() : [primary];
  const desiredIds = new Set(desiredDisplays.map((display) => String(display.id)));

  for (const [displayId, window] of wallpaperWindows) {
    if (desiredIds.has(displayId)) continue;
    wallpaperWindows.delete(displayId);
    if (!window.isDestroyed()) window.close();
  }

  for (const display of desiredDisplays) {
    const displayId = String(display.id);
    const existing = wallpaperWindows.get(displayId);
    if (existing && !existing.isDestroyed()) {
      existing.setBounds(display.bounds, false);
      const attachment = wallpaperStartupAttachments.get(displayId);
      presentWallpaperWindow(existing, attachment?.window === existing ? attachment : null);
      continue;
    }
    wallpaperWindows.set(displayId, createWallpaperWindowForDisplay(displayId, display.bounds));
  }

  wallpaperWindow = wallpaperWindows.get(String(primary.id)) ?? [...wallpaperWindows.values()][0] ?? null;
  if (!wallpaperWindow) throw new Error("No display is available for the wallpaper stage");
  return wallpaperWindow;
}

function getWallpaperDisplays(): WallpaperDisplayInfo[] {
  const primaryId = String(screen.getPrimaryDisplay().id);
  const assignments = database?.getDisplayWallpaperAssignments() ?? {};
  return screen.getAllDisplays().map((display, index) => {
    const id = String(display.id);
    return {
      id,
      label: display.label || `显示器 ${index + 1}`,
      isPrimary: id === primaryId,
      bounds: { ...display.bounds },
      scaleFactor: display.scaleFactor,
      wallpaperId: assignments[id] ?? null
    };
  });
}

function assignWallpaperToDisplay(displayId: string, wallpaperId: string | null): WallpaperDisplayInfo[] {
  if (!database) throw new Error("Database is not initialized");
  if (!screen.getAllDisplays().some((display) => String(display.id) === displayId)) {
    throw new Error("Display is not available");
  }
  if (wallpaperId && !WALLPAPER_LIBRARY.some((item) => item.id === wallpaperId)) {
    throw new Error("Wallpaper is not available");
  }
  database.setDisplayWallpaperAssignment(displayId, wallpaperId);
  broadcastSettingsUpdated();
  return getWallpaperDisplays();
}

function createWallpaperWindowForDisplay(displayId: string, bounds: Electron.Rectangle): BrowserWindow {
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
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  secureRendererWindow(window);

  let resolveStartup!: (result: WallpaperAttachResult) => void;
  const startup = {
    window,
    settled: false,
    attached: false,
    renderReady: false,
    promise: new Promise<WallpaperAttachResult>((resolve) => { resolveStartup = resolve; }),
    resolve: (result: WallpaperAttachResult) => resolveStartup(result)
  };
  wallpaperStartupAttachments.set(displayId, startup);
  presentWallpaperWindow(window, startup);

  window.webContents.once("did-finish-load", () => {
    startWallpaperRepairTimer();
    void (async () => {
      presentWallpaperWindow(window, startup);
      const result = await attachWallpaperWindow(window, 3);
      if (!app.isPackaged && process.env.PROJECTD_QA_FORCE_WHITE_WALLPAPER === "1") {
        await window.webContents.executeJavaScript(`(() => {
          document.documentElement.style.background = "#fff";
          document.body.style.background = "#fff";
          const appRoot = document.querySelector("#app");
          if (appRoot) appRoot.innerHTML = '<div class="wallpaper-page" style="position:fixed;inset:0;background:#fff"></div>';
        })()`);
        writeBootstrapLog("QA white wallpaper frame injected", { displayId });
      }
      let renderReady = result.attached && await waitForWallpaperRendererReady(window);
      const verifiedResult: WallpaperAttachResult = renderReady
        ? result
        : { ...result, attached: false, error: result.error ?? "Wallpaper renderer remained blank or uniformly white" };
      startup.attached = verifiedResult.attached;
      startup.renderReady = renderReady;
      if (!startup.settled) {
        startup.settled = true;
        startup.resolve(verifiedResult);
      }
      if (window.isDestroyed()) return;
      if (verifiedResult.attached && renderReady) {
        window.setIgnoreMouseEvents(true, { forward: true });
        presentWallpaperWindow(window, startup);
        renderReady = await verifyVisibleWallpaperFrame(window);
        startup.renderReady = renderReady;
        if (!renderReady) {
          presentWallpaperWindow(window, startup);
          database?.setAppState("wallpaper_host", "fallback-window-hidden");
          logger?.error("error", "wallpaper window hidden after visible frame validation failed", { displayId, ...verifiedResult });
          return;
        }
        database?.setAppState("wallpaper_host", verifiedResult.parentKind ?? "attached");
        logger?.info("app", "wallpaper window shown on desktop host", { displayId, ...verifiedResult, renderReady });
        return;
      }

      presentWallpaperWindow(window, startup);
      database?.setAppState("wallpaper_host", "fallback-window-hidden");
      logger?.error("error", "wallpaper window hidden after startup validation failed", { displayId, ...verifiedResult, renderReady });
    })().catch((error: unknown) => {
      startup.attached = false;
      startup.renderReady = false;
      if (!startup.settled) {
        startup.settled = true;
        startup.resolve({
          attached: false,
          childHwnd: "0",
          error: error instanceof Error ? error.message : String(error)
        });
      }
      if (!window.isDestroyed()) presentWallpaperWindow(window, startup);
      logger?.error("error", "wallpaper startup pipeline failed safely", {
        displayId,
        message: error instanceof Error ? error.message : String(error)
      });
    });
  });

  superviseRendererWindow(window, "wallpaper", ".wallpaper-page", async () => {
    if (startup.settled && !window.isDestroyed()) {
      await repairWallpaperHost(`renderer-reloaded:${displayId}`);
    }
  }, true);

  window.on("closed", () => {
    if (wallpaperWindows.get(displayId) === window) wallpaperWindows.delete(displayId);
    const pendingStartup = wallpaperStartupAttachments.get(displayId);
    if (pendingStartup?.window === window) {
      wallpaperStartupAttachments.delete(displayId);
      if (!pendingStartup.settled) {
        pendingStartup.settled = true;
        pendingStartup.attached = false;
        pendingStartup.renderReady = false;
        pendingStartup.resolve({ attached: false, childHwnd: "0", error: "Wallpaper window closed before desktop attachment" });
      }
    }
    if (wallpaperWindow === window) wallpaperWindow = null;
    logger?.info("app", "wallpaper window destroyed", { displayId });
  });

  loadRendererWindow(window, `?displayId=${encodeURIComponent(displayId)}#/wallpaper`, "wallpaper");
  logger?.info("app", "wallpaper window created", { displayId, bounds });
  return window;
}

async function attachWallpaperWindow(window: BrowserWindow, attempts = 1): Promise<WallpaperAttachResult> {
  if (!wallpaperHost) {
    return {
      attached: false,
      childHwnd: "0",
      error: "Wallpaper host is not initialized"
    };
  }

  return wallpaperAttachQueue.run(() => retryWallpaperAttach({
    attempts,
    attach: () => wallpaperHost!.attachToDesktop(window)
  }));
}

async function waitForWallpaperRendererReady(window: BrowserWindow, timeoutMs = 3_500): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (!window.isDestroyed() && !window.webContents.isDestroyed() && Date.now() < deadline) {
    try {
      const ready = await window.webContents.executeJavaScript(`(() => {
        const stage = document.querySelector(".wallpaper-stage");
        if (!stage) return false;
        const activeImage = stage.querySelector(".wallpaper-bg-img.is-active");
        const activeVideo = stage.querySelector("video.wallpaper-bg-video.is-active");
        const canvas = stage.querySelector("canvas");
        if (activeImage && getComputedStyle(activeImage).backgroundImage !== "none") return true;
        if (activeVideo && activeVideo.readyState >= 2 && activeVideo.videoWidth > 0) return true;
        if (canvas && canvas.width > 0 && canvas.height > 0) return true;
        return stage.getAttribute("data-fallback") === "true";
      })()`, true);
      if (ready === true) return true;
    } catch {
      // The renderer may still be applying its first settings snapshot.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

async function verifyVisibleWallpaperFrame(window: BrowserWindow, timeoutMs = 2_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (!window.isDestroyed() && !window.webContents.isDestroyed() && Date.now() < deadline) {
    try {
      const image = await Promise.race([
        window.webContents.capturePage(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 500))
      ]);
      if (image && !image.isEmpty()) {
        const size = image.getSize();
        if (size.width > 0 && size.height > 0 && !isMostlyWhiteBitmap(image.toBitmap(), size.width, size.height)) {
          return true;
        }
      }
    } catch {
      // Retry briefly while the newly shown compositor surface becomes available.
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return false;
}

function defaultPetBounds(): PetWindowBounds {
  const display = screen.getPrimaryDisplay();
  return defaultPetWindowForWorkArea(display.workArea);
}

function normalizePetBounds(bounds: PetWindowBounds): PetWindowBounds {
  const display = screen.getDisplayMatching(bounds);
  return fitPetWindowToWorkArea(bounds, display.workArea);
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
    if (onboardingActive) petWindow.hide();
    else petWindow.showInactive();
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
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  secureRendererWindow(window);

  const restorePetPresentation = () => {
    if (window.isDestroyed()) return;
    if (onboardingActive) window.hide();
    else window.showInactive();
    window.setAlwaysOnTop(true, "screen-saver");
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    window.setIgnoreMouseEvents(true, { forward: true });
    logger?.info("app", "pet window shown", window.getBounds());
  };
  superviseRendererWindow(window, "pet", ".pet-shell", restorePetPresentation);
  loadRendererWindow(window, "#/pet", "pet");

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

function resizePetWindowForScale(scale: number): void {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }
  const current = petWindow.getBounds();
  const size = Math.max(230, Math.min(340, Math.round(250 + (scale - 1) * 110)));
  const next = normalizePetBounds({ ...current, width: size, height: size });
  petWindow.setBounds(next, false);
  savePetBounds(next);
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
  const windows = [...wallpaperWindows.values()];
  wallpaperWindows.clear();
  for (const startup of wallpaperStartupAttachments.values()) {
    if (!startup.settled) {
      startup.settled = true;
      startup.attached = false;
      startup.renderReady = false;
      startup.resolve({ attached: false, childHwnd: "0", error: "Wallpaper stages were closed" });
    }
  }
  wallpaperStartupAttachments.clear();
  wallpaperWindow = null;
  for (const window of windows) {
    if (!window.isDestroyed()) window.close();
  }
}

function startWallpaperRepairTimer(): void {
  wallpaperSupervisor?.start();
}

function stopWallpaperRepairTimer(): void {
  wallpaperSupervisor?.stop();
}

async function repairWallpaperHost(reason = "manual"): Promise<void> {
  let windows = [...wallpaperWindows.entries()].filter(([, window]) => !window.isDestroyed());
  if (windows.length === 0) {
    if (!database?.getSettings().wallpaper.isDynamic) return;
    createWallpaperWindow();
    windows = [...wallpaperWindows.entries()].filter(([, window]) => !window.isDestroyed());
  }

  let attachedCount = 0;
  for (const [displayId, window] of windows) {
    const startup = wallpaperStartupAttachments.get(displayId);
    if (startup?.window === window && startup.settled) {
      startup.attached = false;
      startup.renderReady = false;
      presentWallpaperWindow(window, startup);
    }
    let result = startup && startup.window === window && !startup.settled
      ? await startup.promise
      : await attachWallpaperWindow(window, 2);
    if (startup?.window === window) {
      startup.settled = true;
      startup.attached = result.attached;
      startup.renderReady = false;
    }
    if (result.attached) {
      let renderReady = await waitForWallpaperRendererReady(window);
      if (startup?.window === window) startup.renderReady = renderReady;
      if (renderReady) {
        window.setIgnoreMouseEvents(true, { forward: true });
        presentWallpaperWindow(window, startup);
        renderReady = await verifyVisibleWallpaperFrame(window);
        if (startup?.window === window) startup.renderReady = renderReady;
        if (renderReady) {
          attachedCount += 1;
          database?.setAppState("wallpaper_host", result.parentKind ?? "attached");
          logger?.info("app", "wallpaper host repair completed", { reason, displayId, ...result, renderReady });
        } else {
          presentWallpaperWindow(window, startup);
          logger?.error("error", "wallpaper host repair rejected a visible blank frame", { reason, displayId, ...result });
        }
      } else {
        presentWallpaperWindow(window, startup);
        logger?.error("error", "wallpaper host repair rejected a blank frame", { reason, displayId, ...result });
      }
    } else {
      presentWallpaperWindow(window, startup);
      logger?.warn("app", "wallpaper host repair skipped", { reason, displayId, ...result });
    }
  }
  database?.setAppState("wallpaper_display_health", JSON.stringify({ attachedCount, expectedCount: windows.length, checkedAt: new Date().toISOString(), reason }));
  if (attachedCount !== windows.length) {
    throw new Error(`Wallpaper recovery attached ${attachedCount} of ${windows.length} display stages`);
  }
}

function reconcileDesktopRuntimeBounds(reason: string): void {
  const primary = screen.getPrimaryDisplay();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setBounds(primary.workArea, false);
  }
  if (database?.getSettings().wallpaper.isDynamic) createWallpaperWindow();
  const displays = new Map(screen.getAllDisplays().map((display) => [String(display.id), display]));
  for (const [displayId, window] of wallpaperWindows) {
    const display = displays.get(displayId);
    if (display && !window.isDestroyed()) window.setBounds(display.bounds, false);
  }
  if (petWindow && !petWindow.isDestroyed()) {
    const current = petWindow.getBounds();
    const display = screen.getDisplayMatching(current);
    const x = Math.min(Math.max(current.x, display.workArea.x), display.workArea.x + display.workArea.width - current.width);
    const y = Math.min(Math.max(current.y, display.workArea.y), display.workArea.y + display.workArea.height - current.height);
    if (x !== current.x || y !== current.y) {
      const next = { ...current, x, y };
      petWindow.setBounds(next, false);
      savePetBounds(next);
    }
  }
  logger?.info("desktop-state", "desktop runtime bounds reconciled", {
    reason,
    displayId: String(primary.id),
    scaleFactor: primary.scaleFactor,
    workArea: primary.workArea
  });
}

function registerWallpaperRepairTriggers(): void {
  const requestRendererProbe = (reason: string, delayMs: number) => {
    setTimeout(() => {
      void rendererResilience.probeAll(reason);
    }, delayMs).unref?.();
  };
  screen.on("display-added", () => {
    if (database?.getSettings().wallpaper.isDynamic) createWallpaperWindow();
    runtimeRecovery?.request("display-added");
    requestRendererProbe("display-added", 650);
  });
  screen.on("display-removed", () => {
    if (database?.getSettings().wallpaper.isDynamic) createWallpaperWindow();
    runtimeRecovery?.request("display-removed");
    requestRendererProbe("display-removed", 650);
  });
  screen.on("display-metrics-changed", () => {
    if (database?.getSettings().wallpaper.isDynamic) createWallpaperWindow();
    runtimeRecovery?.request("display-metrics-changed");
    requestRendererProbe("display-metrics-changed", 650);
  });
  powerMonitor.on("suspend", () => {
    pauseArbiter.update({ suspended: true });
    runtimeRecovery?.suspend("system-suspend");
  });
  powerMonitor.on("resume", () => {
    pauseArbiter.update({ suspended: false });
    setTimeout(() => runtimeRecovery?.resume("system-resume"), 800).unref?.();
    requestRendererProbe("system-resume", 1_800);
  });
  powerMonitor.on("lock-screen", () => {
    pauseArbiter.update({ screenLocked: true });
    runtimeRecovery?.suspend("screen-locked");
  });
  powerMonitor.on("unlock-screen", () => {
    pauseArbiter.update({ screenLocked: false });
    setTimeout(() => runtimeRecovery?.resume("screen-unlocked"), 350).unref?.();
    requestRendererProbe("screen-unlocked", 900);
  });
  powerMonitor.on("on-battery", () => pauseArbiter.update({ onBattery: true }));
  powerMonitor.on("on-ac", () => pauseArbiter.update({ onBattery: false }));
  powerMonitor.on("thermal-state-change", (details) => {
    pauseArbiter.update({ thermalState: details.state as ThermalState });
  });
}

function syncWindowsFromSettings(settings: SettingsSnapshot): void {
  pauseArbiter.update({ configuredMode: readPerformanceMode() });
  syncLaunchAtLogin();
  if (settings.pet.isVisible) {
    createPetWindow();
    resizePetWindowForScale(settings.pet.scale);
  } else {
    petWindow?.hide();
  }

  if (settings.wallpaper.isDynamic) {
    createWallpaperWindow();
  } else {
    closeWallpaperWindow();
  }
}

function readPerformanceMode(): PerformanceMode {
  const value = database?.getAppState("performance_mode");
  return value === "quality" || value === "balanced" || value === "batterySaver" ? value : "auto";
}

function handleRuntimeStateChanged(snapshot: RuntimePauseSnapshot): void {
  database?.setAppState("runtime_manual_paused", snapshot.manual ? "true" : "false");
  database?.setAppState("runtime_effective_profile", snapshot.effectiveProfile);
  database?.setAppState("runtime_pause_snapshot", JSON.stringify(snapshot));
  logger?.info("desktop-state", "runtime pause state changed", {
    paused: snapshot.paused,
    reasons: snapshot.reasons,
    effectiveProfile: snapshot.effectiveProfile,
    onBattery: snapshot.onBattery,
    batteryLevel: snapshot.batteryLevel
  });
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(IPC_CHANNELS.RUNTIME_STATE_CHANGED, snapshot);
  }
}

function setRuntimeManualPaused(paused: boolean): RuntimePauseSnapshot {
  return pauseArbiter.update({ manual: paused });
}

function startRuntimePresenceMonitor(): void {
  if (runtimePresenceTimer) return;
  const poll = async () => {
    if (shutdownInProgress) return;
    const presence = await systemPresenceMonitor.getState();
    pauseArbiter.update({
      externalFullscreen: presence.externalFullscreen,
      onBattery: presence.onBattery,
      batteryLevel: presence.batteryLevel
    });
  };
  void poll();
  runtimePresenceTimer = setInterval(() => void poll(), 2_000);
  runtimePresenceTimer.unref?.();
}

function stopRuntimePresenceMonitor(): void {
  if (!runtimePresenceTimer) return;
  clearInterval(runtimePresenceTimer);
  runtimePresenceTimer = null;
  systemPresenceMonitor.dispose();
}

function syncLaunchAtLogin(): void {
  const enabled = database?.getAppState("launch_at_login") === "true";
  if (!app.isPackaged) return;
  const current = app.getLoginItemSettings({ path: process.execPath, args: [START_HIDDEN_ARG] });
  if (current.openAtLogin === enabled) return;
  app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath, args: [START_HIDDEN_ARG] });
  logger?.info("app", "login startup preference applied", { enabled });
}

function createRuntimeMetricsService(): RuntimeMetricsService {
  return new RuntimeMetricsService({
    sampleProcesses: () => app.getAppMetrics().map((metric) => ({
      source: metric.type === "Browser"
        ? "main"
        : metric.type === "GPU"
          ? "gpu"
          : metric.type === "Tab" || metric.type === "Utility"
            ? metric.type === "Tab" ? "renderer" : "utility"
            : "other",
      processId: metric.pid,
      cpuPercent: metric.cpu.percentCPUUsage,
      workingSetBytes: metric.memory.workingSetSize * 1024
    })),
    getRuntimeState: () => pauseArbiter.snapshot,
    persistBatch: (samples) => {
      try {
        database?.appendRuntimeMetrics(samples);
      } catch (error) {
        logger?.warn("app", "runtime metrics batch could not be persisted", {
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });
}

async function emergencyRestoreDesktop(reason: string): Promise<void> {
  logger?.warn("desktop-state", "emergency desktop restore requested", { reason });
  cleanDesktopEscapeGuard.disarm();
  closeOverlayWindow();
  closeWallpaperWindow();
  database?.setAppState("clean_desktop_mode", "false");
  try {
    desktopStatus = (await desktopController?.deactivate()) ?? updateDesktopStatus("idle");
  } catch (error) {
    logger?.error("desktop-state", "emergency desktop restore failed", {
      reason,
      message: error instanceof Error ? error.message : String(error)
    });
  }
  showMainWindow();
  sendMenuCommand(MENU_COMMANDS.DEACTIVATE_DESKTOP);
}

async function enterCleanDesktop(): Promise<DesktopStatus> {
  desktopStatus = (await desktopController?.activate()) ?? updateDesktopStatus("safe-mode");
  if (desktopStatus.mode !== "active") {
    cleanDesktopEscapeGuard.disarm();
    database?.setAppState("clean_desktop_mode", "false");
    mainWindow?.show();
    logger?.warn("desktop-state", "clean desktop mode rejected because desktop icons could not be hidden", {
      mode: desktopStatus.mode
    });
    return {
      ...desktopStatus,
      message: "未进入纯净桌面：系统图标隐藏失败，已保持原桌面可见。"
    };
  }
  createWallpaperWindow();
  closeOverlayWindow();
  mainWindow?.hide();
  database?.setAppState("clean_desktop_mode", "true");
  const escapeReady = cleanDesktopEscapeGuard.arm();
  desktopStatus = {
    ...desktopStatus,
    message: escapeReady
      ? "纯净桌面已开启：按 Esc 随时恢复桌面图标。"
      : "纯净桌面已开启：Esc 注册冲突，请从托盘选择“恢复桌面”。"
  };
  logger?.[escapeReady ? "info" : "warn"]("desktop-state", "clean desktop mode entered", { escapeReady });
  sendMenuCommand(MENU_COMMANDS.ACTIVATE_DESKTOP);
  return desktopStatus;
}

function exitCleanDesktop(reason = "user-action"): Promise<DesktopStatus> {
  if (cleanDesktopExitPromise) return cleanDesktopExitPromise;
  cleanDesktopEscapeGuard.disarm();
  const operation = (async () => {
    desktopStatus = (await desktopController?.deactivate()) ?? updateDesktopStatus("idle");
    database?.setAppState("clean_desktop_mode", "false");
    mainWindow?.show();
    showMainWindow();
    logger?.info("desktop-state", "clean desktop mode exited", { reason });
    sendMenuCommand(MENU_COMMANDS.DEACTIVATE_DESKTOP);
    return desktopStatus;
  })();
  const tracked = operation.finally(() => {
    if (cleanDesktopExitPromise === tracked) cleanDesktopExitPromise = null;
  });
  cleanDesktopExitPromise = tracked;
  return tracked;
}

function broadcastSettingsUpdated(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.SETTINGS_UPDATED);
    }
  }
}

function updatePetSettings(patch: SettingsPatch["pet"]): void {
  if (!database || !patch) {
    return;
  }
  const settings = database.updateSettings({ pet: patch });
  syncWindowsFromSettings(settings);
  broadcastSettingsUpdated();
}

function showPetContextMenu(): void {
  if (!database) {
    return;
  }
  const template = createPetMenuTemplate(database.getSettings().pet, {
    openConversation: showMainWindow,
    openSettings: createSettingsWindow,
    updatePet: updatePetSettings
  });
  Menu.buildFromTemplate(template).popup({ window: petWindow ?? undefined });
}

function operationsFeatureEnabled(key: string): boolean {
  return operationsControl?.feature({ key, risk: "low", defaultEnabled: true }).enabled ?? true;
}

function applyWallpaperById(wallpaperId: string): SettingsSnapshot {
  if (!database) {
    throw new Error("Database is not initialized");
  }

  const wallpaper = WALLPAPER_LIBRARY.find((item) => item.id === wallpaperId);
  if (!wallpaper) {
    throw new Error("Wallpaper was not found in the local library");
  }
  if (operationsControl && !operationsControl.assetAllowed(wallpaper.id)) {
    throw new Error("该壁纸已由运维策略暂停分发");
  }

  const current = database.getSettings();
  const settings = database.updateSettings({
    wallpaper: {
      currentStyle: "user",
      dynamicId: wallpaper.id,
      isDynamic: true,
      currentIndex: current.wallpaper.currentIndex + 1
    }
  });

  syncWindowsFromSettings(settings);
  broadcastSettingsUpdated();
  logger?.info("app", "wallpaper applied from library", { wallpaperId, label: wallpaper.label });
  return settings;
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

function registerGlobalShortcuts(): void {
  const savedAccelerator = database?.getAppState("shortcut_peek") || "Control+Alt+Space";
  const accelerator = isValidPeekAccelerator(savedAccelerator) ? savedAccelerator : "Control+Alt+Space";
  globalShortcut.unregister(accelerator);
  const registered = globalShortcut.register(accelerator, createPeekShortcutHandler(accelerator));
  if (accelerator !== savedAccelerator) database?.setAppState("shortcut_peek", accelerator);
  database?.setAppState("shortcut_peek_status", registered ? "ready" : "conflict");
  logger?.[registered ? "info" : "warn"]("app", "workspace shortcut registration", { accelerator, registered });

  const emergencyAccelerator = "Control+Alt+Shift+Escape";
  globalShortcut.unregister(emergencyAccelerator);
  const emergencyRegistered = globalShortcut.register(emergencyAccelerator, () => {
    void emergencyRestoreDesktop("emergency-shortcut");
  });
  database?.setAppState("shortcut_emergency_status", emergencyRegistered ? "ready" : "conflict");
  logger?.[emergencyRegistered ? "info" : "warn"]("app", "emergency desktop shortcut registration", {
    accelerator: emergencyAccelerator,
    registered: emergencyRegistered
  });
}

function broadcastDesktopFilesUpdated(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC_CHANNELS.DESKTOP_FILES_UPDATED);
  }
}

function broadcastPortalsUpdated(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.PORTALS_UPDATED);
    }
  }
}

function broadcastSuggestionCreated(suggestion: SuggestionRecord): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.SUGGESTIONS_CREATED, suggestion);
    }
  }
}

function syncPortalWatcher(): void {
  portalWatcher?.updatePortals(portalService?.list() ?? []);
}

function parseSuggestion(raw: string | null): SuggestionRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SuggestionRecord;
    return parsed.kind === "desktop-inbox" && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function suggestionFingerprintKey(fingerprint: string): string {
  return `suggestion:desktop-inbox:${fingerprint}`;
}

function getSuggestionDeliveryControls(): SuggestionDeliveryControls {
  const raw = database?.getAppState("suggestion:delivery-controls");
  const defaultPolicy: SuggestionPolicy = {
    timeZoneOffsetMinutes: -new Date().getTimezoneOffset(),
    quietHours: { enabled: true, start: "22:00", end: "08:00" },
    dailyBudget: 3,
    perKind: { "desktop-inbox": { cooldownMs: 6 * 60 * 60 * 1000, dailyBudget: 2 } }
  };
  try {
    const parsed = raw ? JSON.parse(raw) as Partial<SuggestionDeliveryControls> : {};
    const policy = parsed.policy;
    return {
      snoozedUntil: typeof parsed.snoozedUntil === "string" ? parsed.snoozedUntil : null,
      mutedUntil: typeof parsed.mutedUntil === "string" ? parsed.mutedUntil : null,
      disabled: parsed.disabled === true,
      policy: {
        timeZoneOffsetMinutes: typeof policy?.timeZoneOffsetMinutes === "number" && Number.isFinite(policy.timeZoneOffsetMinutes)
          ? Math.max(-840, Math.min(840, Math.round(policy.timeZoneOffsetMinutes)))
          : defaultPolicy.timeZoneOffsetMinutes,
        quietHours: {
          enabled: policy?.quietHours?.enabled !== false,
          start: isClockTime(policy?.quietHours?.start) ? policy.quietHours.start : defaultPolicy.quietHours.start,
          end: isClockTime(policy?.quietHours?.end) ? policy.quietHours.end : defaultPolicy.quietHours.end
        },
        dailyBudget: typeof policy?.dailyBudget === "number" && Number.isInteger(policy.dailyBudget)
          ? Math.max(1, Math.min(10, policy.dailyBudget))
          : defaultPolicy.dailyBudget,
        perKind: {
          "desktop-inbox": {
            cooldownMs: typeof policy?.perKind?.["desktop-inbox"]?.cooldownMs === "number"
              ? Math.max(30 * 60 * 1000, Math.min(24 * 60 * 60 * 1000, Math.round(policy.perKind["desktop-inbox"].cooldownMs)))
              : defaultPolicy.perKind["desktop-inbox"].cooldownMs,
            dailyBudget: typeof policy?.perKind?.["desktop-inbox"]?.dailyBudget === "number"
              ? Math.max(1, Math.min(10, Math.round(policy.perKind["desktop-inbox"].dailyBudget)))
              : defaultPolicy.perKind["desktop-inbox"].dailyBudget
          }
        }
      }
    };
  } catch {
    return { snoozedUntil: null, mutedUntil: null, disabled: false, policy: defaultPolicy };
  }
}

function isClockTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59);
}

function saveSuggestionDeliveryControls(controls: SuggestionDeliveryControls): void {
  database?.setAppState("suggestion:delivery-controls", JSON.stringify(controls));
}

function getLatestSuggestion(): SuggestionRecord | null {
  const suggestion = parseSuggestion(database?.getAppState("suggestion:latest") ?? null);
  return suggestion?.status === "ready" ? suggestion : null;
}

async function performDesktopSuggestionEvaluation(): Promise<void> {
  if (!suggestionEngine || !database) return;
  const presence = await systemPresenceMonitor.getState();
  const decision = await suggestionEngine.evaluateWithDecision({
    candidates: database.getDesktopFiles().map((file) => ({
      id: file.id,
      filename: file.filename,
      fullPath: file.fullPath,
      category: file.category,
      isDirectory: file.category === "folder",
      isMissing: file.isMissing,
      isShortcut: file.isShortcut
    })),
    runtime: {
      quietHours: database.getAppState("suggestions_quiet_hours") === "true",
      fullscreen: BrowserWindow.getFocusedWindow()?.isFullScreen() === true || presence.externalFullscreen,
      batteryLevel: presence.onBattery ? presence.batteryLevel : null,
      isBatteryLow: presence.onBattery && presence.batteryLevel !== null && presence.batteryLevel <= 20,
      batterySaver: database.getAppState("performance_mode") === "batterySaver"
    }
  });
  database.setAppState("suggestion:last-decision", JSON.stringify({
    at: new Date().toISOString(),
    status: decision.status,
    reason: decision.reason,
    explanation: decision.explanation
  }));
  const created = decision.suggestion;
  if (created) {
    const visibleSuggestion: SuggestionRecord = {
      ...created,
      reasonCode: decision.reason,
      explanation: decision.explanation
    };
    database.setAppState("suggestion:latest", JSON.stringify(visibleSuggestion));
    broadcastSuggestionCreated(visibleSuggestion);
    logger?.info("app", "desktop suggestion created", { suggestionId: created.id });
  }
}

function evaluateDesktopSuggestion(): Promise<void> {
  return serializeSuggestionOperation(() => performDesktopSuggestionEvaluation());
}

function serializeSuggestionOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = suggestionEvaluationQueue.then(operation, operation);
  suggestionEvaluationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function createSupportDiagnosticsReport(): SupportDiagnosticsReport {
  if (!database) throw new Error("Database is not initialized");
  const status = database.getStatus();
  const host = database.getAppState("wallpaper_host") ?? "unknown";
  const errorLog = path.join(logger?.directory ?? path.join(app.getPath("userData"), "logs"), "error.log");
  const settings = database.getSettings();
  const schemaVersion = Number(database.getAppState("schema_version") ?? "0");

  return diagnosticsService.createReport({
    app: { version: app.getVersion(), platform: process.platform, architecture: process.arch },
    database: {
      healthy: status.initialized,
      schemaVersion: Number.isFinite(schemaVersion) ? schemaVersion : null,
      migrationCount: schemaVersion >= 2 ? 1 : 0
    },
    desktop: {
      healthy: Boolean(fileScanner),
      desktopFileCount: database.getDesktopFiles().filter((file) => !file.isMissing).length,
      portalCount: database.getPortalConfigs().length
    },
    wallpaperHost: {
      healthy: Boolean(wallpaperHost),
      attached: host === "WorkerW" || host === "Progman"
    },
    recentLogs: readRecentLogMetadata(errorLog),
    providerConfigured: settings.ai.apiKeyConfigured
  });
}

async function inspectInterruptedActions(): Promise<void> {
  const executions = actionEngine?.getHistory().filter(
    (execution): execution is ActionExecution & { status: "executing" } => execution.status === "executing"
  ) ?? [];
  interruptedActionRecoveries = await Promise.all(executions.map(async (execution) => {
    const report = await inspectInterruptedAction(execution, {
      exists: (candidate) => fs.existsSync(candidate),
      stat: (candidate) => fs.promises.stat(candidate)
    });
    return {
      executionId: report.executionId,
      counts: report.counts,
      canResumeSafely: report.canResumeSafely,
      canRollbackSafely: report.canRollbackSafely,
      items: report.items.map((item) => ({
        id: item.id,
        label: item.label ?? "未命名文件",
        state: item.state
      }))
    };
  }));
  if (interruptedActionRecoveries.length > 0) {
    logger?.warn("app", "interrupted actions inspected", { count: interruptedActionRecoveries.length });
  }
}

async function getPortalSearchCandidates() {
  if (!portalService) return [];
  const portals = portalService.list();
  const resources = await Promise.all(portals.map((portal) => portalService!.getResources(portal.id)));
  return resources.flat().flatMap((resource) => (
    resource.status === "ready" && !resource.isDirectory
      ? [{
          id: `portal:${resource.portalId}:${resource.relativePath}`,
          title: resource.name,
          fullPath: resource.fullPath,
          category: resource.category,
          modifiedAt: resource.modifiedAt
        }]
      : []
  ));
}

function toWorkspaceSearchResult(result: Awaited<ReturnType<SearchService["search"]>>[number]): WorkspaceSearchResult {
  return {
    id: searchResultRegistry.register(result),
    title: result.title,
    origin: result.origin,
    category: result.category as WorkspaceSearchResult["category"],
    modifiedAt: result.modifiedAt
  };
}

async function resolveWorkspaceSearchResultPath(resultId: string): Promise<string> {
  const target = searchResultRegistry.resolve(resultId);
  if (target.origin === "desktop") {
    const file = database?.getDesktopFileById(target.fileId);
    if (!file || file.isMissing) throw new Error("Desktop search result is no longer available");
    return file.fullPath;
  }
  if (target.origin === "portal") {
    if (!portalService) throw new Error("Folder portal service is unavailable");
    return portalService.resolveResourcePath(target.portalId, target.relativePath);
  }
  if (!path.isAbsolute(target.fullPath) || !fs.existsSync(target.fullPath)) {
    throw new Error("System search result is no longer available");
  }
  return target.fullPath;
}

function runtimeDisplays() {
  const primaryId = String(screen.getPrimaryDisplay().id);
  return screen.getAllDisplays().map((display) => ({
    displayId: String(display.id),
    scaleFactor: display.scaleFactor,
    isPrimary: String(display.id) === primaryId,
    bounds: { ...display.bounds },
    workArea: { ...display.workArea }
  }));
}

async function authorizeSearchResultPortal(resultId: string) {
  if (!portalService) throw new Error("Folder portal service is unavailable");
  const resultPath = await resolveWorkspaceSearchResultPath(resultId);
  const defaultPath = fs.statSync(resultPath).isDirectory() ? resultPath : path.dirname(resultPath);
  const options: OpenDialogOptions = {
    title: "授权包含该搜索结果的文件夹门户",
    defaultPath,
    buttonLabel: "授权为只读门户",
    properties: ["openDirectory"]
  };
  const owner = overlayWindow && !overlayWindow.isDestroyed() ? overlayWindow : mainWindow;
  const selection = owner && !owner.isDestroyed()
    ? await dialog.showOpenDialog(owner, options)
    : await dialog.showOpenDialog(options);
  if (selection.canceled || !selection.filePaths[0]) return null;

  const portal = await createAuthorizedSearchPortal({
    resultPath,
    selectedFolder: selection.filePaths[0],
    addPortal: (folderPath, name) => portalService!.add(folderPath, name)
  });
  syncPortalWatcher();
  broadcastPortalsUpdated();
  logger?.info("app", "search result folder portal granted", { portalId: portal.id, resultOrigin: searchResultRegistry.resolve(resultId).origin });
  return portal;
}

async function containersWithNativeIcons(): Promise<ReturnType<DatabaseService["getContainersWithFiles"]>> {
  const containers = database?.getContainersWithFiles() ?? [];
  await Promise.all(
    containers.flatMap((container) =>
      container.files.map(async (file) => {
        if (fileIconCache.has(file.fullPath)) {
          file.iconDataUrl = fileIconCache.get(file.fullPath) ?? null;
          return;
        }

        try {
          const icon = await app.getFileIcon(file.fullPath, { size: "normal" });
          const dataUrl = icon.isEmpty() ? null : icon.toDataURL();
          fileIconCache.set(file.fullPath, dataUrl);
          file.iconDataUrl = dataUrl;
        } catch {
          fileIconCache.set(file.fullPath, null);
          file.iconDataUrl = null;
        }
      })
    )
  );

  return containers;
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
        showMainWindowAndFocusSearch();
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
    {
      label: "纯净桌面（Esc 退出）",
      click: async () => {
        await enterCleanDesktop();
      }
    },
    {
      label: "恢复桌面",
      click: async () => {
        await exitCleanDesktop();
      }
    },
    {
      label: "紧急安全归位",
      click: async () => {
        await emergencyRestoreDesktop("tray-menu");
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
    {
      label: "暂停动态效果",
      click: () => {
        setRuntimeManualPaused(true);
      }
    },
    {
      label: "继续动态效果",
      click: () => {
        setRuntimeManualPaused(false);
      }
    },
    { type: "separator" },
    {
      label: "显示桌宠",
      click: () => {
        updatePetSettings({ isVisible: true });
      }
    },
    {
      label: "隐藏桌宠",
      click: () => {
        updatePetSettings({ isVisible: false });
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
    {
      label: "检查更新",
      click: () => {
        createSettingsWindow();
        void updateService?.checkForUpdates().catch((error) => {
          logger?.warn("app", "tray update check failed", {
            message: error instanceof Error ? error.message : String(error)
          });
        });
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
    showMainWindowAndFocusSearch();
  });

  return appTray;
}

function registerIpc(): void {
  registerAllIpcHandlers(buildIpcDeps());
}

function broadcastUpdateStatus(status: UpdateStatus): void {
  const window = settingsWindow;
  if (!window || window.isDestroyed() || window.webContents.isDestroyed()) return;
  window.webContents.send(IPC_CHANNELS.UPDATE_STATUS_CHANGED, status);
}

function hasConfiguredBundledUpdateFeed(): boolean {
  if (!app.isPackaged) return false;
  try {
    const config = fs.readFileSync(path.join(process.resourcesPath, "app-update.yml"), "utf8");
    const rawUrl = /^\s*url:\s*['"]?([^\s'"]+)/m.exec(config)?.[1] ?? null;
    const url = validateUpdateFeedUrl(rawUrl);
    return Boolean(url && !new URL(url).hostname.endsWith(".invalid"));
  } catch {
    return false;
  }
}

async function setPeekShortcut(accelerator: unknown): Promise<{ success: boolean; accelerator: string }> {
    if (typeof accelerator !== "string" || !isValidPeekAccelerator(accelerator)) {
      throw new Error("invalid");
    }
    const oldAccelerator = database?.getAppState("shortcut_peek") || "Control+Alt+Space";

    if (oldAccelerator === accelerator) {
      if (!globalShortcut.isRegistered(accelerator)) {
        const restored = globalShortcut.register(accelerator, createPeekShortcutHandler(accelerator));
        database?.setAppState("shortcut_peek_status", restored ? "ready" : "conflict");
        if (!restored) throw new Error("conflict");
      }
      return { success: true, accelerator };
    }

    const registered = globalShortcut.register(accelerator, createPeekShortcutHandler(accelerator));

    if (!registered) {
      database?.setAppState("shortcut_peek_status", "conflict");
      throw new Error("conflict");
    }

    globalShortcut.unregister(oldAccelerator);
    database?.setAppState("shortcut_peek", accelerator);
    database?.setAppState("shortcut_peek_status", "ready");
    logger?.info("app", "peek shortcut changed", { from: oldAccelerator, to: accelerator });

    return { success: true, accelerator };
}

function createPeekShortcutHandler(accelerator: string): () => void {
  return () => {
    showMainWindowAndFocusSearch();
    logger?.info("app", "workspace shortcut invoked", { accelerator });
  };
}

function isValidPeekAccelerator(accelerator: string): boolean {
  if (accelerator.length < 3 || accelerator.length > 80 || /[\x00-\x1f\x7f]/.test(accelerator)) return false;
  const parts = accelerator.split("+");
  if (parts.some((part) => !part) || new Set(parts).size !== parts.length) return false;
  const modifiers = new Set(["Control", "Alt", "Shift", "Meta", "CommandOrControl"]);
  const key = parts.at(-1) ?? "";
  if (!parts.slice(0, -1).every((part) => modifiers.has(part)) || parts.length < 2) return false;
  return /^(?:[A-Z0-9]|Space|Enter|Tab|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Up|Down|Left|Right|Plus|F(?:[1-9]|1\d|2[0-4]))$/.test(key);
}

/** @internal File preview logic extracted from old registerIpc */
async function readFilePreviewImpl(fileId: number): Promise<any> {
  const file = database?.getDesktopFileById(fileId);
  if (!file) throw new Error("File not found");
  const { readFile, open } = await import("node:fs/promises");
  const previewable = new Set([".txt",".md",".csv",".json",".xml",".yml",".yaml",".log",".ini",".cfg",".py",".js",".ts",".html",".css",".gitignore"]);
  const images = new Set([".png",".jpg",".jpeg",".gif",".webp",".svg",".bmp",".ico"]);
  const ext = file.extension?.toLowerCase() ?? "";
  const sizeLabel = file.sizeBytes >= 1_000_000 ? `${(file.sizeBytes/1_000_000).toFixed(1)} MB` : `${(file.sizeBytes/1_000).toFixed(0)} KB`;
  const modifiedAt = file.modifiedAt ? new Date(file.modifiedAt).toLocaleString() : "";
  if (previewable.has(ext)) {
    if (file.sizeBytes > 2_000_000) return { type: "unsupported", content: "超过 2 MB", filename: file.filename, sizeLabel, modifiedAt };
    const h = await open(file.fullPath, "r");
    try { const buf = Buffer.alloc(Math.min(16384, file.sizeBytes)); const r = await h.read(buf,0,buf.length,0); return { type: "text", content: buf.subarray(0,r.bytesRead).toString("utf8").slice(0,4000), filename: file.filename, sizeLabel, modifiedAt }; }
    finally { await h.close(); }
  }
  if (images.has(ext)) {
    if (file.sizeBytes > 12_000_000) return { type: "unsupported", content: "超过 12 MB", filename: file.filename, sizeLabel, modifiedAt };
    const buf = await readFile(file.fullPath);
    const mime = ext === ".svg" ? "image/svg+xml" : `image/${ext.replace(".","")}`;
    return { type: "image", content: `data:${mime};base64,${buf.toString("base64")}`, filename: file.filename, sizeLabel, modifiedAt };
  }
  return { type: "unsupported", content: "不支持预览", filename: file.filename, sizeLabel, modifiedAt };
}

function readPrivacyNetworkState(): PrivacyNetworkState {
  if (!database) return { paused: false, changedAt: null };
  return getPrivacyNetworkState(database);
}

function updatePrivacyNetworkPaused(paused: boolean): PrivacyNetworkState {
  if (!database) throw new Error("Database is not initialized");
  const state = setPrivacyNetworkPaused(database, paused);
  logger?.info("app", paused ? "privacy external network paused" : "privacy external network resumed", { changedAt: state.changedAt });
  broadcastSettingsUpdated();
  return state;
}

function recoveryHealth(status: RecoveryHealthCode, detail: string) {
  return { status, detail } as const;
}

async function getRecoverySystemStatus(): Promise<RecoverySystemStatus> {
  let explorer: RecoverySystemStatus["explorer"] = recoveryHealth("checking", "正在检测 Windows Explorer");
  try {
    const processId = await probeWindowsExplorerProcess();
    explorer = processId
      ? recoveryHealth("ready", `Explorer 正在运行 · PID ${processId}`)
      : recoveryHealth("unavailable", "未检测到 Explorer 进程");
  } catch (error) {
    explorer = recoveryHealth("degraded", `Explorer 检测失败：${error instanceof Error ? error.message : String(error)}`);
  }

  const host = database?.getAppState("wallpaper_host") ?? "unknown";
  const wallpaperHost = host === "Progman" || host === "WorkerW" || host === "attached"
    ? recoveryHealth("ready", `壁纸宿主已连接 · ${host}`)
    : host.includes("fallback")
      ? recoveryHealth("degraded", `壁纸宿主处于安全回退 · ${host}`)
      : recoveryHealth("checking", `壁纸宿主状态 · ${host}`);

  const accelerator = database?.getAppState("shortcut_peek") ?? "Control+Alt+Space";
  const shortcutState = database?.getAppState("shortcut_peek_status") ?? "unknown";
  const shortcutReady = shortcutState === "ready" && globalShortcut.isRegistered(accelerator);
  const shortcut = shortcutReady
    ? recoveryHealth("ready", `工作区快捷键可用 · ${accelerator}`)
    : shortcutState === "conflict"
      ? recoveryHealth("degraded", `快捷键冲突 · ${accelerator}`)
      : recoveryHealth("checking", `快捷键状态 · ${shortcutState}`);

  let runtimeRecovery: RecoverySystemStatus["runtimeRecovery"] = recoveryHealth("checking", "尚无桌面运行时恢复记录");
  const rawRecovery = database?.getAppState("desktop_runtime_recovery");
  if (rawRecovery) {
    try {
      const parsed = JSON.parse(rawRecovery) as { status?: string; reason?: string; at?: string; error?: string };
      const code: RecoveryHealthCode = parsed.status === "ready"
        ? "ready"
        : parsed.status === "failed"
          ? "degraded"
          : "checking";
      runtimeRecovery = recoveryHealth(code, [parsed.reason, parsed.at, parsed.error].filter(Boolean).join(" · ") || "恢复状态已记录");
    } catch {
      runtimeRecovery = recoveryHealth("degraded", "最近恢复状态无法解析");
    }
  }

  return { checkedAt: new Date().toISOString(), explorer, wallpaperHost, shortcut, runtimeRecovery };
}

function buildIpcDeps(): ServiceDeps {
  return {
    assertTrustedSender: assertTrustedIpcSender,
    desktop: {
      getDesktopController: () => desktopController,
      getFileScanner: () => fileScanner,
      getDatabase: () => database,
      getContainersWithIcons: containersWithNativeIcons,
      readFilePreview: readFilePreviewImpl,
      updateDesktopStatus,
      createOverlayWindow,
      closeOverlayWindow,
      showMainWindow: showMainWindowAndFocusSearch,
      hideMainWindow: () => mainWindow?.hide(),
      enterCleanDesktop,
      exitCleanDesktop,
      broadcastDesktopFiles: broadcastDesktopFilesUpdated
    },
    settings: {
      getDatabase: () => database,
      getWeather: () => weatherService?.getCurrentWeather() ?? Promise.reject(new Error("Weather not initialized")),
      getWallpaperLibrary: () => WALLPAPER_LIBRARY,
      applyWallpaper: applyWallpaperById,
      broadcastSettings: broadcastSettingsUpdated,
      syncWindows: syncWindowsFromSettings,
      validateSettingsPatch,
      sendChatMessage: (content) => aiService?.sendMessage(content) ?? Promise.reject(new Error("AI service is unavailable"))
    },
    window: {
      getAppInfo: () => ({ name: app.getName(), version: app.getVersion(), platform: process.platform, isPackaged: app.isPackaged }),
      showMainWindow: showMainWindowAndFocusSearch,
      showMainWindowAndFocusSearch,
      createSettingsWindow,
      openLogs: async () => {
        const result = await shell.openPath(logger?.directory ?? path.join(app.getPath("userData"), "logs"));
        if (result) throw new Error(result);
      }
    },
    pet: {
      getPetBounds: currentPetBounds,
      movePet: movePetWindow,
      resetPet: resetPetWindow,
      setPetInteractive: (interactive) => {
        const current = petWindow;
        if (current && !current.isDestroyed()) current.setIgnoreMouseEvents(!interactive, { forward: true });
      },
      showPetMenu: showPetContextMenu,
      showPet: () => updatePetSettings({ isVisible: true }),
      hidePet: () => updatePetSettings({ isVisible: false }),
      getSettings: () => database?.getSettings() ?? null,
      setOnboardingActive: (active) => {
        onboardingActive = active;
        const current = petWindow;
        if (!current || current.isDestroyed()) return;
        if (active) current.hide();
        else if (database?.getSettings().pet.isVisible) {
          current.showInactive();
          current.setAlwaysOnTop(true, "screen-saver");
        }
      }
    },
    suggestions: {
      getLatestSuggestion,
      getSuggestionControls: getSuggestionDeliveryControls,
      serializeOp: serializeSuggestionOperation,
      dismissSuggestion: async (suggestionId) => {
        const suggestion = getLatestSuggestion();
        if (suggestion?.id === suggestionId && database) {
          database.setAppState("suggestion:latest", JSON.stringify({ ...suggestion, status: "dismissed" as const }));
        }
      },
      snoozeSuggestions: async (minutes) => {
        if (suggestionEngine) await suggestionEngine.snoozeUntil(new Date(Date.now() + minutes * 60_000));
      },
      setSuggestionEnabled: async (enabled) => {
        if (!suggestionEngine) return;
        if (enabled) await suggestionEngine.enable();
        else await suggestionEngine.disable();
      },
      updateSuggestionPolicy: async (policy) => {
        const next: SuggestionDeliveryControls = {
          ...getSuggestionDeliveryControls(),
          policy: { ...policy, timeZoneOffsetMinutes: -new Date().getTimezoneOffset() }
        };
        saveSuggestionDeliveryControls(next);
        return next;
      },
      getDiagnosticsReport: createSupportDiagnosticsReport,
      exportDiagnostics: async () => {
        if (!diagnosticsService) throw new Error("Diagnostics not initialized");
        const report = createSupportDiagnosticsReport();
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const options = {
          title: "导出诊断",
          defaultPath: path.join(app.getPath("documents"), `ProjectD-${date}.json`),
          filters: [{ name: "JSON", extensions: ["json"] }]
        };
        const result = settingsWindow
          ? await dialog.showSaveDialog(settingsWindow, options)
          : await dialog.showSaveDialog(options);
        if (result.canceled || !result.filePath) return { status: "cancelled", filename: null };
        fs.writeFileSync(result.filePath, diagnosticsService.serializeForExport(report, { consent: true }), "utf8");
        return { status: "saved", filename: path.basename(result.filePath) };
      }
    },
    actions: {
      getEngine: () => actionEngine,
      getDesktopFiles: () => database?.getDesktopFiles() ?? [],
      getLatestSuggestion,
      saveLatestSuggestion: (suggestion) => database?.setAppState("suggestion:latest", JSON.stringify(suggestion)),
      isPlanAvailable: () => Boolean(database),
      isRescanAvailable: () => Boolean(fileScanner),
      rescanDesktop: async () => { await fileScanner?.scanDesktop(); },
      broadcastDesktopFiles: broadcastDesktopFilesUpdated,
      getInterruptedRecoveries: () => interruptedActionRecoveries
    },
    search: {
      getService: () => searchService,
      presentResult: toWorkspaceSearchResult,
      resolveResultPath: resolveWorkspaceSearchResultPath,
      pinToScene: async (resultId, sceneId) => {
        if (!sceneService) throw new Error("Scene service is unavailable");
        const target = searchResultRegistry.resolve(resultId);
        const resolvedPath = await resolveWorkspaceSearchResultPath(resultId);
        if (target.origin === "desktop") {
          const file = database?.getDesktopFileById(target.fileId);
          if (!file) throw new Error("Desktop resource is unavailable");
          sceneService.pinResource(sceneId, { origin: "desktop", fileId: target.fileId, path: resolvedPath, label: file.displayName || file.filename });
        } else if (target.origin === "portal") {
          sceneService.pinResource(sceneId, { origin: "portal", portalId: target.portalId, path: resolvedPath, label: path.basename(resolvedPath) });
        } else {
          sceneService.pinResource(sceneId, { origin: "external", provider: target.provider, path: resolvedPath, label: path.basename(resolvedPath) });
        }
      },
      authorizePortal: authorizeSearchResultPortal
    },
    scenes: {
      getService: () => sceneService,
      getSettings: () => database?.getSettings() ?? null,
      applyWallpaper: applyWallpaperById,
      syncWindows: syncWindowsFromSettings,
      syncPortalWatcher,
      broadcastPortals: broadcastPortalsUpdated,
      broadcastSettings: broadcastSettingsUpdated,
      broadcastDesktopFiles: broadcastDesktopFilesUpdated,
      log: (message, data) => logger?.info("app", message, data)
    },
    portals: {
      getService: () => portalService,
      approvedSelections: approvedPortalSelections,
      syncWatcher: syncPortalWatcher,
      broadcastUpdated: broadcastPortalsUpdated,
      log: (message, data) => logger?.info("app", message, data)
    },
    privacy: {
      exportData: exportAllUserData,
      resetData: resetAllUserData,
      getNetworkState: readPrivacyNetworkState,
      setNetworkPaused: updatePrivacyNetworkPaused
    },
    recovery: { getSystemStatus: getRecoverySystemStatus },
    shortcuts: { setPeekShortcut },
    autoRules: { getStore: () => database },
    updates: {
      getStatus: () => {
        if (!updateService) throw new Error("Update service is unavailable");
        return updateService.getStatus();
      },
      setChannel: (channel) => {
        if (!updateService) throw new Error("Update service is unavailable");
        return updateService.setChannel(channel);
      },
      checkForUpdates: () => updateService?.checkForUpdates() ?? Promise.reject(new Error("Update service is unavailable")),
      downloadUpdate: () => updateService?.downloadUpdate() ?? Promise.reject(new Error("Update service is unavailable")),
      installDownloadedUpdate: () => {
        if (!updateService) throw new Error("Update service is unavailable");
        updateService.installDownloadedUpdate();
      }
    },
    runtime: {
      getState: () => pauseArbiter.snapshot,
      setManualPaused: setRuntimeManualPaused,
      getMetrics: () => runtimeMetricsService?.report() ?? {
        generatedAt: new Date().toISOString(), sampleCount: 0, windowMinutes: 0,
        cpuMedianPercent: 0, cpuP95Percent: 0, peakWorkingSetBytes: 0,
        memoryGrowthPercent: 0, pausedSampleCount: 0, samples: []
      }
    },
    wallpaper: {
      getDisplays: getWallpaperDisplays,
      assignDisplay: assignWallpaperToDisplay
    }
  };
}

async function exportAllUserData(): Promise<{ cancelled: boolean; filename: string | null }> {
  if (!database) throw new Error("Database not initialized");
  const exportData = {
    format: "project-d-user-data",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    schemaVersion: Number(database.getAppState("schema_version") ?? "0"),
    excludes: ["api keys", "access tokens", "encrypted secret values"],
    data: database.exportUserData()
  };
  const owner = settingsWindow && !settingsWindow.isDestroyed() ? settingsWindow : mainWindow ?? undefined;
  const options = {
    title: "导出 Project D 数据",
    defaultPath: path.join(app.getPath("documents"), `ProjectD-export-${new Date().toISOString().slice(0, 10)}.json`),
    filters: [{ name: "JSON", extensions: ["json"] }]
  };
  const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return { cancelled: true, filename: null };
  fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), "utf8");
  logger?.info("app", "data exported", { filename: path.basename(result.filePath) });
  return { cancelled: false, filename: path.basename(result.filePath) };
}

async function resetAllUserData(): Promise<void> {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
  try {
    portalWatcher?.stop();
    suggestionEngine?.disable();
    wallpaperSupervisor?.stop();
    stopWallpaperRepairTimer();
    await desktopController?.deactivate();
    closeOverlayWindow();
    closePetWindow();
    closeWallpaperWindow();
    database?.close();
    const marker = path.join(app.getPath("userData"), "reset-requested.json");
    fs.writeFileSync(marker, JSON.stringify({ requestedAt: new Date().toISOString(), version: 1 }), "utf8");
    logger?.info("app", "reset requested, relaunching");
    app.relaunch();
    app.exit(0);
  } catch (error) {
    shutdownInProgress = false;
    logger?.error("app", "reset failed", { message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
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
  if (!app.isPackaged && process.env.PROJECTD_QA_IDLE === "1") {
    database.updateSettings({ wallpaper: { isDynamic: false }, pet: { isVisible: false } });
  }
  database.syncMediaAssets(WALLPAPER_LIBRARY);
  const operationsPublicKey = (process.env.PROJECTD_OPERATIONS_PUBLIC_KEY
    ?? database.getAppState("operations_public_key"))?.replace(/\\n/g, "\n") ?? null;
  operationsControl = new OperationsControlService({
    appVersion: app.getVersion(),
    configId: process.env.PROJECTD_OPERATIONS_CONFIG_ID ?? "project-d-production",
    endpoint: process.env.PROJECTD_OPERATIONS_CONFIG_URL ?? database.getAppState("operations_config_url"),
    publicKey: operationsPublicKey,
    state: {
      get: (key) => database?.getAppState(key) ?? null,
      set: (key, value) => database?.setAppState(key, value)
    },
    logger: {
      info: (message, data) => logger?.info("app", message, data),
      warn: (message, data) => logger?.warn("app", message, data)
    }
  });
  await operationsControl.initialize();
  operationsTelemetry = new OperationsTelemetryService(app.getVersion(), {
    get: (key) => database?.getAppState(key) ?? null,
    set: (key, value) => database?.setAppState(key, value)
  });
  operationsTelemetry.start();
  runtimeMetricsService = createRuntimeMetricsService();
  runtimeMetricsService.start();
  pauseArbiter.update({
    manual: database.getAppState("runtime_manual_paused") === "true",
    configuredMode: readPerformanceMode(),
    onBattery: powerMonitor.isOnBatteryPower()
  });
  syncLaunchAtLogin();
  updateService = new UpdateService({
    updater: autoUpdater,
    currentVersion: app.getVersion(),
    isPackaged: app.isPackaged,
    enableInDevelopment: process.env.PROJECTD_QA_ENABLE_UPDATER === "1",
    feedUrl: process.env.PROJECTD_UPDATE_FEED_URL ?? database.getAppState("update_feed_url"),
    useBundledFeed: hasConfiguredBundledUpdateFeed(),
    state: {
      get: (key) => database?.getAppState(key) ?? null,
      set: (key, value) => database?.setAppState(key, value)
    },
    logger: {
      info: (message, data) => logger?.info("app", message, data),
      warn: (message, data) => logger?.warn("app", message, data),
      error: (message, data) => logger?.error("error", message, data)
    },
    onStatusChanged: broadcastUpdateStatus,
    distributionAllowed: () => operationsControl?.version().distributionAllowed ?? true
  });
  wallpaperHost = new WallpaperHost(logger);
  wallpaperSupervisor = new WallpaperHostSupervisor({
    fallbackIntervalMs: 90_000,
    repair: repairWallpaperHost,
    onError: (error, reason) => {
      logger?.warn("app", "wallpaper repair supervisor caught an error", {
        reason,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  runtimeRecovery = new DesktopRuntimeRecovery({
    reconcileDisplayBounds: reconcileDesktopRuntimeBounds,
    repairWallpaperHost,
    rescanDesktop: async () => {
      if (!fileScanner) return;
      await fileScanner.scanDesktop();
      broadcastDesktopFilesUpdated();
    },
    record: (state) => {
      if (shutdownInProgress) return;
      database?.setAppState("desktop_runtime_recovery", JSON.stringify(state));
      logger?.[state.status === "failed" ? "warn" : "info"]("desktop-state", "desktop runtime recovery", state);
    }
  });
  explorerMonitor = new ExplorerProcessMonitor({
    onRestart: (previousProcessId, currentProcessId) => {
      logger?.warn("desktop-state", "Explorer restart detected", { previousProcessId, currentProcessId });
      runtimeRecovery?.request("explorer-restarted", true);
    },
    onError: (error) => logger?.warn("desktop-state", "Explorer monitor probe failed", {
      message: error instanceof Error ? error.message : String(error)
    })
  });
  explorerMonitor.start();
  weatherService = new WeatherService(database, logger, () => operationsFeatureEnabled("online.weather"));
  aiService = new AiService(database, weatherService, logger, () => operationsFeatureEnabled("online.ai"));
  aiService.setSettingsChangedHandler((settings) => {
    syncWindowsFromSettings(settings);
    broadcastSettingsUpdated();
  });
  desktopController = new DesktopController(database, logger);
  desktopController.initialize();
  desktopStatus = await desktopController.bootRecoveryCheck();
  fileScanner = new FileScanner(database, logger);
  actionEngine = new ActionEngine(database, logger, app.getPath("desktop"));
  sceneService = new SceneService(database, { getDisplays: runtimeDisplays });
  portalService = new PortalService(database);
  portalWatcher = new PortalWatcher((event) => {
    logger?.[event.reason === "error" ? "warn" : "info"]("app", "folder portal watcher event", event);
    broadcastPortalsUpdated();
  });
  syncPortalWatcher();
  searchService = new SearchService({
    getDesktopCandidates: () => database!.getDesktopFiles()
      .filter((file) => !file.isMissing)
      .map((file) => ({
        id: `desktop:${file.id}`,
        title: file.displayName || file.filename,
        fullPath: file.fullPath,
        category: file.category,
        modifiedAt: file.modifiedAt
      })),
    getPortalCandidates: getPortalSearchCandidates,
    everythingSearch: isEverythingAvailable() ? (query, limit, signal) => searchEverything(query, limit, signal) : undefined,
    windowsSearch: (_query, limit, _signal) => searchWindowsSearch(_query, limit)
  });
  suggestionEngine = new SuggestionEngine({
    getByFingerprint: (fingerprint) => parseSuggestion(database?.getAppState(suggestionFingerprintKey(fingerprint)) ?? null),
    getLatestCreatedAt: () => parseSuggestion(database?.getAppState("suggestion:latest") ?? null)?.createdAt ?? null,
    getLatestCreatedAtForKind: (kind) => {
      const raw = database?.getAppState("suggestion:delivery-history");
      try {
        const parsed = raw ? JSON.parse(raw) as Array<{ kind?: unknown; createdAt?: unknown }> : [];
        return parsed
          .filter((entry): entry is { kind: string; createdAt: string } => entry.kind === kind && typeof entry.createdAt === "string")
          .map((entry) => entry.createdAt)
          .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
      } catch {
        return null;
      }
    },
    getCreatedSince: (since) => {
      const raw = database?.getAppState("suggestion:delivery-history");
      try {
        const parsed = raw ? JSON.parse(raw) as Array<{ kind?: unknown; createdAt?: unknown }> : [];
        return parsed
          .filter((entry): entry is { kind: string; createdAt: string } => (
            typeof entry.kind === "string"
            && typeof entry.createdAt === "string"
            && Date.parse(entry.createdAt) >= Date.parse(since)
          ));
      } catch {
        return [];
      }
    },
    save: (record, fingerprint) => {
      database?.setAppState(suggestionFingerprintKey(fingerprint), JSON.stringify(record));
      const raw = database?.getAppState("suggestion:delivery-history");
      let history: Array<{ kind: string; createdAt: string }> = [];
      try {
        const parsed = raw ? JSON.parse(raw) as Array<{ kind?: unknown; createdAt?: unknown }> : [];
        history = parsed.filter((entry): entry is { kind: string; createdAt: string } => (
          typeof entry.kind === "string" && typeof entry.createdAt === "string"
        ));
      } catch {
        history = [];
      }
      history.push({ kind: record.kind, createdAt: record.createdAt });
      database?.setAppState("suggestion:delivery-history", JSON.stringify(history.slice(-100)));
    },
    getDeliveryControls: getSuggestionDeliveryControls,
    saveDeliveryControls: saveSuggestionDeliveryControls
  });
  await inspectInterruptedActions();
  registerGlobalShortcuts();

  logger.info("app", "core services ready", status);

  try {
    await fileScanner.scanDesktop();
    await evaluateDesktopSuggestion();
    await fileScanner.startWatching(() => {
      broadcastDesktopFilesUpdated();
      void evaluateDesktopSuggestion().catch((error) => {
        logger?.warn("app", "desktop suggestion evaluation failed", {
          message: error instanceof Error ? error.message : String(error)
        });
      });
    });
  } catch (error) {
    logger.error("error", "initial desktop scan failed", {
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

async function activateDesktopOnStartup(): Promise<void> {
  if (database?.getAppState("auto_activate_on_start") !== "true") {
    return;
  }

  desktopStatus = (await desktopController?.activate()) ?? updateDesktopStatus("safe-mode");
  createOverlayWindow(desktopStatus.mode === "safe-mode");
  mainWindow?.hide();
  sendMenuCommand(MENU_COMMANDS.ACTIVATE_DESKTOP);
  logger?.info("desktop-state", "desktop activated from startup preference", { mode: desktopStatus.mode });
}

async function shutdownSafely(): Promise<void> {
  try {
    const result = await runWithDeadline(async () => {
      cleanDesktopEscapeGuard.disarm();
      try {
        const currentMode = desktopController?.getStatus().mode ?? desktopStatus.mode;
        if (["active", "activating", "deactivating", "error", "safe-mode"].includes(currentMode)) {
          desktopStatus = (await desktopController?.deactivate()) ?? updateDesktopStatus("idle");
          logger?.info("desktop-state", "desktop restored before application quit", { previousMode: currentMode });
        }
      } catch (error) {
        logger?.error("desktop-state", "desktop restore failed during application quit", {
          message: error instanceof Error ? error.message : String(error)
        });
      }

      logger?.info("app", "application quitting");
      if (!app.isPackaged && process.env.PROJECTD_QA_HANG_SHUTDOWN === "1") {
        writeBootstrapLog("QA shutdown hang injected");
        await new Promise<void>(() => undefined);
      }
      await fileScanner?.stopWatching();
      portalWatcher?.stop();
      stopRuntimePresenceMonitor();
      runtimeMetricsService?.stop();
      const qaMetricsPath = process.env.PROJECTD_QA_METRICS_PATH;
      if (runtimeMetricsService && qaMetricsPath) {
        fs.mkdirSync(path.dirname(qaMetricsPath), { recursive: true });
        fs.writeFileSync(qaMetricsPath, JSON.stringify(runtimeMetricsService.report(), null, 2), "utf8");
      }
      runtimeMetricsService = null;
      runtimeRecovery?.stop();
      runtimeRecovery = null;
      explorerMonitor?.stop();
      explorerMonitor = null;
      updateService?.dispose();
      updateService = null;
      operationsControl?.dispose();
      operationsControl = null;
      operationsTelemetry?.finish();
      operationsTelemetry = null;
      portalWatcher = null;
      rendererResilience.disposeAll();
      closeOverlayWindow();
      closeWallpaperWindow();
      closePetWindow();
      database?.close();
      tray?.destroy();
      tray = null;
    }, 8_000, () => {
      writeBootstrapLog("shutdown deadline exceeded", { timeoutMs: 8_000 });
      logger?.error("error", "shutdown deadline exceeded; forcing process exit", { timeoutMs: 8_000 });
      process.exit(1);
    });

    if (result === "completed") {
      writeBootstrapLog("shutdown completed");
      process.exit(0);
    }
  } catch (error) {
    writeBootstrapLog("shutdown cleanup failed", {
      message: error instanceof Error ? error.message : String(error)
    });
    logger?.error("error", "shutdown cleanup failed; forcing process exit", {
      message: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

Menu.setApplicationMenu(null);
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

      const userDataPath = app.getPath("userData");
      const resetMarker = path.join(userDataPath, "reset-requested.json");
      if (fs.existsSync(resetMarker)) {
        try {
          writeBootstrapLog("reset-requested", { marker: resetMarker });
          const retainedRuntimeEntries: string[] = [];
          for (const entry of fs.readdirSync(userDataPath, { withFileTypes: true })) {
            if (entry.name === path.basename(resetMarker)) continue;
            try {
              fs.rmSync(path.join(userDataPath, entry.name), { recursive: entry.isDirectory(), force: true });
            } catch {
              retainedRuntimeEntries.push(entry.name);
            }
          }
          if (fs.existsSync(path.join(userDataPath, "database.sqlite"))) {
            throw new Error("Project D database is still locked after reset cleanup");
          }
          fs.unlinkSync(resetMarker);
          writeBootstrapLog("reset-cleanup-complete", { retainedRuntimeEntries });
        } catch (error) {
          writeBootstrapLog("reset-cleanup-failed", { message: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      }

      await initializeCoreServices();
      registerWallpaperRepairTriggers();
      startRuntimePresenceMonitor();
      registerIpc();

      tray = createTray();
      const startupSettings = database?.getSettings();
      if (startupSettings?.wallpaper.isDynamic) {
        createWallpaperWindow();
      }
      mainWindow = createWindow();
      if (process.env.PROJECTD_QA_OPEN_SETTINGS === "1") {
        createSettingsWindow();
      }
      if (startupSettings?.pet.isVisible) {
        createPetWindow();
        resizePetWindowForScale(startupSettings.pet.scale);
      }
      updateService?.scheduleAutomaticCheck();
      scheduleQaRendererFaultInjection();
      scheduleQaSoakChurn();
      setTimeout(() => {
        void activateDesktopOnStartup();
      }, 900);
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

app.on("child-process-gone", (_event, details) => {
  logger?.warn("app", "electron child process exited", {
    type: details.type,
    reason: details.reason,
    exitCode: details.exitCode,
    serviceName: details.serviceName,
    name: details.name
  });
  operationsTelemetry?.recordCrash(
    details.type === "GPU" ? "gpu" : details.type === "Utility" ? "utility" : "unknown",
    `${details.type}:${details.reason}:${details.serviceName ?? "unknown"}`,
    false
  );
  if (!shutdownInProgress && (details.type === "GPU" || details.type === "Utility")) {
    setTimeout(() => {
      void rendererResilience.probeAll(`child-process-gone:${details.type}`);
    }, 500).unref?.();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    mainWindow = null;
  }
});

app.on("before-quit", (event) => {
  if (shutdownInProgress) {
    return;
  }

  event.preventDefault();
  shutdownInProgress = true;
  void shutdownSafely();
});

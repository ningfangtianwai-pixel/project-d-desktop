import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { ChatResponse, CurrentWeather, SettingsPatch, SettingsSnapshot, WallpaperLibraryItem } from "../../shared/types.js";

type TrustedSenderGuard = (event: IpcMainInvokeEvent, routes?: string[]) => void;

const READABLE_STATE_KEYS = new Set([
  "wallpaper_host",
  "weather_location_source",
  "recovery_script_path",
  "performance_mode",
  "auto_activate_on_start",
  "cover_all_displays",
  "shortcut_peek",
  "shortcut_peek_status",
  "boot_recovery_notice"
]);
const WRITABLE_STATE_KEYS = new Set(["boot_recovery_notice"]);

export interface SettingsIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: TrustedSenderGuard;
  getDatabase: () => { getSettings(): SettingsSnapshot; updateSettings(patch: SettingsPatch): SettingsSnapshot; getAiRuntimeConfig(): { apiKey?: string | null; endpoint: string; model: string }; getAppState(key: string): string | null; setAppState(key: string, value: string): void; getChatHistory(limit?: number): unknown[]; addChatMessage(role: string, content: string, personality?: string, weather?: string): unknown; clearChatHistory(): void } | null;
  getWeather: () => Promise<CurrentWeather>;
  getWallpaperLibrary: () => WallpaperLibraryItem[];
  applyWallpaper: (id: string) => SettingsSnapshot;
  broadcastSettings: () => void;
  syncWindows: (settings: SettingsSnapshot) => void;
  validateSettingsPatch: (patch: unknown) => SettingsPatch;
  tryAiReply: (input: string, weather: string, history: unknown[], personality: string) => Promise<string | null>;
  createLocalAiReply: (input: string, personality: string, weather: string) => string;
  sendChatMessage: (content: string) => Promise<ChatResponse>;
}

export function registerSettingsIpcHandlers(deps: SettingsIpcDependencies): void {
  const { ipc, assertTrustedSender, getDatabase } = deps;

  ipc.handle(IPC_CHANNELS.SETTINGS_GET_ALL, (event): SettingsSnapshot | undefined => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay", "#/wallpaper", "#/pet"]);
    return getDatabase()?.getSettings();
  });

  ipc.handle(IPC_CHANNELS.SETTINGS_UPDATE, (event, patch: unknown): SettingsSnapshot => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay"]);
    const validated = deps.validateSettingsPatch(patch);
    const settings = getDatabase()?.updateSettings(validated);
    if (!settings) throw new Error("Database is not initialized");
    deps.syncWindows(settings);
    deps.broadcastSettings();
    return settings;
  });

  ipc.handle(IPC_CHANNELS.STATE_GET, (event, key: unknown) => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay", "#/wallpaper", "#/pet"]);
    if (typeof key !== "string" || !READABLE_STATE_KEYS.has(key)) throw new Error("State key is not readable");
    return getDatabase()?.getAppState(key) ?? null;
  });

  ipc.handle(IPC_CHANNELS.STATE_SET, (event, key: unknown, value: unknown) => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay", "#/wallpaper", "#/pet"]);
    if (typeof key !== "string" || !WRITABLE_STATE_KEYS.has(key)) throw new Error("State key is not writable");
    if (typeof value !== "string" || value.length > 8_000) throw new Error("Invalid state value");
    getDatabase()?.setAppState(key, value);
  });

  ipc.handle(IPC_CHANNELS.WALLPAPER_LIBRARY_GET, (event) => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay", "#/wallpaper"]);
    return deps.getWallpaperLibrary();
  });

  ipc.handle(IPC_CHANNELS.WALLPAPER_APPLY, (event, wallpaperId: unknown): SettingsSnapshot => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay"]);
    if (typeof wallpaperId !== "string" || wallpaperId.length > 80) throw new Error("Invalid wallpaper id");
    return deps.applyWallpaper(wallpaperId);
  });

  ipc.handle(IPC_CHANNELS.WEATHER_GET_CURRENT, async (event): Promise<CurrentWeather> => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay", "#/wallpaper", "#/pet"]);
    return deps.getWeather();
  });

  ipc.handle(IPC_CHANNELS.AI_CHAT_SEND, async (event, content: unknown) => {
    assertTrustedSender(event, [""]);
    if (typeof content !== "string" || content.trim().length === 0 || content.length > 2_000) {
      throw new Error("Invalid chat message");
    }
    return deps.sendChatMessage(content.trim());
  });

  ipc.handle(IPC_CHANNELS.AI_CHAT_HISTORY, (event) => {
    assertTrustedSender(event, [""]);
    return getDatabase()?.getChatHistory(40) ?? [];
  });

  ipc.handle(IPC_CHANNELS.AI_CHAT_CLEAR, (event): void => {
    assertTrustedSender(event, ["", "#/settings"]);
    getDatabase()?.clearChatHistory();
  });
}

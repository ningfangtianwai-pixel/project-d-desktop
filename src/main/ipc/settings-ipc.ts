import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { AiConnectionTestResult, ChatResponse, CurrentWeather, PetVisualDraftRequest, SettingsPatch, SettingsSnapshot, WallpaperLibraryItem } from "../../shared/types.js";
import { validatePetVisualProfile } from "../../shared/pet-visual-profile.js";

type TrustedSenderGuard = (event: IpcMainInvokeEvent, routes?: string[]) => void;

const READABLE_STATE_KEYS = new Set([
  "wallpaper_host",
  "weather_location_source",
  "recovery_script_path",
  "performance_mode",
  "auto_activate_on_start",
  "launch_at_login",
  "cover_all_displays",
  "clean_desktop_exit_shortcut",
  "theme_mode",
  "wallpaper_save_original",
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
  importWallpaper: () => Promise<WallpaperLibraryItem | null>;
  importLivePhotoWallpaper: () => Promise<WallpaperLibraryItem | null>;
  importGeneratedWallpaper: (dataUrl: string, label: string) => Promise<WallpaperLibraryItem>;
  deleteWallpaper: (id: string) => void;
  applyWallpaper: (id: string) => SettingsSnapshot;
  exportWallpaperOriginal: (id: string) => Promise<{ cancelled: boolean; filename: string | null }>;
  broadcastSettings: () => void;
  syncWindows: (settings: SettingsSnapshot) => void;
  validateSettingsPatch: (patch: unknown) => SettingsPatch;
  sendChatMessage: (content: string) => Promise<ChatResponse>;
  testAiConnection: () => Promise<AiConnectionTestResult>;
  draftPetVisualProfile: (request: PetVisualDraftRequest) => Promise<import("../../shared/pet-visual-profile.js").PetVisualProfile>;
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

  ipc.handle(IPC_CHANNELS.WALLPAPER_IMPORT, async (event): Promise<WallpaperLibraryItem | null> => {
    assertTrustedSender(event, ["#/settings"]);
    return deps.importWallpaper();
  });

  ipc.handle(IPC_CHANNELS.WALLPAPER_IMPORT_LIVE_PHOTO, async (event): Promise<WallpaperLibraryItem | null> => {
    assertTrustedSender(event, ["#/settings"]);
    return deps.importLivePhotoWallpaper();
  });

  ipc.handle(IPC_CHANNELS.WALLPAPER_IMPORT_GENERATED, async (event, dataUrl: unknown, label: unknown): Promise<WallpaperLibraryItem> => {
    assertTrustedSender(event, ["#/settings"]);
    if (typeof dataUrl !== "string" || dataUrl.length > 42_000_000 || typeof label !== "string" || label.length > 120) {
      throw new Error("Invalid generated wallpaper payload");
    }
    return deps.importGeneratedWallpaper(dataUrl, label);
  });

  ipc.handle(IPC_CHANNELS.WALLPAPER_DELETE, (event, wallpaperId: unknown): void => {
    assertTrustedSender(event, ["#/settings"]);
    if (typeof wallpaperId !== "string" || wallpaperId.length > 80) throw new Error("Invalid wallpaper id");
    deps.deleteWallpaper(wallpaperId);
  });

  ipc.handle(IPC_CHANNELS.WALLPAPER_APPLY, (event, wallpaperId: unknown): SettingsSnapshot => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay"]);
    if (typeof wallpaperId !== "string" || wallpaperId.length > 80) throw new Error("Invalid wallpaper id");
    return deps.applyWallpaper(wallpaperId);
  });

  ipc.handle(IPC_CHANNELS.WALLPAPER_EXPORT_ORIGINAL, async (event, wallpaperId: unknown) => {
    assertTrustedSender(event, ["#/settings"]);
    if (typeof wallpaperId !== "string" || wallpaperId.length > 80) throw new Error("Invalid wallpaper id");
    return deps.exportWallpaperOriginal(wallpaperId);
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

  ipc.handle(IPC_CHANNELS.AI_TEST_CONNECTION, async (event): Promise<AiConnectionTestResult> => {
    assertTrustedSender(event, ["#/settings"]);
    return deps.testAiConnection();
  });

  ipc.handle(IPC_CHANNELS.AI_CHAT_HISTORY, (event) => {
    assertTrustedSender(event, [""]);
    return getDatabase()?.getChatHistory(40) ?? [];
  });

  ipc.handle(IPC_CHANNELS.AI_CHAT_CLEAR, (event): void => {
    assertTrustedSender(event, ["", "#/settings"]);
    getDatabase()?.clearChatHistory();
  });

  ipc.handle(IPC_CHANNELS.AI_PET_VISUAL_DRAFT, async (event, request: unknown) => {
    assertTrustedSender(event, ["#/settings"]);
    if (!request || typeof request !== "object") throw new Error("Invalid visual draft request");
    const draft = request as Partial<PetVisualDraftRequest>;
    if (typeof draft.characterId !== "string" || typeof draft.imageDataUrl !== "string" || draft.consent !== true) {
      throw new Error("Visual request requires an explicit consent confirmation");
    }
    return deps.draftPetVisualProfile({ characterId: draft.characterId, imageDataUrl: draft.imageDataUrl, consent: true });
  });

  ipc.handle(IPC_CHANNELS.AI_PET_VISUAL_SAVE, (event, characterId: unknown, profile: unknown): void => {
    assertTrustedSender(event, ["#/settings"]);
    if (typeof characterId !== "string" || characterId.length > 80) throw new Error("Invalid character id");
    const validated = validatePetVisualProfile(profile);
    if (!validated) throw new Error("Invalid visual profile");
    const database = getDatabase();
    if (!database) throw new Error("Database is not initialized");
    database.setAppState(`pet_visual_profile:${characterId}`, JSON.stringify(validated));
  });
}

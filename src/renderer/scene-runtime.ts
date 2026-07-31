/**
 * AmbientScene Runtime
 *
 * Creates, loads, saves, and switches AmbientScene instances.
 * Bridges the type-only definition in types.ts with actual runtime behavior:
 * capturing the current app state as a scene snapshot and applying it later.
 */
import type { AmbientScene, PetAnchor, SafeRegion, SettingsSnapshot, WallpaperLibraryItem } from "../shared/types";

// ── scene registry (in-memory, backed by IPC persistence) ──

let sceneCache: AmbientScene[] | null = null;

export async function getSceneLibrary(): Promise<AmbientScene[]> {
  if (sceneCache) return sceneCache;
  try {
    const raw = await window.projectD.getState("scene_library_v1");
    sceneCache = raw ? JSON.parse(raw) : [];
  } catch {
    sceneCache = [];
  }
  return sceneCache!;
}

async function persistSceneLibrary(scenes: AmbientScene[]): Promise<void> {
  sceneCache = scenes;
  try {
    await window.projectD.setState("scene_library_v1", JSON.stringify(scenes));
  } catch {
    /* non-critical */
  }
}

// ── scene creation ──

export interface SceneCaptureInput {
  name: string;
  settings: SettingsSnapshot;
  wallpaper: WallpaperLibraryItem | null;
  wallpaperLibrary: WallpaperLibraryItem[];
  petAnchors?: PetAnchor[];
  safeRegions?: SafeRegion[];
}

export function captureScene(input: SceneCaptureInput): AmbientScene {
  const wp = input.wallpaper;
  return {
    id: `scene-${Date.now().toString(36)}`,
    name: input.name,
    wallpaper: {
      sourceId: wp?.id ?? "",
      posterFallback: wp?.id ? wp.id : undefined,
    },
    visualProfile: {
      brightness: "dark" as const,
      subjectSafeRegions: input.safeRegions ?? [],
      accentPalette: [],
    },
    weather: {
      type: (input.settings.weather.manualWeather as AmbientScene["weather"]["type"]) ?? "none",
      intensity: input.settings.weather.particleIntensity ?? 0.55,
      qualityPolicy: input.settings.weather.mode ?? "auto",
    },
    pet: {
      characterId: input.settings.pet.characterId ?? "luna-q",
      personality: input.settings.pet.personality ?? "gentle",
      anchorLanes: input.petAnchors ?? [],
      actionFrequency: input.settings.pet.talkFrequency ?? "normal",
    },
    ui: {
      edgeRailPlacement: "right",
      glassPreset: "default",
    },
    workspace: {},
    performance: {
      profile: "balanced",
    },
  };
}

// ── scene persistence ──

export async function saveScene(scene: AmbientScene): Promise<AmbientScene> {
  const scenes = await getSceneLibrary();
  const idx = scenes.findIndex((s) => s.id === scene.id);
  if (idx >= 0) {
    scenes[idx] = scene;
  } else {
    scenes.push(scene);
  }
  await persistSceneLibrary(scenes);
  return scene;
}

export async function deleteScene(sceneId: string): Promise<void> {
  const scenes = await getSceneLibrary();
  await persistSceneLibrary(scenes.filter((s) => s.id !== sceneId));
}

export async function renameScene(sceneId: string, newName: string): Promise<AmbientScene | null> {
  const scenes = await getSceneLibrary();
  const scene = scenes.find((s) => s.id === sceneId);
  if (!scene) return null;
  scene.name = newName;
  await persistSceneLibrary(scenes);
  return scene;
}

// ── scene application (switching) ──

export interface SceneApplyResult {
  sceneId: string;
  wallpaperChanged: boolean;
  weatherChanged: boolean;
  petChanged: boolean;
}

export async function applyScene(scene: AmbientScene): Promise<SceneApplyResult> {
  const result: SceneApplyResult = {
    sceneId: scene.id,
    wallpaperChanged: false,
    weatherChanged: false,
    petChanged: false,
  };

  // 1. Wallpaper
  if (scene.wallpaper.sourceId) {
    try {
      await window.projectD.applyWallpaper(scene.wallpaper.sourceId);
      result.wallpaperChanged = true;
    } catch {
      /* wallpaper not found - silently skip */
    }
  }

  // 2. Weather
  if (scene.weather.type && scene.weather.type !== "none") {
    try {
      await window.projectD.setState("weather_mode", scene.weather.qualityPolicy);
      await window.projectD.setState("weather_particle_intensity", String(scene.weather.intensity));
      await window.projectD.setState("weather_manual_condition", scene.weather.type);
      result.weatherChanged = true;
    } catch {
      /* weather config not critical */
    }
  }

  // 3. Pet
  if (scene.pet.characterId) {
    try {
      await window.projectD.setState("pet_character_id", scene.pet.characterId);
      await window.projectD.setState("pet_personality", scene.pet.personality);
      await window.projectD.setState("pet_talk_frequency", scene.pet.actionFrequency);
      result.petChanged = true;
    } catch {
      /* pet config not critical */
    }
  }

  return result;
}

// ── scene export/import ──

export function exportScene(scene: AmbientScene): string {
  return JSON.stringify(scene, null, 2);
}

export function importScene(json: string): AmbientScene | null {
  try {
    const parsed = JSON.parse(json) as AmbientScene;
    if (!parsed.id || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

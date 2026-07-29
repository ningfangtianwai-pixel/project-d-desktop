export type DesktopExperienceMode = "native" | "immersive" | "task" | "clean" | "safe";

export type InteractionState = "idle" | "attention" | "focused";

export type DesktopTaskSurface = "search" | "organize" | "scene" | "assistant" | null;

export interface DesktopExperienceState {
  mode: DesktopExperienceMode;
  interaction: InteractionState;
  activeSurface: DesktopTaskSurface;
}

export const DEFAULT_DESKTOP_EXPERIENCE: DesktopExperienceState = {
  mode: "native",
  interaction: "idle",
  activeSurface: null
};

export function enterImmersive(): DesktopExperienceState {
  return { mode: "immersive", interaction: "idle", activeSurface: null };
}

export function openDesktopSurface(surface: Exclude<DesktopTaskSurface, null>): DesktopExperienceState {
  return {
    mode: "task",
    interaction: "focused",
    activeSurface: surface
  };
}

export function closeDesktopSurface(): DesktopExperienceState {
  return enterImmersive();
}

export function enterNative(): DesktopExperienceState {
  return DEFAULT_DESKTOP_EXPERIENCE;
}

export function enterClean(): DesktopExperienceState {
  return { mode: "clean", interaction: "idle", activeSurface: null };
}

export function enterSafe(): DesktopExperienceState {
  return { mode: "safe", interaction: "attention", activeSurface: null };
}

export function modeForDesktopStatus(
  statusMode: "idle" | "activating" | "active" | "deactivating" | "safe-mode" | "error"
): DesktopExperienceMode {
  if (statusMode === "safe-mode" || statusMode === "error") return "safe";
  if (statusMode === "active" || statusMode === "activating" || statusMode === "deactivating") return "immersive";
  return "native";
}

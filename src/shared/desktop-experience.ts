export type DesktopExperienceMode = "quiet" | "attention" | "task" | "clean" | "safe";

export type DesktopTaskSurface = "search" | "organize" | "inbox" | "assistant" | "wallpaper" | null;

export interface DesktopExperienceState {
  mode: DesktopExperienceMode;
  activeSurface: DesktopTaskSurface;
}

export const DEFAULT_DESKTOP_EXPERIENCE: DesktopExperienceState = {
  mode: "quiet",
  activeSurface: null
};

export function openDesktopSurface(surface: Exclude<DesktopTaskSurface, null>): DesktopExperienceState {
  return {
    mode: "task",
    activeSurface: surface
  };
}

export function closeDesktopSurface(): DesktopExperienceState {
  return DEFAULT_DESKTOP_EXPERIENCE;
}

export function modeForDesktopStatus(
  statusMode: "idle" | "activating" | "active" | "deactivating" | "safe-mode" | "error"
): DesktopExperienceMode {
  if (statusMode === "safe-mode") return "safe";
  if (statusMode === "error") return "attention";
  if (statusMode === "active" || statusMode === "activating" || statusMode === "deactivating") return "task";
  return "quiet";
}

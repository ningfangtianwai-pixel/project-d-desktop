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

/** App.vue 编排边界：App 与组件之间的职责接口 */
export interface AppOrchestrationState {
  experience: DesktopExperienceState;
  wallpaperLabel: string;
  weatherLabel: string;
  petLabel: string;
  petVisible: boolean;
  hostLabel: string;
  city: string;
  taskLabel: string;
}

export interface AppOrchestrationActions {
  wake: () => void;
  sleep: () => void;
  openSurface: (surface: DesktopTaskSurface) => void;
  closeSurface: () => void;
  enterClean: () => void;
  exitClean: () => void;
  enterSafe: () => void;
  restore: () => void;
  openSettings: () => void;
  openLogs: () => void;
}

export interface SurfaceComponent {
  id: string;
  surface: DesktopTaskSurface;
  visible: boolean;
  priority: number;
}


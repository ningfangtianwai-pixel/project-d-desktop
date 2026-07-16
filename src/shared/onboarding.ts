export const ONBOARDING_STORAGE_KEY = "projectd:onboarding:v1";
export const ONBOARDING_VERSION = 1;

export type OnboardingStatus = "pending" | "completed" | "skipped";

export interface OnboardingState {
  version: number;
  currentStep: number;
  status: OnboardingStatus;
  updatedAt: string;
}

export interface OnboardingStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function defaultOnboardingState(now = new Date()): OnboardingState {
  return { version: ONBOARDING_VERSION, currentStep: 0, status: "pending", updatedAt: now.toISOString() };
}

export function normalizeOnboardingState(value: unknown, stepCount: number, now = new Date()): OnboardingState {
  const fallback = defaultOnboardingState(now);
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<OnboardingState>;
  if (candidate.version !== ONBOARDING_VERSION) return fallback;
  if (candidate.status !== "pending" && candidate.status !== "completed" && candidate.status !== "skipped") return fallback;
  const currentStep = typeof candidate.currentStep === "number" && Number.isInteger(candidate.currentStep)
    ? Math.min(Math.max(candidate.currentStep, 0), Math.max(0, stepCount - 1))
    : 0;
  return {
    version: ONBOARDING_VERSION,
    currentStep,
    status: candidate.status,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now.toISOString()
  };
}

export function readOnboardingState(storage: OnboardingStorage, stepCount: number): OnboardingState {
  try {
    const raw = storage.getItem(ONBOARDING_STORAGE_KEY);
    return normalizeOnboardingState(raw ? JSON.parse(raw) : null, stepCount);
  } catch {
    return defaultOnboardingState();
  }
}

export function writeOnboardingState(storage: OnboardingStorage, state: OnboardingState): void {
  try {
    storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A disabled storage backend must not block the user from entering the app.
  }
}

export function advanceOnboarding(state: OnboardingState, stepCount: number, now = new Date()): OnboardingState {
  const lastStep = Math.max(0, stepCount - 1);
  return {
    ...state,
    currentStep: Math.min(state.currentStep + 1, lastStep),
    status: state.currentStep >= lastStep ? "completed" : "pending",
    updatedAt: now.toISOString()
  };
}

export function finishOnboarding(state: OnboardingState, status: Exclude<OnboardingStatus, "pending">, now = new Date()): OnboardingState {
  return { ...state, status, updatedAt: now.toISOString() };
}

export function shouldShowOnboarding(state: OnboardingState): boolean {
  return state.status === "pending";
}

export function resetOnboarding(storage: OnboardingStorage): void {
  storage.removeItem(ONBOARDING_STORAGE_KEY);
}

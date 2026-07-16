import type { SettingsPatch } from "../shared/types.js";

type Rule = (value: unknown) => boolean;

const isBoolean: Rule = (value) => typeof value === "boolean";
const optionalString = (max: number): Rule => (value) => value === null || (typeof value === "string" && value.length <= max);
const string = (max: number): Rule => (value) => typeof value === "string" && value.length <= max;
const number = (minimum: number, maximum: number): Rule => (value) => (
  typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum
);
const integer = (minimum: number, maximum: number): Rule => (value) => (
  typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum
);
const oneOf = (values: readonly string[]): Rule => (value) => typeof value === "string" && values.includes(value);

const sectionRules: Record<string, Record<string, Rule>> = {
  wallpaper: {
    currentStyle: string(40),
    currentIndex: integer(0, 99),
    dynamicId: optionalString(80),
    isDynamic: isBoolean,
    autoRotate: isBoolean,
    rotateInterval: integer(30, 86_400)
  },
  weather: {
    mode: oneOf(["manual", "auto"]),
    manualWeather: oneOf(["clear", "rain", "snow", "fog", "leaves", "light"]),
    city: optionalString(80),
    apiKey: optionalString(512),
    particleIntensity: number(0, 1.2),
    enableBorderInteraction: isBoolean
  },
  pet: {
    characterId: string(60),
    currentOutfit: string(60),
    scale: number(0.5, 2),
    isVisible: isBoolean,
    personality: string(60),
    autoOutfit: isBoolean,
    actionInterval: integer(15, 3_600),
    talkFrequency: oneOf(["silent", "rare", "normal", "chatty"])
  },
  ai: {
    provider: oneOf(["local-fallback", "openai-compatible", "ollama", "deepseek", "xiaomi-mimo"]),
    apiKey: optionalString(1_024),
    apiEndpoint: (value) => typeof value === "string" && value.length <= 300 && isSafeEndpoint(value),
    model: string(120),
    temperature: number(0, 2),
    maxTokens: integer(32, 4_096),
    dailyLimit: integer(1, 100_000),
    enabled: isBoolean
  }
};

const writableStateKeys = new Set(["auto_activate_on_start", "performance_mode"]);

export function validateSettingsPatch(input: unknown): SettingsPatch {
  if (!isPlainObject(input)) throw new Error("Invalid settings patch");
  const allowedTopLevel = new Set([...Object.keys(sectionRules), "appState"]);
  for (const key of Object.keys(input)) {
    if (!allowedTopLevel.has(key)) throw new Error(`Unknown settings section: ${key}`);
  }

  for (const [section, rules] of Object.entries(sectionRules)) {
    const value = input[section];
    if (value === undefined) continue;
    if (!isPlainObject(value)) throw new Error(`Invalid ${section} settings`);
    for (const [key, nestedValue] of Object.entries(value)) {
      const rule = rules[key];
      if (!rule || !rule(nestedValue)) throw new Error(`Invalid ${section}.${key}`);
    }
  }

  if (input.appState !== undefined) {
    if (!isPlainObject(input.appState)) throw new Error("Invalid appState settings");
    for (const [key, value] of Object.entries(input.appState)) {
      if (!writableStateKeys.has(key) || typeof value !== "string" || value.length > 80) {
        throw new Error(`Restricted appState key: ${key}`);
      }
    }
  }

  return input as SettingsPatch;
}

function isSafeEndpoint(value: string): boolean {
  if (value === "" || value === "browser-preview") return true;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

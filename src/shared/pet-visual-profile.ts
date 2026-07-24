import { PET_ACTION_SLOTS, type PetActionSlot } from "./pet-manifest.js";

export interface PetVisualProfile {
  type: string;
  appearance: string[];
  personality: string;
  tone: string;
  forbiddenWords: string[];
  actionSuggestions: PetActionSlot[];
  identityAnchor: string;
  dialogueGuidance: string;
  motionGuidance: string[];
}

function boundedText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized && normalized.length <= maximum ? normalized : null;
}

function boundedList(value: unknown, itemMaximum: number, maximumLength: number, minimumLength = 0): string[] | null {
  if (!Array.isArray(value) || value.length < minimumLength || value.length > maximumLength) return null;
  const items = value.map((item) => boundedText(item, itemMaximum));
  return items.every((item): item is string => item !== null) ? items : null;
}

export function validatePetVisualProfile(value: unknown): PetVisualProfile | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const type = boundedText(record.type, 80);
  const personality = boundedText(record.personality, 80);
  const tone = boundedText(record.tone, 160);
  const appearance = boundedList(record.appearance, 160, 10, 1);
  const forbiddenWords = boundedList(record.forbiddenWords, 80, 20);
  if (!type || !personality || !tone || !appearance || !forbiddenWords || !Array.isArray(record.actionSuggestions)) {
    return null;
  }
  const actionSuggestions = record.actionSuggestions.filter((slot): slot is PetActionSlot => typeof slot === "string" && PET_ACTION_SLOTS.includes(slot as PetActionSlot));
  if (actionSuggestions.length !== record.actionSuggestions.length || actionSuggestions.length === 0 || actionSuggestions.length > PET_ACTION_SLOTS.length) {
    return null;
  }
  const identityAnchor = boundedText(record.identityAnchor, 240) ?? `${type}; ${appearance.slice(0, 4).join(", ")}`;
  const dialogueGuidance = boundedText(record.dialogueGuidance, 240) ?? `${tone}; ${personality}`;
  const motionGuidance = boundedList(record.motionGuidance, 120, PET_ACTION_SLOTS.length) ?? actionSuggestions;
  return { type, appearance, personality, tone, forbiddenWords, actionSuggestions, identityAnchor, dialogueGuidance, motionGuidance };
}

export function parsePetVisualProfile(content: string): PetVisualProfile | null {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return validatePetVisualProfile(JSON.parse(normalized));
  } catch {
    return null;
  }
}

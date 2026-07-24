export const PET_ACTION_SLOTS = ["idle", "walk", "happy", "thinking", "sleep", "interaction"] as const;

export type PetActionSlot = (typeof PET_ACTION_SLOTS)[number];

export interface PetActionAsset {
  image: string;
  width: number;
  height: number;
}

export interface PetManifest {
  id: string;
  name: string;
  source: string;
  actions: Record<PetActionSlot, PetActionAsset>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseActionAsset(value: unknown): PetActionAsset | null {
  if (!isRecord(value) || typeof value.image !== "string") {
    return null;
  }

  const image = value.image.trim();
  const width = Number(value.width);
  const height = Number(value.height);
  if (!image || image.startsWith("/") || image.includes("://") || !Number.isInteger(width) || !Number.isInteger(height)) {
    return null;
  }
  if (width < 1 || width > 10_000 || height < 1 || height > 10_000) {
    return null;
  }

  return { image, width, height };
}

export function parsePetManifest(value: unknown, expectedId?: string): PetManifest | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || typeof value.source !== "string" || !isRecord(value.actions)) {
    return null;
  }
  const id = value.id.trim();
  if (!id || (expectedId && id !== expectedId)) {
    return null;
  }

  const actions = {} as Record<PetActionSlot, PetActionAsset>;
  for (const slot of PET_ACTION_SLOTS) {
    const asset = parseActionAsset(value.actions[slot]);
    if (!asset) {
      return null;
    }
    actions[slot] = asset;
  }

  return {
    id,
    name: value.name.trim() || id,
    source: value.source.trim(),
    actions
  };
}

export function petActionSlotFor(action: string): PetActionSlot {
  if (action === "walking") return "walk";
  if (action === "thinking" || action === "sitting" || action === "stretching" || action === "looking") return "thinking";
  if (action === "sleepy" || action === "sleeping") return "sleep";
  if (action === "happy" || action === "cheerful" || action === "dancing" || action === "surprised") return "happy";
  if (action === "rain" || action === "winter" || action === "summer") return "interaction";
  return "idle";
}

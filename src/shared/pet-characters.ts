export type PetCharacterRenderMode = "sprite-pack" | "portrait-sheet" | "cutout";

export interface PetCharacterDefinition {
  id: string;
  name: string;
  asset: string;
  renderMode: PetCharacterRenderMode;
  focusX: number;
  focusY: number;
}

export const PET_CHARACTERS: readonly PetCharacterDefinition[] = [
  { id: "luna-q", name: "Luna Q", asset: "pet/characters/luna-q.png", renderMode: "sprite-pack", focusX: 50, focusY: 34 },
  { id: "luna-spring", name: "Luna 春日", asset: "pet/sprites/luna-spring.png", renderMode: "cutout", focusX: 50, focusY: 50 },
  { id: "starlight", name: "星澜", asset: "pet/sprites/starlight.png", renderMode: "cutout", focusX: 50, focusY: 50 },
  { id: "floral-star", name: "花曜", asset: "pet/sprites/floral-star.png", renderMode: "cutout", focusX: 50, focusY: 50 },
  { id: "lin-yuxi", name: "林予曦", asset: "pet/sprites/lin-yuxi.png", renderMode: "cutout", focusX: 50, focusY: 50 }
] as const;

export function normalizePetCharacterId(value: string | null | undefined): string {
  if (value === "default") return "luna-q";
  if (typeof value === "string" && PET_CHARACTERS.some((character) => character.id === value)) return value;
  return "luna-q";
}

export function getPetCharacter(value: string | null | undefined): PetCharacterDefinition {
  const id = normalizePetCharacterId(value);
  return PET_CHARACTERS.find((character) => character.id === id) ?? PET_CHARACTERS[0];
}

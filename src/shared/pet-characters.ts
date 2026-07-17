export type PetCharacterRenderMode = "sprite-pack" | "portrait-sheet";

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
  { id: "luna-spring", name: "Luna 春日", asset: "pet/characters/luna-spring.png", renderMode: "portrait-sheet", focusX: 50, focusY: 34 },
  { id: "starlight", name: "星澜", asset: "pet/characters/starlight.png", renderMode: "portrait-sheet", focusX: 50, focusY: 35 },
  { id: "floral-star", name: "花曜", asset: "pet/characters/floral-star.png", renderMode: "portrait-sheet", focusX: 50, focusY: 34 },
  { id: "lin-yuxi", name: "林予曦", asset: "pet/characters/lin-yuxi.png", renderMode: "portrait-sheet", focusX: 50, focusY: 34 }
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

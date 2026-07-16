export const CONTAINER_ACCENT_OPTIONS = [
  { id: "neutral", label: "雾银", color: "#bec7cf", rgb: "190 199 207" },
  { id: "sky", label: "晴空", color: "#69d0ff", rgb: "105 208 255" },
  { id: "mint", label: "薄荷", color: "#70d8ae", rgb: "112 216 174" },
  { id: "amber", label: "琥珀", color: "#f5c26b", rgb: "245 194 107" },
  { id: "coral", label: "珊瑚", color: "#f08778", rgb: "240 135 120" },
  { id: "rose", label: "蔷薇", color: "#e884a9", rgb: "232 132 169" },
  { id: "violet", label: "鸢尾", color: "#aa94ec", rgb: "170 148 236" },
  { id: "teal", label: "青瓷", color: "#5ac4c2", rgb: "90 196 194" }
] as const;

export type ContainerAccent = (typeof CONTAINER_ACCENT_OPTIONS)[number]["id"];

export function isContainerAccent(value: unknown): value is ContainerAccent {
  return typeof value === "string" && CONTAINER_ACCENT_OPTIONS.some((option) => option.id === value);
}

export function normalizeContainerAccent(value: unknown): ContainerAccent {
  return isContainerAccent(value) ? value : "neutral";
}

export function containerAccentOption(value: unknown): (typeof CONTAINER_ACCENT_OPTIONS)[number] {
  const normalized = normalizeContainerAccent(value);
  return CONTAINER_ACCENT_OPTIONS.find((option) => option.id === normalized) ?? CONTAINER_ACCENT_OPTIONS[0];
}

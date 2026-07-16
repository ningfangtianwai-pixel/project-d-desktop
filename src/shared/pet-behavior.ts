import { getRandomSentence } from "./warm-sentences.js";

export const PET_PERSONALITIES = [
  ["gentle", "温柔"],
  ["energetic", "元气"],
  ["literary", "文艺"],
  ["philosophical", "哲理"],
  ["humorous", "幽默"],
  ["tsundere", "傲娇"],
  ["cold", "冷淡"],
  ["lazy", "慵懒"]
] as const;

export type PetPersonality = (typeof PET_PERSONALITIES)[number][0];
export type PetTalkFrequency = "silent" | "rare" | "normal" | "chatty";

const PERSONALITY_LINES: Record<Exclude<PetPersonality, "gentle">, string[]> = {
  energetic: [
    "打起精神，先完成眼前最小的一步！",
    "今天也有新进度，我已经准备好为你庆祝啦。",
    "桌面整理冲刺开始，做完我们就休息！",
    "好耶，你一回来，今天就又有盼头了。"
  ],
  literary: [
    "窗外的光落在桌面上，像给今天写了一行序言。",
    "文件各归其处，日子也会慢慢有了章节。",
    "晚风路过屏幕，我替你留住这一刻的安静。",
    "让桌面空出一点地方，也让心绪有处停泊。"
  ],
  philosophical: [
    "秩序不是把一切藏起来，而是知道需要时去哪里找。",
    "慢一点并不等于停下，方向仍在就好。",
    "真正的整理，是让选择变得更少、更清楚。",
    "今天留下的空白，也是明天可以开始的地方。"
  ],
  humorous: [
    "桌面文件正在开会，我建议它们按文件类型分组发言。",
    "我检查过了，今天的待办没有长出新的待办。暂时。",
    "先整理三个文件，剩下的就会感受到压力。",
    "你负责做决定，我负责在旁边显得很专业。"
  ],
  tsundere: [
    "我才不是在等你，只是桌面刚好需要有人看着。",
    "文件我可以帮你盯着，但你也要自己好好休息。",
    "别误会，我提醒你喝水只是怕键盘太干。",
    "这次做得还不错。只是还不错而已。"
  ],
  cold: [
    "桌面状态正常。",
    "当前没有需要处理的异常。",
    "建议先完成优先级最高的一项。",
    "已待命。需要时叫我。"
  ],
  lazy: [
    "先歇一小会儿，再整理也来得及。",
    "今天适合把任务拆小一点，慢慢做。",
    "我在这儿趴一会儿，你忙完记得叫我。",
    "不着急，先挑一个最省力的开始。"
  ]
};

const DELAY_RANGES: Record<Exclude<PetTalkFrequency, "silent">, { first: [number, number]; recurring: [number, number] }> = {
  rare: { first: [180_000, 360_000], recurring: [1_200_000, 2_400_000] },
  normal: { first: [30_000, 90_000], recurring: [360_000, 900_000] },
  chatty: { first: [12_000, 30_000], recurring: [120_000, 300_000] }
};

export function normalizePetPersonality(value: string): PetPersonality {
  return PET_PERSONALITIES.some(([id]) => id === value) ? (value as PetPersonality) : "gentle";
}

export function normalizeTalkFrequency(value: string): PetTalkFrequency {
  return value === "silent" || value === "rare" || value === "chatty" ? value : "normal";
}

export function petActionIntervalMs(seconds: number): number {
  return Math.round(Math.max(15, Math.min(3600, Number.isFinite(seconds) ? seconds : 120)) * 1000);
}

export function petPersonalityInstruction(personality: string): string {
  const instructions: Record<PetPersonality, string> = {
    gentle: "语气温柔、耐心，先接住用户情绪再给建议。",
    energetic: "语气元气、积极，用短句鼓励用户马上完成一个小步骤。",
    literary: "语气克制而有画面感，可以使用简短自然意象。",
    philosophical: "语气沉静，善于把问题归纳成清楚的原则。",
    humorous: "语气轻松机智，可以有适量幽默但不能嘲讽用户。",
    tsundere: "语气略带傲娇，嘴硬但实际关心用户，不能刻薄。",
    cold: "语气冷静简洁，只给必要信息，不主动煽情。",
    lazy: "语气松弛慵懒，帮助用户降低压力并把任务拆小。"
  };
  return instructions[normalizePetPersonality(personality)];
}

export function petBubbleDelayMs(frequency: string, first: boolean, random = Math.random): number | null {
  const normalized = normalizeTalkFrequency(frequency);
  if (normalized === "silent") {
    return null;
  }
  const [min, max] = DELAY_RANGES[normalized][first ? "first" : "recurring"];
  const ratio = Math.max(0, Math.min(1, random()));
  return Math.round(min + (max - min) * ratio);
}

export function petSentence(personality: string, random = Math.random): string {
  const normalized = normalizePetPersonality(personality);
  if (normalized === "gentle") {
    return getRandomSentence();
  }
  const lines = PERSONALITY_LINES[normalized];
  return lines[Math.min(lines.length - 1, Math.floor(Math.max(0, Math.min(0.999999, random())) * lines.length))] ?? lines[0];
}

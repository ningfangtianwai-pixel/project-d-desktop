import type { ActionPlan } from "../../shared/types.js";

export type LunaActionPlanContext = Pick<ActionPlan, "id" | "source" | "riskLevel" | "status">;

export interface LunaIntentInput {
  message: string;
  actionPlan?: LunaActionPlanContext | null;
}

export type LunaIntent =
  | {
      kind: "chat";
      message: string;
    }
  | {
      kind: "wallpaper";
      message: string;
    }
  | {
      kind: "desktop-inbox-preview";
      message: string;
      actionPlanId: string | null;
    }
  | {
      kind: "unsupported";
      message: string;
      reason: string;
    };

const dangerousPatterns: ReadonlyArray<RegExp> = [
  /\u5220\u9664/u,
  /\u6e05\u7a7a/u,
  /\u8986\u76d6/u,
  /\u79fb\u52a8\s*\u5230/u,
  /\u8fd0\u884c\u547d\u4ee4/u,
  /\u811a\u672c/u,
  /powershell/iu,
  /(?:^|\s)cmd(?:\s|$)/iu,
  /(?:^|\s)(?:run\s+)?(?:command|script|shell)(?:\s|$)/iu,
  /\b(?:delete|clear|overwrite|move\s+to)\b/iu
];

const desktopPreviewPattern = /(?:\u6574\u7406\u684c\u9762|\u6536\u7eb3\u684c\u9762|\u5e2e\u6211\u6536\u62fe\u684c\u9762)/u;
const wallpaperPattern = /(?:\u58c1\u7eb8|\u6362\u80cc\u666f|\u66f4\u6362\u80cc\u666f|\u5207\u6362\u80cc\u666f|\u684c\u9762\u80cc\u666f)/u;
const chatPattern = /(?:\u4f60\u597d|\u55e8|\u5728\u5417|\u8c22\u8c22|\u4f60\u662f\u8c01|\u966a\u6211|\u804a\u5929|\u600e\u4e48\u6837|\u5417|\u5462|\?|\uff1f)/u;

function normalizeMessage(message: string): string {
  return message.trim().replace(/\s+/gu, " ");
}

function isDangerous(message: string): boolean {
  return dangerousPatterns.some((pattern) => pattern.test(message));
}

function isPreviewEligible(actionPlan: LunaActionPlanContext | null | undefined): boolean {
  return actionPlan?.source === "desktop-inbox" && actionPlan.riskLevel === "L2" && actionPlan.status === "ready";
}

export function parseLunaIntent(input: LunaIntentInput): LunaIntent {
  const message = normalizeMessage(input.message);

  if (!message) {
    return {
      kind: "unsupported",
      message,
      reason: "Please describe a chat, wallpaper, or desktop inbox preview request."
    };
  }

  if (isDangerous(message)) {
    return {
      kind: "unsupported",
      message,
      reason: "For your safety, Luna cannot delete, overwrite, move files, run commands, or execute scripts."
    };
  }

  if (desktopPreviewPattern.test(message)) {
    return {
      kind: "desktop-inbox-preview",
      message,
      actionPlanId: isPreviewEligible(input.actionPlan) ? input.actionPlan?.id ?? null : null
    };
  }

  if (wallpaperPattern.test(message)) {
    return { kind: "wallpaper", message };
  }

  if (chatPattern.test(message)) {
    return { kind: "chat", message };
  }

  return {
    kind: "unsupported",
    message,
    reason: "Luna can chat, help choose wallpaper, or request a desktop inbox preview."
  };
}

export function makeLunaSystemInstruction(): string {
  return [
    "You are Luna, Project D's desktop companion.",
    "Return exactly one JSON object and no markdown.",
    "Allowed intent kinds are chat, wallpaper, desktop-inbox-preview, and unsupported.",
    "You may only request a desktop-inbox-preview. You must never request or claim delete, overwrite, move, command, script, shell, network, or file execution actions.",
    "Do not claim that any action has already happened. Project D requires a local preview and explicit user confirmation before an action can run.",
    "For unsupported requests, return a friendly safety reason."
  ].join(" ");
}

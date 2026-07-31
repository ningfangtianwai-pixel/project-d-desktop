/**
 * Agent Permission System — A/B/C three-tier model
 *
 * A 级（完全读写）：整理、移动、删除、执行 inbox plan
 * B 级（只读 + 建议）：读取桌面、生成建议，不可执行破坏性操作
 * C 级（仅查看）：仅能浏览桌面文件列表
 */

export type AgentPermissionLevel = "A" | "B" | "C";

export const PERMISSION_LEVELS: readonly AgentPermissionLevel[] = ["A", "B", "C"] as const;

export const PERMISSION_LABELS: Record<AgentPermissionLevel, string> = {
  A: "完全读写",
  B: "只读 + 建议",
  C: "仅查看",
};

export interface PermissionCheckResult {
  allowed: boolean;
  level: AgentPermissionLevel;
  reason?: string;
}

// ── Action scopes ──

type ActionCategory = "read" | "suggest" | "organize" | "delete" | "execute" | "settings";

const CATEGORY_MIN_LEVEL: Record<ActionCategory, AgentPermissionLevel> = {
  read: "C",       // C+ can read
  suggest: "B",    // B+ can suggest
  organize: "A",   // A only can organize
  delete: "A",     // A only can delete
  execute: "A",    // A only can execute inbox plans
  settings: "A",   // A only can change settings
};

// ── current permission level (persisted via IPC) ──

let currentLevel: AgentPermissionLevel = "A";

export function getAgentPermissionLevel(): AgentPermissionLevel {
  return currentLevel;
}

export async function loadAgentPermissionLevel(): Promise<AgentPermissionLevel> {
  try {
    const raw = await window.projectD.getState("agent_permission_level");
    if (raw && PERMISSION_LEVELS.includes(raw as AgentPermissionLevel)) {
      currentLevel = raw as AgentPermissionLevel;
    }
  } catch {
    /* keep default "A" */
  }
  return currentLevel;
}

export async function setAgentPermissionLevel(level: AgentPermissionLevel): Promise<void> {
  currentLevel = level;
  try {
    await window.projectD.setState("agent_permission_level", level);
  } catch {
    /* non-critical */
  }
}

// ── permission checks ──

export function checkPermission(category: ActionCategory): PermissionCheckResult {
  const minLevel = CATEGORY_MIN_LEVEL[category];
  const userLevelIdx = PERMISSION_LEVELS.indexOf(currentLevel);
  const minLevelIdx = PERMISSION_LEVELS.indexOf(minLevel);
  const allowed = userLevelIdx >= minLevelIdx;

  if (allowed) {
    return { allowed: true, level: currentLevel };
  }

  return {
    allowed: false,
    level: currentLevel,
    reason: `${PERMISSION_LABELS[minLevel]} 权限要求 ${minLevel} 级，当前为 ${currentLevel} 级`,
  };
}

/** Convenience: check if current level can execute a specific action */
export function canOrganize(): boolean { return checkPermission("organize").allowed; }
export function canSuggest(): boolean { return checkPermission("suggest").allowed; }
export function canExecutePlan(): boolean { return checkPermission("execute").allowed; }
export function canDelete(): boolean { return checkPermission("delete").allowed; }
export function canRead(): boolean { return checkPermission("read").allowed; }
export function canModifySettings(): boolean { return checkPermission("settings").allowed; }

/** Guard: throw if permission denied */
export function requirePermission(category: ActionCategory): void {
  const result = checkPermission(category);
  if (!result.allowed) {
    throw new Error(`[Permission] ${result.reason}`);
  }
}

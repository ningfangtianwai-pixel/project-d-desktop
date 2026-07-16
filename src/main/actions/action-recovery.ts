export type RecoveryItemState = "completed" | "resumable" | "conflicted" | "missing";

export interface RecoverableActionItem {
  id: string;
  sourcePath: string;
  targetPath: string;
  label?: string;
  journalPreIdentity?: { size: number; mtimeMs: number; birthtimeMs: number; dev: string; ino: string };
}

export interface RecoverableActionExecution {
  id: string;
  status: "executing";
  items: readonly RecoverableActionItem[];
}

export interface PathExistenceProbe {
  exists(path: string): boolean | Promise<boolean>;
  stat?(path: string): Promise<{ size: number; mtimeMs: number; birthtimeMs: number; dev: number; ino: number }>;
}

export interface RecoveredActionItem {
  id: string;
  label?: string;
  sourcePath: string;
  targetPath: string;
  state: RecoveryItemState;
}

export interface ActionRecoveryReport {
  executionId: string;
  items: RecoveredActionItem[];
  counts: Record<RecoveryItemState, number>;
  resumeCandidateItemIds: string[];
  rollbackCandidateItemIds: string[];
  canResumeSafely: boolean;
  canRollbackSafely: boolean;
}

function classify(sourceExists: boolean, targetExists: boolean, identityMatch?: boolean): RecoveryItemState {
  if (!sourceExists && targetExists) {
    return identityMatch === false ? "conflicted" : "completed";
  }
  if (sourceExists && !targetExists) return "resumable";
  if (sourceExists && targetExists) return "conflicted";
  return "missing";
}

/**
 * Verifies whether a moved file at targetPath still matches the pre-move identity.
 * Uses dev/ino on NTFS (stable across rename on same volume).
 * Falls back to size+mtime+birthtime comparison for cross-volume moves.
 */
export async function verifyMoveIdentity(
  targetPath: string,
  preIdentity: { size: number; mtimeMs: number; birthtimeMs: number; dev: string; ino: string },
  fsStat: (p: string) => Promise<{ size: number; mtimeMs: number; birthtimeMs: number; dev: number; ino: number }>
): Promise<boolean> {
  try {
    const stat = await fsStat(targetPath);
    const sameDevice = String(stat.dev) === preIdentity.dev;
    if (sameDevice && String(stat.ino) === preIdentity.ino) return true;
    return stat.size === preIdentity.size && stat.mtimeMs === preIdentity.mtimeMs && stat.birthtimeMs === preIdentity.birthtimeMs;
  } catch {
    return false;
  }
}

/**
 * Inspects an interrupted action without mutating the filesystem. A caller may
 * later use the returned candidate ids to present an explicit resume or rollback
 * confirmation; this module deliberately cannot move, overwrite, or delete files.
 */
export async function inspectInterruptedAction(
  execution: RecoverableActionExecution,
  paths: PathExistenceProbe
): Promise<ActionRecoveryReport> {
  const items = await Promise.all(execution.items.map(async (item) => {
    const [sourceExists, targetExists] = await Promise.all([
      paths.exists(item.sourcePath),
      paths.exists(item.targetPath)
    ]);
    const identityMatch = !sourceExists && targetExists && item.journalPreIdentity && paths.stat
      ? await verifyMoveIdentity(item.targetPath, item.journalPreIdentity, paths.stat)
      : undefined;
    return {
      id: item.id,
      ...(item.label ? { label: item.label } : {}),
      sourcePath: item.sourcePath,
      targetPath: item.targetPath,
      state: classify(sourceExists, targetExists, identityMatch)
    };
  }));

  const counts: Record<RecoveryItemState, number> = {
    completed: 0,
    resumable: 0,
    conflicted: 0,
    missing: 0
  };
  for (const item of items) counts[item.state] += 1;

  const resumeCandidateItemIds = items.filter((item) => item.state === "resumable").map((item) => item.id);
  const rollbackCandidateItemIds = items.filter((item) => item.state === "completed").map((item) => item.id);
  const hasUnsafeState = counts.conflicted > 0 || counts.missing > 0;

  return {
    executionId: execution.id,
    items,
    counts,
    resumeCandidateItemIds,
    rollbackCandidateItemIds,
    canResumeSafely: resumeCandidateItemIds.length > 0 && !hasUnsafeState,
    canRollbackSafely: rollbackCandidateItemIds.length > 0
  };
}

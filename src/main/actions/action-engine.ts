import { randomUUID } from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { ActionExecution, ActionPlan, ActionPlanItem, DesktopFileRecord, FileCategory } from "../../shared/types.js";
import { verifyMoveIdentity } from "./action-recovery.js";

export interface ActionStore {
  saveActionPlan(plan: ActionPlan): void;
  getActionPlan(planId: string): ActionPlan | null;
  saveActionExecution(execution: ActionExecution): void;
  getActionExecution(executionId: string): ActionExecution | null;
  getActionHistory(limit?: number): ActionExecution[];
}

export interface ActionLogger {
  info(file: "app" | "error", message: string, data?: unknown): void;
  warn(file: "app" | "error", message: string, data?: unknown): void;
  error(file: "app" | "error", message: string, data?: unknown): void;
}

const CATEGORY_FOLDERS: Record<FileCategory, string> = {
  document: "文档",
  image: "图片",
  media: "媒体",
  code: "代码",
  archive: "压缩包",
  design: "设计",
  program: "安装与快捷方式",
  other: "其他",
  folder: "文件夹"
};

function isInside(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function cloneItems(items: ActionPlanItem[]): ActionPlanItem[] {
  return items.map((item) => ({ ...item }));
}

/**
 * Executes only pre-reviewed L2 desktop moves. It intentionally has no delete,
 * overwrite, or arbitrary-path operation so Luna can never become a raw file API.
 */
export class ActionEngine {
  constructor(
    private readonly store: ActionStore,
    private readonly logger: ActionLogger,
    private readonly desktopPath: string
  ) {}

  createDesktopInboxPlan(files: DesktopFileRecord[]): ActionPlan {
    const inboxRoot = path.join(this.desktopPath, "Project D 收纳");
    const items = files
      .filter((file) => this.isEligibleDesktopFile(file))
      .map((file) => {
        const targetPath = path.join(inboxRoot, CATEGORY_FOLDERS[file.category], path.basename(file.fullPath));
        const conflict = this.pathExists(targetPath);
        return {
          id: randomUUID(),
          kind: "move" as const,
          sourcePath: file.fullPath,
          targetPath,
          label: file.displayName || file.filename,
          category: file.category,
          sizeBytes: file.sizeBytes,
          status: "pending" as const,
          ...(conflict ? { conflict: "target-exists" as const } : {})
        };
      });
    const movable = items.filter((item) => !item.conflict).length;
    const plan: ActionPlan = {
      id: randomUUID(),
      source: "desktop-inbox",
      riskLevel: "L2",
      status: "ready",
      summary: movable > 0 ? `已拟定 ${movable} 项桌面收件箱整理，执行前仍可逐项审查。` : "没有可安全移动的桌面根目录文件。",
      createdAt: new Date().toISOString(),
      items
    };
    this.store.saveActionPlan(plan);
    this.logger.info("app", "desktop inbox action plan created", { planId: plan.id, items: items.length, movable });
    return plan;
  }

  async execute(planId: string): Promise<ActionExecution> {
    const plan = this.store.getActionPlan(planId);
    if (!plan || !["desktop-inbox", "luna"].includes(plan.source) || plan.riskLevel !== "L2") {
      throw new Error("Action plan was not found or is not executable");
    }
    if (plan.status !== "ready") {
      throw new Error("Action plan is no longer ready");
    }

    const execution: ActionExecution = {
      id: randomUUID(),
      planId: plan.id,
      status: "executing",
      startedAt: new Date().toISOString(),
      completedAt: null,
      undoable: false,
      summary: plan.summary,
      items: cloneItems(plan.items)
    };
    this.store.saveActionExecution(execution);

    for (const item of execution.items) {
      await this.moveOne(item, () => this.store.saveActionExecution(execution));
      this.store.saveActionExecution(execution);
    }
    this.finalizeExecution(execution);
    this.logger.info("app", "desktop inbox action executed", { executionId: execution.id, status: execution.status });
    return execution;
  }

  async undo(executionId: string): Promise<ActionExecution> {
    const execution = this.store.getActionExecution(executionId);
    if (!execution || !execution.undoable || !["completed", "partial"].includes(execution.status)) {
      throw new Error("Action execution cannot be undone");
    }

    for (const item of [...execution.items].reverse()) {
      if (item.status !== "completed") continue;
      if (!this.isSafeUndo(item.targetPath, item.sourcePath) || await this.exists(item.sourcePath) || !(await this.exists(item.targetPath))) {
        item.status = "failed";
        item.error = "撤销时检测到路径冲突或文件缺失，未覆盖任何文件。";
        continue;
      }
      try {
        if (item.journalPostIdentity && !(await verifyMoveIdentity(item.targetPath, item.journalPostIdentity, fs.stat))) {
          item.status = "contested";
          item.error = "目标文件已发生变化，为避免覆盖未执行撤销。";
          this.store.saveActionExecution(execution);
          continue;
        }
        await fs.mkdir(path.dirname(item.sourcePath), { recursive: true });
        await fs.rename(item.targetPath, item.sourcePath);
        item.status = "undone";
        item.error = undefined;
        this.store.saveActionExecution(execution);
      } catch (error) {
        item.status = "failed";
        item.error = error instanceof Error ? error.message : String(error);
        this.store.saveActionExecution(execution);
      }
    }

    const undone = execution.items.filter((item) => item.status === "undone").length;
    execution.status = undone > 0 ? "undone" : "failed";
    execution.undoable = false;
    execution.completedAt = new Date().toISOString();
    execution.summary = undone > 0 ? `已恢复 ${undone} 项到原始桌面位置。` : "未能恢复任何文件；原文件可能已被手动修改。";
    this.store.saveActionExecution(execution);
    this.logger.info("app", "desktop inbox action undone", { executionId, undone });
    return execution;
  }

  async resume(executionId: string): Promise<ActionExecution> {
    const execution = this.store.getActionExecution(executionId);
    if (!execution || execution.status !== "executing") throw new Error("Action execution cannot be resumed");
    for (const item of execution.items) {
      const sourceExists = await this.exists(item.sourcePath);
      const targetExists = await this.exists(item.targetPath);
      if (sourceExists && !targetExists) {
        item.status = "pending";
        await this.moveOne(item, () => this.store.saveActionExecution(execution));
      } else if (!sourceExists && targetExists && item.journalPreIdentity
        && await verifyMoveIdentity(item.targetPath, item.journalPreIdentity, fs.stat)) {
        item.status = "completed";
        item.error = undefined;
      } else {
        item.status = "contested";
        item.error = "恢复时检测到路径或文件身份冲突，未执行移动。";
      }
      this.store.saveActionExecution(execution);
    }
    this.finalizeExecution(execution);
    this.logger.info("app", "interrupted action resumed", { executionId, status: execution.status });
    return execution;
  }

  async rollback(executionId: string): Promise<ActionExecution> {
    const execution = this.store.getActionExecution(executionId);
    if (!execution || execution.status !== "executing") throw new Error("Action execution cannot be rolled back");
    for (const item of [...execution.items].reverse()) {
      const sourceExists = await this.exists(item.sourcePath);
      const targetExists = await this.exists(item.targetPath);
      if (sourceExists && !targetExists) {
        item.status = "abandoned";
        item.error = undefined;
      } else if (!sourceExists && targetExists && item.journalPreIdentity
        && await verifyMoveIdentity(item.targetPath, item.journalPreIdentity, fs.stat)) {
        await fs.rename(item.targetPath, item.sourcePath);
        item.status = "undone";
        item.error = undefined;
      } else {
        item.status = "contested";
        item.error = "回滚时检测到路径或文件身份冲突，未覆盖任何文件。";
      }
      this.store.saveActionExecution(execution);
    }
    const contested = execution.items.some((item) => item.status === "contested" || item.status === "failed");
    execution.status = contested ? "partial" : "undone";
    execution.undoable = false;
    execution.completedAt = new Date().toISOString();
    execution.summary = contested ? "部分项目存在冲突，已保留现场等待人工处理。" : "中断动作已安全回滚。";
    this.store.saveActionExecution(execution);
    this.logger.info("app", "interrupted action rolled back", { executionId, status: execution.status });
    return execution;
  }

  getHistory(limit = 30): ActionExecution[] {
    return this.store.getActionHistory(limit);
  }

  /** Restricted entry point for Luna: accepts pre-validated resource IDs, not raw paths. */
  createLunaMovePlan(
    files: Array<{ id: number; filename: string; fullPath: string; category: FileCategory; sizeBytes: number }>,
    target: { kind: "known-folder"; value: string } | { kind: "container"; containerId: number }
  ): ActionPlan {
    const planId = randomUUID();
    const items: ActionPlanItem[] = [];

    for (const file of files) {
      if (!file.fullPath || typeof file.fullPath !== "string") continue;
      if (!isInside(path.dirname(file.fullPath), file.fullPath) && path.dirname(file.fullPath) !== this.desktopPath) continue;

      let targetRoot: string;
      if (target.kind === "container") {
        targetRoot = path.join(this.desktopPath, "Project D 收纳", `容器${target.containerId}`);
      } else {
        const folder = this.resolveKnownFolder(target.value);
        if (!folder) continue;
        targetRoot = path.join(this.desktopPath, "Project D 收纳", folder);
      }

      const targetPath = path.join(targetRoot, path.basename(file.fullPath));
      const conflict = fsSync.existsSync(targetPath);
      items.push({
        id: randomUUID(),
        kind: "move",
        sourcePath: file.fullPath,
        targetPath,
        label: file.filename,
        category: file.category,
        sizeBytes: file.sizeBytes,
        status: "pending",
        ...(conflict ? { conflict: "target-exists" as const } : {})
      });
    }

    const movable = items.filter((i) => !i.conflict).length;
    const plan: ActionPlan = {
      id: planId,
      source: "luna",
      riskLevel: "L2",
      status: "ready",
      summary: movable > 0 ? `Luna 已拟定 ${movable} 项移动方案，执行前可预览和取消。` : "没有可安全移动的文件。",
      createdAt: new Date().toISOString(),
      items
    };
    this.store.saveActionPlan(plan);
    this.logger.info("app", "luna move plan created", { planId: plan.id, items: items.length, movable });
    return plan;
  }

  private resolveKnownFolder(value: string): string | null {
    const map: Record<string, string> = {
      documents: "文档",
      downloads: "下载",
      desktop: "桌面",
      pictures: "图片",
      media: "媒体",
      code: "代码",
      archives: "压缩包"
    };
    return map[value] ?? null;
  }

  private isEligibleDesktopFile(file: DesktopFileRecord): boolean {
    return !file.isMissing && !file.isShortcut && file.category !== "folder" && path.dirname(file.fullPath) === this.desktopPath;
  }

  private async moveOne(item: ActionPlanItem, persistJournal: () => void): Promise<void> {
    if (!this.isSafeMove(item.sourcePath, item.targetPath)) {
      item.status = "skipped";
      item.conflict = "unsafe-path";
      return;
    }
    if (await this.exists(item.targetPath)) {
      item.status = "skipped";
      item.conflict = "target-exists";
      return;
    }
    if (!(await this.exists(item.sourcePath))) {
      item.status = "skipped";
      item.conflict = "source-missing";
      return;
    }
    try {
      const preStat = await fs.stat(item.sourcePath);
      if (!preStat.isFile()) {
        item.status = "skipped";
        item.conflict = "unsafe-path";
        return;
      }
      const identity = {
        size: preStat.size,
        mtimeMs: preStat.mtimeMs,
        birthtimeMs: preStat.birthtimeMs,
        dev: String(preStat.dev),
        ino: String(preStat.ino)
      };
      item.journalPreIdentity = identity;
      persistJournal();
      await fs.mkdir(path.dirname(item.targetPath), { recursive: true });
      await fs.rename(item.sourcePath, item.targetPath);

      const postStat = await fs.stat(item.targetPath);
      const identityMatch = postStat.size === identity.size
        && postStat.mtimeMs === identity.mtimeMs
        && postStat.birthtimeMs === identity.birthtimeMs;

      item.status = identityMatch ? "completed" : "contested";
      item.journalPostIdentity = { size: postStat.size, mtimeMs: postStat.mtimeMs, birthtimeMs: postStat.birthtimeMs, dev: String(postStat.dev), ino: String(postStat.ino) };
      item.error = identityMatch ? undefined : "移动后文件身份校验失败，已停止后续自动判断。";
      item.conflict = undefined;
    } catch (error) {
      item.status = "failed";
      item.error = error instanceof Error ? error.message : String(error);
      this.logger.error("error", "action item failed", { sourcePath: item.sourcePath, targetPath: item.targetPath, error: item.error });
    }
  }

  private finalizeExecution(execution: ActionExecution): void {
    const completed = execution.items.filter((item) => item.status === "completed").length;
    const unsuccessful = execution.items.filter((item) => ["failed", "contested"].includes(item.status)).length;
    const skipped = execution.items.filter((item) => item.status === "skipped").length;
    execution.undoable = completed > 0;
    execution.status = unsuccessful > 0 ? (completed > 0 ? "partial" : "failed") : "completed";
    execution.completedAt = new Date().toISOString();
    execution.summary = completed > 0
      ? `已整理 ${completed} 项${unsuccessful + skipped > 0 ? `，另有 ${unsuccessful + skipped} 项保持原状` : "，可随时一键撤销"}。`
      : "没有文件被移动；请查看冲突或错误说明。";
    this.store.saveActionExecution(execution);
  }

  private isSafeMove(sourcePath: string, targetPath: string): boolean {
    const inboxRoot = path.join(this.desktopPath, "Project D 收纳");
    return path.dirname(sourcePath) === this.desktopPath && isInside(inboxRoot, targetPath);
  }

  private isSafeUndo(sourcePath: string, targetPath: string): boolean {
    const inboxRoot = path.join(this.desktopPath, "Project D 收纳");
    return isInside(inboxRoot, sourcePath) && path.dirname(targetPath) === this.desktopPath;
  }

  private pathExists(filePath: string): boolean {
    return fsSync.existsSync(filePath);
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

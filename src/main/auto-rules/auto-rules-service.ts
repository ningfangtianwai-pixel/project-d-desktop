/**
 * 自动规则服务
 *
 * 保留 SQL 片段用于迁移审查，并提供可测试的序列化、匹配和预览逻辑。
 * DatabaseService 已负责持久化，真实文件动作仍必须进入 ActionPlan 审核链。
 */

import type {
  AutoRule,
  AutoRuleCondition,
  AutoRuleAction,
  AutoRuleExecution,
} from "../../shared/auto-rules.js";
import { evaluateAutoRule } from "../../shared/auto-rules.js";
import type { DesktopFileRecord } from "../../shared/types.js";

// ─── SQL Schema 片段 ─────────────────────────────────────────────────────────
export const AUTO_RULES_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS auto_rules (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    conditions_json TEXT NOT NULL,
    action_type     TEXT NOT NULL,
    action_target   TEXT NOT NULL DEFAULT '',
    priority        INTEGER NOT NULL DEFAULT 0,
    enabled         INTEGER NOT NULL DEFAULT 1,
    run_count       INTEGER NOT NULL DEFAULT 0,
    last_run_at     TEXT,
    created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auto_rules_priority ON auto_rules(priority);
`;

// ─── 序列化/反序列化 ────────────────────────────────────────────────────────

export interface AutoRuleRow {
  id: string;
  name: string;
  conditions_json: string;
  action_type: string;
  action_target: string;
  priority: number;
  enabled: number;
  run_count: number;
  last_run_at: string | null;
  created_at: string;
}

export function rowToAutoRule(row: AutoRuleRow): AutoRule {
  return {
    id: row.id,
    name: row.name,
    conditions: JSON.parse(row.conditions_json) as AutoRuleCondition[],
    action: { type: row.action_type as AutoRuleAction["type"], target: row.action_target },
    priority: row.priority,
    enabled: row.enabled === 1,
    runCount: row.run_count,
    lastRunAt: row.last_run_at,
    createdAt: row.created_at,
  };
}

export function autoRuleToRow(rule: AutoRule): AutoRuleRow {
  return {
    id: rule.id,
    name: rule.name,
    conditions_json: JSON.stringify(rule.conditions),
    action_type: rule.action.type,
    action_target: rule.action.target,
    priority: rule.priority,
    enabled: rule.enabled ? 1 : 0,
    run_count: rule.runCount,
    last_run_at: rule.lastRunAt,
    created_at: rule.createdAt,
  };
}

// ─── 文件适配 ─────────────────────────────────────────────────────────────────

interface FileForEval {
  extension: string;
  category: string;
  filename: string;
  modifiedAt: string;
}

export function desktopFileToEvalInput(file: DesktopFileRecord): FileForEval {
  return {
    extension: file.extension ?? "",
    category: file.category,
    filename: file.filename,
    modifiedAt: file.modifiedAt,
  };
}

// ─── 执行计划生成 ─────────────────────────────────────────────────────────────

/**
 * 给定一组已启用的规则和桌面上的全部文件，
 * 返回按优先级排序的执行计划（不实际写数据库）。
 */
export function planAutoRuleExecutions(
  rules: AutoRule[],
  files: DesktopFileRecord[],
): AutoRuleExecution[] {
  const enabled = rules
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  const executions: AutoRuleExecution[] = [];

  for (const rule of enabled) {
    const matchedIds: number[] = [];
    for (const file of files) {
      if (evaluateAutoRule(rule, desktopFileToEvalInput(file))) {
        matchedIds.push(file.id);
      }
    }
    if (matchedIds.length > 0) {
      executions.push({
        ruleId: rule.id,
        ruleName: rule.name,
        action: rule.action,
        fileIds: matchedIds,
      });
    }
  }

  return executions;
}

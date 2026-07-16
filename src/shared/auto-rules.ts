/**
 * 自动规则模型定义
 * 纯类型 + 纯函数，不依赖运行时环境
 */

// ─── 条件 ────────────────────────────────────────────────────────────────────

export interface AutoRuleCondition {
  /** 匹配维度 */
  field: "extension" | "category" | "filename-contains" | "age-days";
  /** 比较算子 */
  operator: "equals" | "contains" | "greater-than";
  /** 参与比较的值（age-days 时为十进制字符串，如 "30"） */
  value: string;
}

// ─── 动作 ────────────────────────────────────────────────────────────────────

export interface AutoRuleAction {
  type: "move-to-container" | "tag" | "hide";
  /** move-to-container → 容器 ID；tag → 标签名；hide → 空字符串 */
  target: string;
}

// ─── 规则 ────────────────────────────────────────────────────────────────────

export interface AutoRule {
  id: string;
  name: string;
  conditions: AutoRuleCondition[];
  action: AutoRuleAction;
  /** 越小越先执行 */
  priority: number;
  enabled: boolean;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
}

export interface AutoRuleExecution {
  ruleId: string;
  ruleName: string;
  action: AutoRuleAction;
  fileIds: number[];
}

// ─── 辅助：解析文件年龄（天） ────────────────────────────────────────────────

function daysSince(isoDate: string): number {
  const ms = Date.now() - new Date(isoDate).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

// ─── 单条件求值 ──────────────────────────────────────────────────────────────

function evaluateCondition(
  condition: AutoRuleCondition,
  file: { extension: string; category: string; filename: string; modifiedAt: string },
): boolean {
  const { field, operator, value } = condition;

  switch (field) {
    case "extension": {
      const ext = file.extension.toLowerCase();
      const target = value.toLowerCase();
      return operator === "equals"
        ? ext === target
        : operator === "contains"
          ? ext.includes(target)
          : false;
    }

    case "category": {
      return operator === "equals"
        ? file.category === value
        : operator === "contains"
          ? file.category.includes(value)
          : false;
    }

    case "filename-contains": {
      const name = file.filename.toLowerCase();
      const target = value.toLowerCase();
      return operator === "contains"
        ? name.includes(target)
        : operator === "equals"
          ? name === target
          : false;
    }

    case "age-days": {
      const threshold = Number(value);
      if (Number.isNaN(threshold)) return false;
      const age = daysSince(file.modifiedAt);
      return operator === "greater-than"
        ? age > threshold
        : operator === "equals"
          ? Math.floor(age) === threshold
          : false;
    }

    default:
      return false;
  }
}

// ─── 规则求值（所有条件 AND） ─────────────────────────────────────────────────

export function evaluateAutoRule(
  rule: AutoRule,
  file: { extension: string; category: string; filename: string; modifiedAt: string },
): boolean {
  if (!rule.enabled) return false;
  return rule.conditions.every((c) => evaluateCondition(c, file));
}

// ─── 工厂函数 ────────────────────────────────────────────────────────────────

export function createAutoRule(
  name: string,
  conditions: AutoRuleCondition[],
  action: AutoRuleAction,
): AutoRule {
  return {
    id: crypto.randomUUID(),
    name,
    conditions,
    action,
    priority: 0,
    enabled: true,
    runCount: 0,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
  };
}

import { randomUUID } from "node:crypto";
import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { AutoRule, AutoRuleAction, AutoRuleCondition, AutoRuleExecution } from "../../shared/auto-rules.js";
import type { DesktopFileRecord } from "../../shared/types.js";
import { planAutoRuleExecutions } from "./auto-rules-service.js";

interface AutoRuleStore {
  getAutoRules(): AutoRule[];
  saveAutoRule(rule: AutoRule): AutoRule;
  deleteAutoRule(ruleId: string): void;
  getDesktopFiles(): DesktopFileRecord[];
}

export interface AutoRulesIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: (event: IpcMainInvokeEvent, routes?: readonly string[]) => void;
  getStore: () => AutoRuleStore | null;
}

export function registerAutoRulesIpcHandlers(deps: AutoRulesIpcDependencies): void {
  deps.ipc.handle(IPC_CHANNELS.AUTO_RULES_GET, (event): AutoRule[] => {
    deps.assertTrustedSender(event, ["#/settings"]);
    return deps.getStore()?.getAutoRules() ?? [];
  });
  deps.ipc.handle(IPC_CHANNELS.AUTO_RULES_SAVE, (event, input: unknown): AutoRule => {
    deps.assertTrustedSender(event, ["#/settings"]);
    const store = deps.getStore();
    if (!store) throw new Error("Rule store is unavailable");
    return store.saveAutoRule(validateRule(input));
  });
  deps.ipc.handle(IPC_CHANNELS.AUTO_RULES_DELETE, (event, ruleId: unknown): void => {
    deps.assertTrustedSender(event, ["#/settings"]);
    if (typeof ruleId !== "string" || !/^[\w-]{8,80}$/.test(ruleId)) throw new Error("Invalid rule id");
    deps.getStore()?.deleteAutoRule(ruleId);
  });
  deps.ipc.handle(IPC_CHANNELS.AUTO_RULES_PREVIEW, (event): AutoRuleExecution[] => {
    deps.assertTrustedSender(event, ["#/settings"]);
    const store = deps.getStore();
    return store ? planAutoRuleExecutions(store.getAutoRules(), store.getDesktopFiles()) : [];
  });
}

function validateRule(input: unknown): AutoRule {
  if (!input || typeof input !== "object") throw new Error("Invalid rule");
  const value = input as Partial<AutoRule>;
  const name = typeof value.name === "string" ? value.name.trim().slice(0, 60) : "";
  if (!name || !Array.isArray(value.conditions) || value.conditions.length < 1 || value.conditions.length > 5) throw new Error("Invalid rule");
  const conditions = value.conditions.map(validateCondition);
  const action = validateAction(value.action);
  const priority = Number.isInteger(value.priority) ? Math.min(Math.max(Number(value.priority), 0), 999) : 0;
  return {
    id: typeof value.id === "string" && /^[\w-]{8,80}$/.test(value.id) ? value.id : randomUUID(),
    name,
    conditions,
    action,
    priority,
    enabled: value.enabled !== false,
    runCount: Number.isInteger(value.runCount) && Number(value.runCount) >= 0 ? Number(value.runCount) : 0,
    lastRunAt: typeof value.lastRunAt === "string" ? value.lastRunAt : null,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString()
  };
}

function validateCondition(input: unknown): AutoRuleCondition {
  if (!input || typeof input !== "object") throw new Error("Invalid condition");
  const value = input as Partial<AutoRuleCondition>;
  if (!["extension", "category", "filename-contains", "age-days"].includes(value.field ?? "")) throw new Error("Invalid condition field");
  if (!["equals", "contains", "greater-than"].includes(value.operator ?? "")) throw new Error("Invalid condition operator");
  if (typeof value.value !== "string" || !value.value.trim() || value.value.length > 80) throw new Error("Invalid condition value");
  return { field: value.field!, operator: value.operator!, value: value.value.trim() };
}

function validateAction(input: unknown): AutoRuleAction {
  if (!input || typeof input !== "object") throw new Error("Invalid action");
  const value = input as Partial<AutoRuleAction>;
  if (!["move-to-container", "tag", "hide"].includes(value.type ?? "")) throw new Error("Invalid rule action");
  const target = typeof value.target === "string" ? value.target.trim().slice(0, 80) : "";
  if (value.type !== "hide" && !target) throw new Error("Rule action target is required");
  return { type: value.type!, target };
}

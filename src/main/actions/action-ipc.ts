import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { ActionExecution, ActionPlan, DesktopFileRecord, InterruptedActionRecovery, SuggestionRecord } from "../../shared/types.js";
import type { ActionEngine } from "./action-engine.js";

type TrustedSenderGuard = (event: IpcMainInvokeEvent, routes?: string[]) => void;

export interface ActionIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: TrustedSenderGuard;
  getEngine: () => ActionEngine | null;
  getDesktopFiles: () => DesktopFileRecord[];
  getLatestSuggestion: () => SuggestionRecord | null;
  saveLatestSuggestion: (suggestion: SuggestionRecord) => void;
  isPlanAvailable: () => boolean;
  isRescanAvailable: () => boolean;
  rescanDesktop: () => Promise<unknown>;
  broadcastDesktopFiles: () => void;
  getInterruptedRecoveries: () => InterruptedActionRecovery[];
}

export function registerActionIpcHandlers(deps: ActionIpcDependencies): void {
  const { ipc, assertTrustedSender } = deps;

  ipc.handle(IPC_CHANNELS.ACTION_PLAN_INBOX, (event): ActionPlan => {
    assertTrustedSender(event, ["", "#/overlay"]);
    const engine = deps.getEngine();
    if (!engine || !deps.isPlanAvailable()) throw new Error("Action engine is not initialized");
    const plan = engine.createDesktopInboxPlan(deps.getDesktopFiles());
    const suggestion = deps.getLatestSuggestion();
    if (suggestion) deps.saveLatestSuggestion({ ...suggestion, planId: plan.id });
    return plan;
  });

  ipc.handle(IPC_CHANNELS.ACTION_EXECUTE, async (event, planId: unknown): Promise<ActionExecution> => {
    assertTrustedSender(event, ["", "#/overlay"]);
    const engine = deps.getEngine();
    if (!engine || !deps.isRescanAvailable()) throw new Error("Action engine is not initialized");
    if (typeof planId !== "string" || planId.length < 8 || planId.length > 80) throw new Error("Invalid action plan id");
    const execution = await engine.execute(planId);
    const suggestion = deps.getLatestSuggestion();
    if (suggestion?.planId === planId) deps.saveLatestSuggestion({ ...suggestion, status: "completed" });
    await deps.rescanDesktop();
    deps.broadcastDesktopFiles();
    return execution;
  });

  ipc.handle(IPC_CHANNELS.ACTION_UNDO, async (event, executionId: unknown): Promise<ActionExecution> => {
    assertTrustedSender(event, ["", "#/overlay"]);
    const engine = deps.getEngine();
    if (!engine || !deps.isRescanAvailable()) throw new Error("Action engine is not initialized");
    if (typeof executionId !== "string" || executionId.length < 8 || executionId.length > 80) throw new Error("Invalid action execution id");
    const execution = await engine.undo(executionId);
    await deps.rescanDesktop();
    deps.broadcastDesktopFiles();
    return execution;
  });

  ipc.handle(IPC_CHANNELS.ACTION_RESUME, async (event, executionId: unknown): Promise<ActionExecution> => {
    assertTrustedSender(event, ["#/settings"]);
    const engine = deps.getEngine();
    if (!engine || !deps.isRescanAvailable()) throw new Error("Action engine is not initialized");
    if (typeof executionId !== "string" || executionId.length < 8 || executionId.length > 80) throw new Error("Invalid action execution id");
    const execution = await engine.resume(executionId);
    await deps.rescanDesktop();
    deps.broadcastDesktopFiles();
    return execution;
  });

  ipc.handle(IPC_CHANNELS.ACTION_ROLLBACK, async (event, executionId: unknown): Promise<ActionExecution> => {
    assertTrustedSender(event, ["#/settings"]);
    const engine = deps.getEngine();
    if (!engine || !deps.isRescanAvailable()) throw new Error("Action engine is not initialized");
    if (typeof executionId !== "string" || executionId.length < 8 || executionId.length > 80) throw new Error("Invalid action execution id");
    const execution = await engine.rollback(executionId);
    await deps.rescanDesktop();
    deps.broadcastDesktopFiles();
    return execution;
  });

  ipc.handle(IPC_CHANNELS.ACTION_HISTORY, (event): ActionExecution[] => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay"]);
    return deps.getEngine()?.getHistory() ?? [];
  });

  ipc.handle(IPC_CHANNELS.ACTIONS_GET_INTERRUPTED, (event): InterruptedActionRecovery[] => {
    assertTrustedSender(event, ["#/settings"]);
    return deps.getInterruptedRecoveries();
  });
}

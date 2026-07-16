import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { DiagnosticsExportResult, DiagnosticsExportSelection, SuggestionDeliveryControls, SuggestionPolicy, SuggestionRecord, SupportDiagnosticsReport } from "../../shared/types.js";

type TrustedSenderGuard = (event: IpcMainInvokeEvent, routes?: string[]) => void;

export interface SuggestionIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: TrustedSenderGuard;
  getLatestSuggestion: () => SuggestionRecord | null;
  getSuggestionControls: () => SuggestionDeliveryControls;
  serializeOp: <T>(op: () => Promise<T>) => Promise<T>;
  dismissSuggestion: (suggestionId: string) => Promise<void>;
  snoozeSuggestions: (minutes: number) => Promise<void>;
  setSuggestionEnabled: (enabled: boolean) => Promise<void>;
  updateSuggestionPolicy: (policy: SuggestionPolicy) => Promise<SuggestionDeliveryControls>;
  getDiagnosticsReport: () => SupportDiagnosticsReport;
  exportDiagnostics: (selection: DiagnosticsExportSelection) => Promise<DiagnosticsExportResult>;
}

export function registerSuggestionIpcHandlers(deps: SuggestionIpcDependencies): void {
  const { ipc, assertTrustedSender } = deps;

  ipc.handle(IPC_CHANNELS.SUGGESTIONS_GET_LATEST, (event): SuggestionRecord | null => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay", "#/pet"]);
    return deps.getLatestSuggestion();
  });

  ipc.handle(IPC_CHANNELS.SUGGESTIONS_DISMISS, async (event, suggestionId: unknown): Promise<void> => {
    assertTrustedSender(event, ["", "#/overlay"]);
    if (typeof suggestionId !== "string" || suggestionId.length < 12 || suggestionId.length > 120) throw new Error("Invalid suggestion id");
    await deps.serializeOp(() => deps.dismissSuggestion(suggestionId));
  });

  ipc.handle(IPC_CHANNELS.SUGGESTIONS_GET_CONTROLS, (event): SuggestionDeliveryControls => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay"]);
    return deps.getSuggestionControls();
  });

  ipc.handle(IPC_CHANNELS.SUGGESTIONS_SNOOZE, async (event, minutes: unknown): Promise<void> => {
    assertTrustedSender(event);
    if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 30 || minutes > 1_440) throw new Error("Invalid suggestion snooze duration");
    await deps.serializeOp(() => deps.snoozeSuggestions(minutes));
  });

  ipc.handle(IPC_CHANNELS.SUGGESTIONS_SET_ENABLED, async (event, enabled: unknown): Promise<void> => {
    assertTrustedSender(event, ["", "#/settings", "#/overlay"]);
    if (typeof enabled !== "boolean") throw new Error("Invalid suggestion enabled state");
    await deps.serializeOp(() => deps.setSuggestionEnabled(enabled));
  });

  ipc.handle(IPC_CHANNELS.SUGGESTIONS_UPDATE_POLICY, async (event, policy: unknown): Promise<SuggestionDeliveryControls> => {
    assertTrustedSender(event, ["#/settings"]);
    if (!policy || typeof policy !== "object") throw new Error("Invalid suggestion policy");
    const input = policy as Partial<SuggestionPolicy>;
    if (!input.quietHours || typeof input.quietHours.enabled !== "boolean" || typeof input.quietHours.start !== "string" || typeof input.quietHours.end !== "string"
      || typeof input.dailyBudget !== "number" || !Number.isInteger(input.dailyBudget) || input.dailyBudget < 1 || input.dailyBudget > 10
      || !input.perKind?.["desktop-inbox"] || typeof input.perKind["desktop-inbox"].cooldownMs !== "number"
      || typeof input.perKind["desktop-inbox"].dailyBudget !== "number") {
      throw new Error("Invalid suggestion policy values");
    }
    return deps.serializeOp(() => deps.updateSuggestionPolicy(input as SuggestionPolicy));
  });

  ipc.handle(IPC_CHANNELS.DIAGNOSTICS_GET_REPORT, (event): SupportDiagnosticsReport => {
    assertTrustedSender(event, ["#/settings"]);
    return deps.getDiagnosticsReport();
  });

  ipc.handle(IPC_CHANNELS.DIAGNOSTICS_EXPORT_REPORT, async (event, selectionRaw: unknown): Promise<DiagnosticsExportResult> => {
    assertTrustedSender(event, ["#/settings"]);
    const selection = selectionRaw as DiagnosticsExportSelection;
    if (!selection || typeof selection !== "object") throw new Error("Diagnostics export consent required");
    return deps.exportDiagnostics(selection);
  });
}

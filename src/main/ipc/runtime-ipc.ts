import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { RuntimeMetricsReport, RuntimePauseSnapshot } from "../../shared/runtime.js";

type TrustedSenderGuard = (event: IpcMainInvokeEvent, routes?: string[]) => void;

export interface RuntimeIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: TrustedSenderGuard;
  getState: () => RuntimePauseSnapshot;
  setManualPaused: (paused: boolean) => RuntimePauseSnapshot;
  getMetrics: () => RuntimeMetricsReport;
}

export function registerRuntimeIpcHandlers(deps: RuntimeIpcDependencies): void {
  deps.ipc.handle(IPC_CHANNELS.RUNTIME_GET_STATE, (event) => {
    deps.assertTrustedSender(event, ["", "#/settings", "#/overlay", "#/wallpaper", "#/pet"]);
    return deps.getState();
  });

  deps.ipc.handle(IPC_CHANNELS.RUNTIME_SET_MANUAL_PAUSED, (event, paused: unknown) => {
    deps.assertTrustedSender(event, ["", "#/settings", "#/overlay"]);
    if (typeof paused !== "boolean") throw new Error("Invalid runtime pause state");
    return deps.setManualPaused(paused);
  });

  deps.ipc.handle(IPC_CHANNELS.RUNTIME_GET_METRICS, (event) => {
    deps.assertTrustedSender(event, ["", "#/settings"]);
    return deps.getMetrics();
  });
}

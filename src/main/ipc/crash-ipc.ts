import type { IpcHandlerStore } from "./handler-registry.js";
import type { IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { CrashLogEntry, CrashLogFilter } from "../../shared/types";
import type { DatabaseService } from "../database";

type NewCrashLog = Omit<CrashLogEntry, "id" | "createdAt" | "uploaded">;

export interface CrashIpcDependencies {
  ipc: IpcHandlerStore;
  assertTrustedSender: (event: Electron.IpcMainInvokeEvent, allowedHashes?: readonly string[]) => void;
  getDatabase: () => DatabaseService | null;
}

export function registerCrashIpcHandlers(deps: CrashIpcDependencies): void {
  const { ipc, getDatabase } = deps;

  ipc.handle(IPC_CHANNELS.CRASH_LOG_ADD, (_event: IpcMainInvokeEvent, entry: NewCrashLog) => {
    const db = getDatabase();
    if (!db) throw new Error("database unavailable");
    return db.insertCrashLog(entry);
  });

  ipc.handle(IPC_CHANNELS.CRASH_LOGS_GET, (_event: IpcMainInvokeEvent, filter: CrashLogFilter) => {
    const db = getDatabase();
    if (!db) return [];
    return db.getCrashLogs(filter ?? {});
  });

  ipc.handle(IPC_CHANNELS.CRASH_LOG_DELETE, (_event: IpcMainInvokeEvent, id: number) => {
    const db = getDatabase();
    db?.deleteCrashLog(id);
  });

  ipc.handle(IPC_CHANNELS.CRASH_LOGS_CLEAR, () => {
    const db = getDatabase();
    db?.clearCrashLogs();
  });

  ipc.handle(IPC_CHANNELS.CRASH_LOGS_UPLOAD, (_event: IpcMainInvokeEvent, ids: number[]) => {
    const db = getDatabase();
    if (!db || !Array.isArray(ids) || ids.length === 0) return { uploaded: 0 };
    db.markCrashLogsUploaded(ids);
    return { uploaded: ids.length };
  });

  ipc.handle(IPC_CHANNELS.CRASH_UNUPLOADED_COUNT, () => {
    const db = getDatabase();
    return db?.getUnuploadedCrashCount() ?? 0;
  });
}

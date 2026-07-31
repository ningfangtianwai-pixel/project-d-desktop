import type { IpcHandlerStore } from "./handler-registry.js";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { DatabaseService } from "../database";

export interface CrashIpcDependencies {
  ipc: IpcHandlerStore;
  assertTrustedSender: (event: Electron.IpcMainInvokeEvent, allowedHashes?: readonly string[]) => void;
  getDatabase: () => DatabaseService | null;
}

export function registerCrashIpcHandlers(deps: CrashIpcDependencies): void {
  const { ipc, getDatabase } = deps;

  ipc.handle(IPC_CHANNELS.CRASH_LOG_ADD, (_event, entry) => {
    const db = getDatabase();
    if (!db) throw new Error("database unavailable");
    return db.insertCrashLog(entry);
  });

  ipc.handle(IPC_CHANNELS.CRASH_LOGS_GET, (_event, filter) => {
    const db = getDatabase();
    if (!db) return [];
    return db.getCrashLogs(filter ?? {});
  });

  ipc.handle(IPC_CHANNELS.CRASH_LOG_DELETE, (_event, id) => {
    const db = getDatabase();
    db?.deleteCrashLog(id);
  });

  ipc.handle(IPC_CHANNELS.CRASH_LOGS_CLEAR, () => {
    const db = getDatabase();
    db?.clearCrashLogs();
  });

  ipc.handle(IPC_CHANNELS.CRASH_LOGS_UPLOAD, (_event, ids) => {
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

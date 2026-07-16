import { clipboard, shell, type IpcMain, type IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { PortalConfig, WorkspaceSearchResult } from "../../shared/types.js";
import type { SearchService } from "./search-service.js";

type TrustedSenderGuard = (event: IpcMainInvokeEvent, routes?: string[]) => void;

export interface SearchIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: TrustedSenderGuard;
  getService: () => SearchService | null;
  presentResult: (result: Awaited<ReturnType<SearchService["search"]>>[number]) => WorkspaceSearchResult;
  resolveResultPath: (resultId: string) => Promise<string>;
  pinToScene: (resultId: string, sceneId: string) => Promise<void>;
  authorizePortal: (resultId: string) => Promise<PortalConfig | null>;
}

function assertResultHandle(resultId: unknown): asserts resultId is string {
  if (typeof resultId !== "string" || resultId.length < 20 || resultId.length > 80) {
    throw new Error("Invalid workspace search result");
  }
}

export function registerSearchIpcHandlers(deps: SearchIpcDependencies): void {
  const { ipc, assertTrustedSender } = deps;

  ipc.handle(IPC_CHANNELS.SEARCH_QUERY, async (event, rawQuery: unknown, limit: unknown): Promise<WorkspaceSearchResult[]> => {
    assertTrustedSender(event, ["", "#/overlay"]);
    const service = deps.getService();
    if (!service || typeof rawQuery !== "string" || rawQuery.length > 160) {
      throw new Error("Invalid workspace search query");
    }
    const numericLimit = typeof limit === "number" && Number.isFinite(limit) ? limit : undefined;
    return (await service.search(rawQuery, { limit: numericLimit })).map(deps.presentResult);
  });

  ipc.handle(IPC_CHANNELS.SEARCH_OPEN_RESULT, async (event, resultId: unknown): Promise<void> => {
    assertTrustedSender(event, ["", "#/overlay"]);
    assertResultHandle(resultId);
    const result = await shell.openPath(await deps.resolveResultPath(resultId));
    if (result) throw new Error(result);
  });

  ipc.handle(IPC_CHANNELS.SEARCH_REVEAL_RESULT, async (event, resultId: unknown): Promise<void> => {
    assertTrustedSender(event, ["", "#/overlay"]);
    assertResultHandle(resultId);
    shell.showItemInFolder(await deps.resolveResultPath(resultId));
  });

  ipc.handle(IPC_CHANNELS.SEARCH_COPY_PATH, async (event, resultId: unknown): Promise<void> => {
    assertTrustedSender(event, ["", "#/overlay"]);
    assertResultHandle(resultId);
    clipboard.writeText(await deps.resolveResultPath(resultId));
  });

  ipc.handle(IPC_CHANNELS.SEARCH_PIN_TO_SCENE, async (event, resultId: unknown, sceneId: unknown): Promise<void> => {
    assertTrustedSender(event, ["", "#/overlay"]);
    assertResultHandle(resultId);
    if (typeof sceneId !== "string" || sceneId.length < 8 || sceneId.length > 80) {
      throw new Error("Invalid scene id");
    }
    await deps.pinToScene(resultId, sceneId);
  });

  ipc.handle(IPC_CHANNELS.SEARCH_ADD_TO_PORTAL, async (event, resultId: unknown): Promise<PortalConfig | null> => {
    assertTrustedSender(event, ["", "#/overlay"]);
    assertResultHandle(resultId);
    return deps.authorizePortal(resultId);
  });

  ipc.handle(IPC_CHANNELS.SEARCH_RESOLVE_PATH, async (event, resultId: unknown): Promise<string> => {
    assertTrustedSender(event, ["", "#/overlay"]);
    assertResultHandle(resultId);
    return deps.resolveResultPath(resultId);
  });
}

import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import type { PetWindowBounds } from "../../shared/types.js";

type TrustedSenderGuard = (event: IpcMainInvokeEvent, routes?: string[]) => void;

export interface PetIpcDependencies {
  ipc: IpcMain;
  assertTrustedSender: TrustedSenderGuard;
  getPetBounds: () => PetWindowBounds;
  movePet: (dx: number, dy: number) => PetWindowBounds;
  resetPet: () => PetWindowBounds;
  setPetInteractive: (interactive: boolean) => void;
  showPetMenu: () => void;
  showPet: () => void;
  hidePet: () => void;
  getSettings: () => { pet: { isVisible: boolean; scale: number } } | null;
  setOnboardingActive: (active: boolean) => void;
}

export function registerPetIpcHandlers(deps: PetIpcDependencies): void {
  const { ipc, assertTrustedSender } = deps;

  ipc.handle(IPC_CHANNELS.PET_GET_WINDOW_BOUNDS, (event): PetWindowBounds => {
    assertTrustedSender(event, ["#/pet"]);
    return deps.getPetBounds();
  });

  ipc.handle(IPC_CHANNELS.PET_MOVE_WINDOW, (event, deltaX: unknown, deltaY: unknown): PetWindowBounds => {
    assertTrustedSender(event, ["#/pet"]);
    if (typeof deltaX !== "number" || !Number.isFinite(deltaX) || Math.abs(deltaX) > 4_000) throw new Error("Invalid delta x");
    if (typeof deltaY !== "number" || !Number.isFinite(deltaY) || Math.abs(deltaY) > 4_000) throw new Error("Invalid delta y");
    return deps.movePet(deltaX, deltaY);
  });

  ipc.handle(IPC_CHANNELS.PET_RESET_WINDOW, (event): PetWindowBounds => {
    assertTrustedSender(event, ["#/pet", "#/settings"]);
    return deps.resetPet();
  });

  ipc.handle(IPC_CHANNELS.PET_SET_INTERACTIVE, (event, interactive: unknown): void => {
    assertTrustedSender(event, ["#/pet"]);
    if (typeof interactive !== "boolean") throw new Error("Invalid interactive state");
    deps.setPetInteractive(interactive);
  });

  ipc.handle(IPC_CHANNELS.PET_CONTEXT_MENU, (event): void => {
    assertTrustedSender(event, ["#/pet"]);
    deps.showPetMenu();
  });

  ipc.handle(IPC_CHANNELS.PET_SHOW, (event): void => {
    assertTrustedSender(event);
    deps.showPet();
  });

  ipc.handle(IPC_CHANNELS.PET_HIDE, (event): void => {
    assertTrustedSender(event);
    deps.hidePet();
  });

  ipc.handle(IPC_CHANNELS.ONBOARDING_SET_ACTIVE, (event, active: unknown): void => {
    assertTrustedSender(event, [""]);
    if (typeof active !== "boolean") throw new Error("Invalid onboarding state");
    deps.setOnboardingActive(active);
  });
}

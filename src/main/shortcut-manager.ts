export const DEFAULT_PEEK_ACCELERATOR = "Control+Alt+Space";
export const EMERGENCY_ACCELERATOR = "Control+Alt+Shift+Escape";

export interface ShortcutRegistry {
  register: (accelerator: string, callback: () => void) => boolean;
  unregister: (accelerator: string) => void;
  isRegistered: (accelerator: string) => boolean;
}

export interface ShortcutStateStore {
  getAppState: (key: string) => string | null;
  setAppState: (key: string, value: string) => void;
}

export interface ShortcutLogger {
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
}

export interface ShortcutActions {
  showWorkspace: () => void;
  restoreDesktop: () => void | Promise<void>;
}

export interface PeekShortcutStatus {
  accelerator: string;
  persistedState: string;
  registered: boolean;
}

export class ShortcutManager {
  private peekAccelerator = DEFAULT_PEEK_ACCELERATOR;

  constructor(
    private readonly registry: ShortcutRegistry,
    private readonly state: ShortcutStateStore,
    private readonly logger: ShortcutLogger,
    private readonly actions: ShortcutActions
  ) {}

  registerAll(): void {
    const saved = this.state.getAppState("shortcut_peek") || DEFAULT_PEEK_ACCELERATOR;
    this.peekAccelerator = isValidPeekAccelerator(saved) ? saved : DEFAULT_PEEK_ACCELERATOR;
    this.registry.unregister(this.peekAccelerator);
    const peekRegistered = this.registry.register(this.peekAccelerator, this.peekHandler(this.peekAccelerator));
    if (this.peekAccelerator !== saved) this.state.setAppState("shortcut_peek", this.peekAccelerator);
    this.state.setAppState("shortcut_peek_status", peekRegistered ? "ready" : "conflict");
    this.logRegistration("workspace shortcut registration", this.peekAccelerator, peekRegistered);

    this.registry.unregister(EMERGENCY_ACCELERATOR);
    const emergencyRegistered = this.registry.register(EMERGENCY_ACCELERATOR, () => {
      void Promise.resolve(this.actions.restoreDesktop()).catch((error) => {
        this.logger.warn("emergency desktop shortcut failed", { message: errorMessage(error) });
      });
    });
    this.state.setAppState("shortcut_emergency_status", emergencyRegistered ? "ready" : "conflict");
    this.logRegistration("emergency desktop shortcut registration", EMERGENCY_ACCELERATOR, emergencyRegistered);
  }

  async setPeekShortcut(input: unknown): Promise<{ success: boolean; accelerator: string }> {
    if (typeof input !== "string" || !isValidPeekAccelerator(input)) throw new Error("invalid");

    const oldAccelerator = this.state.getAppState("shortcut_peek") || this.peekAccelerator;
    if (oldAccelerator === input) {
      if (!this.registry.isRegistered(input)) {
        const restored = this.registry.register(input, this.peekHandler(input));
        this.state.setAppState("shortcut_peek_status", restored ? "ready" : "conflict");
        if (!restored) throw new Error("conflict");
      } else {
        this.state.setAppState("shortcut_peek_status", "ready");
      }
      this.peekAccelerator = input;
      return { success: true, accelerator: input };
    }

    const registered = this.registry.register(input, this.peekHandler(input));
    if (!registered) {
      this.state.setAppState("shortcut_peek_status", "conflict");
      throw new Error("conflict");
    }

    this.registry.unregister(oldAccelerator);
    this.peekAccelerator = input;
    this.state.setAppState("shortcut_peek", input);
    this.state.setAppState("shortcut_peek_status", "ready");
    this.logger.info("peek shortcut changed", { from: oldAccelerator, to: input });
    return { success: true, accelerator: input };
  }

  peekStatus(): PeekShortcutStatus {
    const accelerator = this.state.getAppState("shortcut_peek") || this.peekAccelerator;
    return {
      accelerator,
      persistedState: this.state.getAppState("shortcut_peek_status") || "unknown",
      registered: this.registry.isRegistered(accelerator)
    };
  }

  dispose(): void {
    this.registry.unregister(this.peekAccelerator);
    this.registry.unregister(EMERGENCY_ACCELERATOR);
  }

  private peekHandler(accelerator: string): () => void {
    return () => {
      this.actions.showWorkspace();
      this.logger.info("workspace shortcut invoked", { accelerator });
    };
  }

  private logRegistration(message: string, accelerator: string, registered: boolean): void {
    const data = { accelerator, registered };
    if (registered) this.logger.info(message, data);
    else this.logger.warn(message, data);
  }
}

export function isValidPeekAccelerator(accelerator: string): boolean {
  if (accelerator.length < 3 || accelerator.length > 80 || /[\x00-\x1f\x7f]/.test(accelerator)) return false;
  const parts = accelerator.split("+");
  if (parts.some((part) => !part) || new Set(parts).size !== parts.length) return false;
  const modifiers = new Set(["Control", "Alt", "Shift", "Meta", "CommandOrControl"]);
  const key = parts.at(-1) ?? "";
  if (!parts.slice(0, -1).every((part) => modifiers.has(part)) || parts.length < 2) return false;
  return /^(?:[A-Z0-9]|Space|Enter|Tab|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Up|Down|Left|Right|Plus|F(?:[1-9]|1\d|2[0-4]))$/.test(key);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

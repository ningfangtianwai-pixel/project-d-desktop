export interface ShortcutRegistry {
  register(accelerator: string, callback: () => void): boolean;
  unregister(accelerator: string): void;
}

export class CleanDesktopEscapeGuard {
  private armed = false;

  constructor(
    private readonly shortcuts: ShortcutRegistry,
    private readonly onEscape: () => void
  ) {}

  arm(): boolean {
    if (this.armed) return true;
    this.shortcuts.unregister("Escape");
    this.armed = this.shortcuts.register("Escape", this.onEscape);
    return this.armed;
  }

  disarm(): void {
    if (!this.armed) return;
    this.shortcuts.unregister("Escape");
    this.armed = false;
  }

  isArmed(): boolean {
    return this.armed;
  }
}

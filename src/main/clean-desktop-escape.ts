export interface ShortcutRegistry {
  register(accelerator: string, callback: () => void): boolean;
  unregister(accelerator: string): void;
}

export class CleanDesktopEscapeGuard {
  private armed = false;
  private accelerator = "Escape";

  constructor(
    private readonly shortcuts: ShortcutRegistry,
    private readonly onEscape: () => void
  ) {}

  arm(accelerator = "Escape"): boolean {
    if (this.armed && this.accelerator === accelerator) return true;
    this.disarm();
    this.accelerator = accelerator;
    this.shortcuts.unregister(accelerator);
    this.armed = this.shortcuts.register(accelerator, this.onEscape);
    return this.armed;
  }

  disarm(): void {
    if (!this.armed) return;
    this.shortcuts.unregister(this.accelerator);
    this.armed = false;
  }

  isArmed(): boolean {
    return this.armed;
  }

  getAccelerator(): string {
    return this.accelerator;
  }
}

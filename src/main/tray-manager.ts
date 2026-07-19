import { Menu, nativeImage, Tray } from "electron";

type TrayAction = () => void | Promise<void>;

export interface ProjectTrayActions {
  showMain: TrayAction;
  activateDesktop: TrayAction;
  deactivateDesktop: TrayAction;
  enterCleanDesktop: TrayAction;
  exitCleanDesktop: TrayAction;
  emergencyRestore: TrayAction;
  startWallpaper: TrayAction;
  stopWallpaper: TrayAction;
  pauseEffects: TrayAction;
  resumeEffects: TrayAction;
  showPet: TrayAction;
  hidePet: TrayAction;
  resetPet: TrayAction;
  openSettings: TrayAction;
  checkForUpdates: TrayAction;
  quit: TrayAction;
}

export class ProjectTrayManager {
  private tray: Tray | null = null;

  constructor(
    private readonly actions: ProjectTrayActions,
    private readonly onActionError: (action: string, error: unknown) => void
  ) {}

  create(): Tray {
    if (this.tray && !this.tray.isDestroyed()) return this.tray;

    const tray = new Tray(createTrayIcon());
    tray.setToolTip("Project D");
    tray.setContextMenu(Menu.buildFromTemplate([
      this.item("显示 Project D", "show-main", this.actions.showMain),
      this.item("启动整理", "activate-desktop", this.actions.activateDesktop),
      this.item("安全归位", "deactivate-desktop", this.actions.deactivateDesktop),
      this.item("纯净桌面（Esc 退出）", "enter-clean-desktop", this.actions.enterCleanDesktop),
      this.item("恢复桌面", "exit-clean-desktop", this.actions.exitCleanDesktop),
      this.item("紧急安全归位", "emergency-restore", this.actions.emergencyRestore),
      { type: "separator" },
      this.item("启动动态壁纸", "start-wallpaper", this.actions.startWallpaper),
      this.item("关闭动态壁纸", "stop-wallpaper", this.actions.stopWallpaper),
      this.item("暂停动态效果", "pause-effects", this.actions.pauseEffects),
      this.item("继续动态效果", "resume-effects", this.actions.resumeEffects),
      { type: "separator" },
      this.item("显示桌宠", "show-pet", this.actions.showPet),
      this.item("隐藏桌宠", "hide-pet", this.actions.hidePet),
      this.item("复位桌宠位置", "reset-pet", this.actions.resetPet),
      { type: "separator" },
      this.item("设置", "open-settings", this.actions.openSettings),
      this.item("检查更新", "check-updates", this.actions.checkForUpdates),
      { type: "separator" },
      this.item("退出", "quit", this.actions.quit)
    ]));
    tray.on("click", () => this.invoke("show-main", this.actions.showMain));
    this.tray = tray;
    return tray;
  }

  destroy(): void {
    if (this.tray && !this.tray.isDestroyed()) this.tray.destroy();
    this.tray = null;
  }

  private item(label: string, actionName: string, action: TrayAction): Electron.MenuItemConstructorOptions {
    return { label, click: () => this.invoke(actionName, action) };
  }

  private invoke(actionName: string, action: TrayAction): void {
    void Promise.resolve()
      .then(action)
      .catch((error) => this.onActionError(actionName, error));
  }
}

function createTrayIcon(): Electron.NativeImage {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#14161a"/>
      <path d="M16 18h18c9 0 16 6 16 14s-7 14-16 14H16V18z" fill="#8dd8ff"/>
      <path d="M27 27h8c3 0 6 2 6 5s-3 5-6 5h-8V27z" fill="#14161a"/>
    </svg>
  `;
  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

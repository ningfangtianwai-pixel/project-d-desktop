import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseService } from "./database.js";
import type { AppLogger } from "./logger.js";
import type { DesktopStatus } from "../shared/types.js";
import {
  createDesktopIconRecoveryBatch,
  probeWindowsDesktopIcons,
  setWindowsDesktopIconsVisible,
  startDesktopIconRecoveryWatchdog
} from "./windows-desktop-icons.js";

export class DesktopController {
  private watchdogProcessId: number | null = null;
  private status: DesktopStatus = {
    mode: "idle",
    lastChangedAt: new Date().toISOString()
  };

  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    recoveryWatchdogProcessId: number | null = null
  ) {
    this.watchdogProcessId = recoveryWatchdogProcessId;
  }

  getStatus(): DesktopStatus {
    return this.status;
  }

  initialize(): void {
    this.generateRecoveryScript();
    const savedState = this.database.getAppState("desktop_state");
    this.status = {
      mode: savedState === "active" ? "safe-mode" : "idle",
      lastChangedAt: new Date().toISOString()
    };
  }

  async bootRecoveryCheck(): Promise<DesktopStatus> {
    const savedState = this.database.getAppState("desktop_state");
    let recoveredHiddenIcons = false;

    if (process.platform === "win32") {
      try {
        // Start this before inspecting the shell so an early crash, force-kill,
        // or renderer failure is still covered even when Project D was idle.
        await this.ensureRecoveryWatchdog();
        const iconState = await probeWindowsDesktopIcons();
        if (!iconState.visible) {
          this.logger.warn("desktop-state", "hidden desktop icons detected during boot", {
            savedState: savedState ?? "missing",
            iconCount: iconState.iconCount
          });
          await this.showDesktopIcons();
          await probeWindowsDesktopIcons();
          recoveredHiddenIcons = true;
        }
      } catch (error) {
        this.logger.warn("desktop-state", "boot desktop icon probe failed", {
          message: error instanceof Error ? error.message : String(error)
        });
        try {
          // A probe can race Explorer during sign-in, display resume, or shell
          // refresh.  Force the visible state through the same bounded retry
          // path instead of accepting a hidden desktop after one failed probe.
          await this.showDesktopIcons();
          await probeWindowsDesktopIcons();
          recoveredHiddenIcons = true;
          this.logger.info("desktop-state", "boot desktop icon recovery completed after probe retry");
        } catch (recoveryError) {
          this.logger.error("desktop-state", "boot desktop icon recovery exhausted retries", {
            message: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
          });
        }
      }
    }

    if (!savedState || savedState === "idle") {
      if (recoveredHiddenIcons) {
        this.database.setAppState("is_active", "false");
        this.database.setAppState(
          "boot_recovery_notice",
          JSON.stringify({
            savedState: savedState ?? "missing",
            recoveredAt: new Date().toISOString(),
            message: "检测到 Windows 桌面图标仍处于隐藏状态，Project D 已自动恢复。"
          })
        );
      }
      this.setStatus("idle", recoveredHiddenIcons ? "已自动恢复被隐藏的桌面图标" : "桌面处于正常状态");
      return this.status;
    }

    if (["active", "activating", "deactivating", "error", "safe-mode"].includes(savedState)) {
      this.logger.warn("desktop-state", "boot recovery started", { savedState });
      if (!recoveredHiddenIcons) {
        await this.showDesktopIcons();
      }
      this.database.setAppState("desktop_state", "idle");
      this.database.setAppState("is_active", "false");
      // A stale active marker means the previous owner did not complete its
      // cleanup path. Require explicit user confirmation before hiding the
      // native desktop again on this machine.
      const autoActivationWasEnabled = this.database.getAppState("auto_activate_on_start") === "true";
      const launchAtLoginWasEnabled = this.database.getAppState("launch_at_login") === "true";
      if (autoActivationWasEnabled || launchAtLoginWasEnabled) {
        this.database.setAppState("auto_activate_on_start", "false");
        this.database.setAppState("launch_at_login", "false");
        this.database.setAppState("desktop_auto_activation_suppressed", "true");
        this.logger.warn("desktop-state", "automatic desktop takeover disabled after unexpected exit", {
          autoActivationWasEnabled,
          launchAtLoginWasEnabled
        });
      }
      this.database.setAppState(
        "boot_recovery_notice",
        JSON.stringify({
          savedState,
          recoveredAt: new Date().toISOString(),
          message: "检测到上次桌面接管未正常结束，Project D 已自动恢复系统桌面图标。"
        })
      );
      this.setStatus("idle", "上次异常退出，已自动恢复桌面");
      this.logger.info("desktop-state", "boot recovery completed");
    }

    return this.status;
  }

  async activate(): Promise<DesktopStatus> {
    this.setStatus("activating", "正在启动整理");

    try {
      await this.ensureRecoveryWatchdog();
      await this.hideDesktopIcons();
      this.database.setAppState("desktop_state", "active");
      this.database.setAppState("is_active", "true");
      this.setStatus("active", "Project D 已接管桌面显示");
      return this.status;
    } catch (error) {
      this.database.setAppState("desktop_state", "safe-mode");
      this.database.setAppState("is_active", "false");
      this.setStatus("safe-mode", "桌面接管失败，已进入安全模式");
      this.logger.error("desktop-state", "activate failed; safe mode enabled", {
        message: error instanceof Error ? error.message : String(error)
      });
      return this.status;
    }
  }

  async deactivate(): Promise<DesktopStatus> {
    this.setStatus("deactivating", "正在安全归位");

    try {
      await this.showDesktopIcons();
      this.database.setAppState("desktop_state", "idle");
      this.database.setAppState("is_active", "false");
      this.database.setAppState("boot_recovery_notice", "");
      this.setStatus("idle", "桌面已安全归位");
      return this.status;
    } catch (error) {
      this.database.setAppState("desktop_state", "error");
      this.setStatus("error", "恢复桌面失败，请运行恢复脚本");
      this.logger.error("desktop-state", "deactivate failed", {
        message: error instanceof Error ? error.message : String(error)
      });
      return this.status;
    }
  }

  async recoverBeforeShutdown(): Promise<DesktopStatus> {
    const persistedState = this.database.getAppState("desktop_state");
    const requiresRecoveryMarker = this.status.mode !== "idle" || (persistedState !== null && persistedState !== "idle");
    if (requiresRecoveryMarker) {
      this.setStatus("deactivating", "正在退出前恢复桌面");
    }

    try {
      await this.showDesktopIcons();
      this.database.setAppState("desktop_state", "idle");
      this.database.setAppState("is_active", "false");
      this.setStatus("idle", "退出前桌面恢复完成");
      return this.status;
    } catch (error) {
      this.database.setAppState("desktop_state", "error");
      this.setStatus("error", "退出前桌面恢复失败，将由恢复守护进程继续处理");
      this.logger.error("desktop-state", "shutdown desktop recovery failed", {
        message: error instanceof Error ? error.message : String(error)
      });
      return this.status;
    }
  }

  private setStatus(mode: DesktopStatus["mode"], message: string): void {
    this.status = {
      mode,
      message,
      lastChangedAt: new Date().toISOString()
    };
    this.database.setAppState("desktop_state", mode);
    this.logger.info("desktop-state", "desktop status changed", this.status);
  }

  private async hideDesktopIcons(): Promise<void> {
    if (process.platform !== "win32") {
      this.logger.warn("desktop-state", "desktop icon hide not supported; using safe mode", { platform: process.platform });
      throw new Error("Desktop icon hide is currently implemented for Windows only");
    }

    await this.setWindowsHideIcons(1);
  }

  private async showDesktopIcons(): Promise<void> {
    if (process.platform !== "win32") {
      return;
    }

    await this.setWindowsHideIcons(0);
  }

  private async setWindowsHideIcons(value: 0 | 1): Promise<void> {
    const state = await setWindowsDesktopIconsVisible(value === 0);
    this.logger.info("desktop-state", "windows desktop icon visibility changed", {
      hideIcons: value,
      visible: state.visible,
      iconCount: state.iconCount,
      listViewHandle: state.listViewHandle
    });
  }

  private async ensureRecoveryWatchdog(): Promise<void> {
    if (this.watchdogProcessId !== null || process.platform !== "win32") return;
    this.watchdogProcessId = await startDesktopIconRecoveryWatchdog();
    this.logger.info("desktop-state", "desktop icon recovery watchdog started", {
      processId: this.watchdogProcessId,
      parentProcessId: process.pid
    });
  }

  private generateRecoveryScript(): void {
    const scriptPath = path.join(app.getPath("userData"), "ProjectD-Recover-Desktop.bat");
    const content = createDesktopIconRecoveryBatch();

    fs.writeFileSync(scriptPath, content, "utf8");
    this.database.setAppState("recovery_script_path", scriptPath);
    this.logger.info("desktop-state", "recovery script generated", { scriptPath });
  }
}

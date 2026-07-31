/**
 * 崩溃日志捕获模块
 *
 * 职责：
 * 1. 在应用崩溃时自动捕获并记录详细的崩溃信息
 * 2. 设备信息收集（OS 版本、内存状态、CPU 核心数）
 * 3. 崩溃日志持久化到 SQLite
 * 4. 对应用正常性能无明显影响（所有操作在异常路径，非热路径）
 */

import * as os from "node:os";
import type { BrowserWindow } from "electron";
import { app } from "electron";
import type { AppLogger } from "../logger";
import type { DatabaseService } from "../database";

let database: DatabaseService | null = null;
let logger: AppLogger | null = null;
let appVersion = "unknown";

/** 初始化崩溃捕获（在 app.whenReady 后调用） */
export function initCrashCapture(
  deps: { database: DatabaseService; logger: AppLogger; version: string }
): void {
  database = deps.database;
  logger = deps.logger;
  appVersion = deps.version;
}

/** 收集当前设备信息快照 */
function collectDeviceInfo(): { osInfo: string; memoryInfo: string } {
  try {
    const osInfo = `${os.type()} ${os.release()} ${os.arch()} / ${os.version()}`;
    const free = Math.round(os.freemem() / (1024 * 1024));
    const total = Math.round(os.totalmem() / (1024 * 1024));
    const memoryInfo = `free:${free}MB / total:${total}MB / cpus:${os.cpus().length}`;
    return { osInfo, memoryInfo };
  } catch {
    return { osInfo: `${os.type()} ${os.release()}`, memoryInfo: "unavailable" };
  }
}

/**
 * 记录崩溃事件到数据库
 * 性能考虑：只在进程即将崩溃的异常路径执行，不在热路径
 */
export function captureCrash(params: {
  type: string;
  error: Error | unknown;
  rendererPid?: number;
  breadcrumbs?: string;
}): void {
  if (!database) {
    // 兜底：数据库未就绪时写入临时文件
    recordFallbackCrash(params);
    return;
  }

  try {
    const error = params.error instanceof Error ? params.error : new Error(String(params.error));
    const { osInfo, memoryInfo } = collectDeviceInfo();

    database.insertCrashLog({
      type: params.type,
      message: error.message,
      stack: error.stack ?? null,
      crashedAt: new Date().toISOString(),
      appVersion,
      osInfo,
      memoryInfo,
      breadcrumbs: params.breadcrumbs ?? null,
      rendererPid: params.rendererPid ?? null
    });

    logger?.error("error", `captured crash [${params.type}]`, {
      message: error.message,
      hasBreadcrumbs: !!params.breadcrumbs
    });
  } catch {
    recordFallbackCrash(params);
  }
}

/** 兜底：数据库不可用时写入 JSON 到 app 数据目录 */
function recordFallbackCrash(params: {
  type: string; error: Error | unknown; rendererPid?: number; breadcrumbs?: string;
}): void {
  try {
    const fs = require("node:fs");
    const path = require("node:path");
    const error = params.error instanceof Error ? params.error : new Error(String(params.error));
    const dir = path.join(app.getPath("userData"), "crash-fallback");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `crash-${Date.now()}.json`);
    const { osInfo, memoryInfo } = collectDeviceInfo();
    fs.writeFileSync(file, JSON.stringify({
      type: params.type,
      message: error.message,
      stack: error.stack ?? null,
      crashedAt: new Date().toISOString(),
      appVersion,
      osInfo,
      memoryInfo,
      breadcrumbs: params.breadcrumbs ?? null,
      rendererPid: params.rendererPid ?? null,
      uploaded: false,
      createdAt: new Date().toISOString()
    }, null, 2), "utf8");
  } catch {
    // 静默失败：兜底也失败了，无法写入任何日志
  }
}

/**
 * 为主窗口注册渲染进程崩溃监听
 * 需要 window.webContents 创建之后调用
 */
export function registerRendererCrashListeners(window: BrowserWindow): void {
  if (!window || window.isDestroyed()) return;

  window.webContents.on("render-process-gone", (_event, details) => {
    captureCrash({
      type: "render-process-gone",
      error: new Error(
        `renderer crashed (reason:${details.reason}, exitCode:${details.exitCode})`
      ),
      rendererPid: window.webContents.getOSProcessId()
    });
  });

  window.webContents.on("crashed", (_event) => {
    captureCrash({
      type: "renderer-crashed",
      error: new Error("renderer webContents crashed"),
      rendererPid: window.webContents.getOSProcessId()
    });
  });

  window.webContents.on("unresponsive", () => {
    captureCrash({
      type: "renderer-unresponsive",
      error: new Error("renderer webContents unresponsive"),
      rendererPid: window.webContents.getOSProcessId()
    });
  });
}

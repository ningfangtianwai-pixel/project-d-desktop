/**
 * 渲染进程全局错误捕获插件
 *
 * 捕获：
 * 1. window.onerror（同步错误）
 * 2. window.onunhandledrejection（未捕获 Promise 拒绝）
 * 3. Vue app.config.errorHandler（Vue 组件错误）
 *
 * 所有错误附带 breadcrumbs 上报到主进程持久化
 */

import type { App } from "vue";
import { breadcrumbsToJson, trackRouteChange, trackClick } from "./breadcrumb-tracker";

/** 通过 IPC 异步上报崩溃，不阻塞渲染线程 */
function reportCrash(type: string, error: Error | string): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? null) : null;

  // 异步上报，失败静默
  Promise.resolve().then(async () => {
    try {
      if (window.projectD?.addCrashLog) {
        await window.projectD.addCrashLog({
          type,
          message: message.slice(0, 2048),
          stack: stack?.slice(0, 8192) ?? null,
          crashedAt: new Date().toISOString(),
          appVersion: "browser", // 渲染进程不知主版本，主进程会覆盖
          osInfo: navigator.userAgent.slice(0, 512),
          memoryInfo: "renderer",
          breadcrumbs: breadcrumbsToJson().slice(0, 4096),
          rendererPid: null
        });
      }
    } catch {
      // 上报失败 — 已尽力
    }
  });
}

/** 安装全局错误监听，在 Vue app mount 前调用 */
export function installGlobalErrorHandlers(): void {
  // 用户导航追踪 — 帮助定位"打开 X 后闪退"
  window.addEventListener("hashchange", () => {
    trackRouteChange(window.location.hash);
  });

  // 全局点击追踪 — 帮助定位"点了 Y 后闪退"
  document.addEventListener("click", (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target) return;
    // 只追踪有意义的交互元素
    const label = target.getAttribute("aria-label")
      ?? target.getAttribute("data-track")
      ?? target.textContent?.slice(0, 40)?.trim();
    if (label && target.tagName !== "BODY" && target.tagName !== "HTML") {
      trackClick(label);
    }
  }, { passive: true });

  // JS 错误捕获
  window.addEventListener("error", (event: ErrorEvent) => {
    // 只处理 JS 错误，不处理资源加载失败
    if (event.error instanceof Error) {
      reportCrash("renderer-error", event.error);
    }
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    if (reason instanceof Error) {
      reportCrash("renderer-unhandledrejection", reason);
    } else {
      reportCrash("renderer-unhandledrejection", new Error(String(reason)));
    }
  });
}

/** 作为 Vue 插件安装 errorHandler */
export function createErrorHandlerPlugin() {
  return {
    install(app: App): void {
      const originalErrorHandler = app.config.errorHandler;

      app.config.errorHandler = (err, instance, info) => {
        reportCrash("vue-error", err instanceof Error ? err : new Error(String(err)));

        // 保留原有 handler（如果有的话）
        if (originalErrorHandler) {
          originalErrorHandler.call(app, err, instance, info);
        }
      };
    }
  };
}

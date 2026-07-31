/**
 * 用户操作路径追踪（Breadcrumb Tracker）
 *
 * 记录最近 48 条用户关键操作，崩溃时附带到日志中，
 * 帮助定位"做了什么导致闪退"。
 *
 * 性能：O(1) ring buffer，对正常使用零性能影响
 */

export interface Breadcrumb {
  /** 操作用户友好描述 */
  label: string;
  /** 操作分类：route | surface | click | ai | file | setting */
  category: string;
  /** 时间戳 */
  timestamp: string;
}

const MAX_BREADCRUMBS = 48;
const buffer: Breadcrumb[] = [];
let cursor = 0;

function push(breadcrumb: Breadcrumb): void {
  buffer[cursor % MAX_BREADCRUMBS] = breadcrumb;
  cursor++;
}

/** 获取最近 N 条面包屑，最新在前 */
export function getBreadcrumbs(limit = 48): Breadcrumb[] {
  const end = cursor;
  const start = Math.max(0, end - limit);
  const result: Breadcrumb[] = [];
  for (let i = start; i < end; i++) {
    result.push(buffer[i % MAX_BREADCRUMBS]);
  }
  return result.reverse();
}

/** 序列化为 JSON 字符串，用于崩溃报告 */
export function breadcrumbsToJson(): string {
  return JSON.stringify(getBreadcrumbs());
}

/** 清空所有记录 */
export function clearBreadcrumbs(): void {
  buffer.length = 0;
  cursor = 0;
}

// ── 追踪函数 ──

export function trackRouteChange(to: string): void {
  push({ label: to ? `导航: ${to}` : "导航: 首页", category: "route", timestamp: new Date().toISOString() });
}

export function trackSurfaceOpen(surface: string): void {
  push({ label: `打开面板: ${surface}`, category: "surface", timestamp: new Date().toISOString() });
}

export function trackSurfaceClose(surface: string): void {
  push({ label: `关闭面板: ${surface}`, category: "surface", timestamp: new Date().toISOString() });
}

export function trackClick(element: string): void {
  push({ label: `点击: ${element}`, category: "click", timestamp: new Date().toISOString() });
}

export function trackAiMessage(action: string): void {
  push({ label: `AI: ${action}`, category: "ai", timestamp: new Date().toISOString() });
}

export function trackFileOperation(action: string): void {
  push({ label: `文件操作: ${action}`, category: "file", timestamp: new Date().toISOString() });
}

export function trackSettingChange(key: string): void {
  push({ label: `设置变更: ${key}`, category: "setting", timestamp: new Date().toISOString() });
}

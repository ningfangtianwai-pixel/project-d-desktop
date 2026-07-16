import fs from "node:fs";
import type { RecentLogMetadata } from "./diagnostics-service.js";

const MAX_LOG_TAIL_BYTES = 64 * 1024;
const MAX_METADATA_ENTRIES = 20;

/**
 * Reads only a bounded tail from Project D's fixed error log. The returned
 * metadata still passes through DiagnosticsService before renderer exposure.
 */
export function readRecentLogMetadata(filePath: string): RecentLogMetadata[] {
  try {
    const stats = fs.statSync(filePath);
    const bytesToRead = Math.min(stats.size, MAX_LOG_TAIL_BYTES);
    if (bytesToRead <= 0) return [];

    const buffer = Buffer.alloc(bytesToRead);
    const descriptor = fs.openSync(filePath, "r");
    try {
      fs.readSync(descriptor, buffer, 0, bytesToRead, Math.max(0, stats.size - bytesToRead));
    } finally {
      fs.closeSync(descriptor);
    }

    return buffer
      .toString("utf8")
      .split(/\r?\n/)
      .slice(-MAX_METADATA_ENTRIES * 2)
      .flatMap(parseLogLine)
      .slice(-MAX_METADATA_ENTRIES);
  } catch {
    return [];
  }
}

function parseLogLine(line: string): RecentLogMetadata[] {
  if (!line.trim().startsWith("{")) return [];
  try {
    const entry = JSON.parse(line) as Record<string, unknown>;
    const rawLevel = typeof entry.level === "string" ? entry.level.toUpperCase() : "";
    if (rawLevel !== "ERROR" && rawLevel !== "WARN" && rawLevel !== "INFO") return [];
    const level = rawLevel === "ERROR" ? "error" : rawLevel === "WARN" ? "warn" : "info";
    const data = typeof entry.data === "object" && entry.data !== null
      ? entry.data as Record<string, unknown>
      : {};
    const summaryParts = [entry.message, data.error, data.summary]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    return [{
      level,
      code: typeof data.code === "string" ? data.code : typeof entry.message === "string" ? entry.message : null,
      summary: summaryParts.join(": ") || "Unknown diagnostic error",
      occurredAt: typeof entry.at === "string" ? entry.at : null
    }];
  } catch {
    return [];
  }
}

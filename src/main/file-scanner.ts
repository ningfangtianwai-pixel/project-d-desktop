import { app } from "electron";
import nativeFs from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { AppLogger } from "./logger.js";
import type { DatabaseService, UpsertDesktopFileInput } from "./database.js";
import type { FileCategory, ScanResult } from "../shared/types.js";

const DOCUMENT_EXTENSIONS = new Set([
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".pdf",
  ".txt",
  ".md",
  ".csv",
  ".rtf",
  ".wps",
  ".et",
  ".dps"
]);

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".ico", ".heic"]);
const MEDIA_EXTENSIONS = new Set([".mp4", ".mov", ".avi", ".mkv", ".mp3", ".wav", ".flac", ".m4a", ".aac"]);
const CODE_EXTENSIONS = new Set([
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".vue",
  ".json",
  ".html",
  ".css",
  ".scss",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".c",
  ".cpp",
  ".h",
  ".cs",
  ".sql",
  ".ps1",
  ".bat",
  ".cmd",
  ".sh",
  ".yml",
  ".yaml",
  ".toml"
]);
const ARCHIVE_EXTENSIONS = new Set([".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".iso"]);
const PROGRAM_EXTENSIONS = new Set([".exe", ".msi", ".app", ".dmg", ".lnk", ".url"]);
const DESIGN_EXTENSIONS = new Set([".psd", ".ai", ".fig", ".sketch", ".xd"]);
const SCAN_DEBOUNCE_MS = 500;
const MAX_BATCH_DELAY_MS = 2000;

export class FileScanner {
  private watcher: nativeFs.FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private maxBatchTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger
  ) {}

  async scanDesktop(): Promise<ScanResult> {
    const startedAt = Date.now();
    const desktopPath = app.getPath("desktop");
    const entries = await fs.readdir(desktopPath, { withFileTypes: true });
    const files: UpsertDesktopFileInput[] = [];

    for (const entry of entries) {
      if (this.shouldSkip(entry.name)) {
        continue;
      }

      const fullPath = path.join(desktopPath, entry.name);
      const stat = await fs.stat(fullPath);
      const extension = entry.isDirectory() ? "" : path.extname(entry.name).toLowerCase();
      const category = this.classify(extension, entry.isDirectory());

      files.push({
        filename: entry.name,
        fullPath,
        extension,
        category,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        isShortcut: extension === ".lnk" || extension === ".url",
        fingerprint: `${fullPath}|${stat.size}|${stat.mtimeMs}`
      });
    }

    const result = this.database.upsertDesktopFiles(desktopPath, files);
    const scanResult: ScanResult = {
      desktopPath,
      scannedAt: new Date().toISOString(),
      totalEntries: entries.length,
      insertedOrUpdated: result.insertedOrUpdated,
      markedMissing: result.markedMissing,
      durationMs: Date.now() - startedAt
    };

    this.database.setAppState("last_scan_time", scanResult.scannedAt);
    this.logger.info("app", "desktop scan completed", scanResult);
    return scanResult;
  }

  async startWatching(onUpdated: (result: ScanResult) => void): Promise<void> {
    if (this.watcher) {
      return;
    }

    const desktopPath = app.getPath("desktop");
    const schedule = (eventName: string, changedPath: string) => {
      if (this.shouldSkip(path.basename(changedPath))) {
        return;
      }
      this.logger.info("app", "desktop watcher event", { eventName, changedPath });
      this.scheduleScan(onUpdated);
    };

    this.watcher = nativeFs.watch(desktopPath, { persistent: true }, (eventName, filename) => {
      const changedPath = filename ? path.join(desktopPath, filename.toString()) : desktopPath;
      schedule(eventName, changedPath);
    });

    this.watcher.on("error", (error) => {
        this.logger.error("error", "desktop watcher failed", {
          message: error instanceof Error ? error.message : String(error)
        });
      });

    this.logger.info("app", "desktop watcher started", { desktopPath });
  }

  async stopWatching(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.maxBatchTimer) {
      clearTimeout(this.maxBatchTimer);
      this.maxBatchTimer = null;
    }
    this.watcher?.close();
    this.watcher = null;
  }

  private scheduleScan(onUpdated: (result: ScanResult) => void): void {
    const run = () => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      if (this.maxBatchTimer) {
        clearTimeout(this.maxBatchTimer);
        this.maxBatchTimer = null;
      }
      void this.scanDesktop()
        .then(onUpdated)
        .catch((error: unknown) => {
          this.logger.error("error", "debounced desktop scan failed", {
            message: error instanceof Error ? error.message : String(error)
          });
        });
    };

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(run, SCAN_DEBOUNCE_MS);
    this.maxBatchTimer ??= setTimeout(run, MAX_BATCH_DELAY_MS);
  }

  private classify(extension: string, isDirectory: boolean): FileCategory {
    if (isDirectory) {
      return "folder";
    }
    if (PROGRAM_EXTENSIONS.has(extension)) {
      return "program";
    }
    if (DOCUMENT_EXTENSIONS.has(extension)) {
      return "document";
    }
    if (IMAGE_EXTENSIONS.has(extension)) {
      return "image";
    }
    if (MEDIA_EXTENSIONS.has(extension)) {
      return "media";
    }
    if (CODE_EXTENSIONS.has(extension)) {
      return "code";
    }
    if (ARCHIVE_EXTENSIONS.has(extension)) {
      return "archive";
    }
    if (DESIGN_EXTENSIONS.has(extension)) {
      return "design";
    }
    return "other";
  }

  private shouldSkip(name: string): boolean {
    const lowerName = name.toLowerCase();
    return (
      name.startsWith(".") ||
      name.startsWith(".~") ||
      name.startsWith("~$") ||
      lowerName === "desktop.ini" ||
      lowerName === "thumbs.db" ||
      lowerName === ".ds_store" ||
      lowerName.includes("projectd-recover-desktop") ||
      lowerName.includes("project d cache")
    );
  }
}

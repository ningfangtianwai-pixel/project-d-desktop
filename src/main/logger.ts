import { app, shell } from "electron";
import fs from "node:fs";
import path from "node:path";

export type LogFile = "app" | "error" | "desktop-state" | "ai";
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface AppLoggerOptions {
  maxBytes?: number;
  retainedFiles?: number;
  minimumLevel?: LogLevel;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};

export class AppLogger {
  private readonly logsDir: string;
  private readonly maxBytes: number;
  private readonly retainedFiles: number;
  private readonly minimumLevel: LogLevel;

  constructor(logsDir = path.join(app.getPath("userData"), "logs"), options: AppLoggerOptions = {}) {
    this.logsDir = logsDir;
    this.maxBytes = Math.max(64 * 1024, options.maxBytes ?? 5 * 1024 * 1024);
    this.retainedFiles = Math.max(1, Math.min(10, options.retainedFiles ?? 3));
    this.minimumLevel = options.minimumLevel ?? "INFO";
    fs.mkdirSync(this.logsDir, { recursive: true });
  }

  get directory(): string {
    return this.logsDir;
  }

  debug(file: LogFile, message: string, data?: unknown): void {
    this.write(file, "DEBUG", message, data);
  }

  info(file: LogFile, message: string, data?: unknown): void {
    this.write(file, "INFO", message, data);
  }

  warn(file: LogFile, message: string, data?: unknown): void {
    this.write(file, "WARN", message, data);
  }

  error(file: LogFile, message: string, data?: unknown): void {
    this.write(file, "ERROR", message, data);
  }

  openDirectory(): Promise<string> {
    return shell.openPath(this.logsDir);
  }

  private write(file: LogFile, level: LogLevel, message: string, data?: unknown): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minimumLevel]) return;

    const line = this.serialize(level, message, data);
    const logPath = path.join(this.logsDir, `${file}.log`);
    try {
      this.rotateIfNeeded(logPath, Buffer.byteLength(line) + 1);
      fs.appendFileSync(logPath, `${line}\n`, "utf8");
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[Project D logger] ${reason}\n`);
    }
  }

  private serialize(level: LogLevel, message: string, data?: unknown): string {
    const record = {
      at: new Date().toISOString(),
      level,
      message,
      data: data ?? null
    };
    try {
      return JSON.stringify(record);
    } catch (error) {
      return JSON.stringify({
        ...record,
        data: null,
        serializationError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private rotateIfNeeded(logPath: string, incomingBytes: number): void {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size + incomingBytes <= this.maxBytes) return;

    const oldest = `${logPath}.${this.retainedFiles}`;
    if (fs.existsSync(oldest)) fs.unlinkSync(oldest);
    for (let index = this.retainedFiles - 1; index >= 1; index -= 1) {
      const source = `${logPath}.${index}`;
      if (fs.existsSync(source)) fs.renameSync(source, `${logPath}.${index + 1}`);
    }
    fs.renameSync(logPath, `${logPath}.1`);
  }
}

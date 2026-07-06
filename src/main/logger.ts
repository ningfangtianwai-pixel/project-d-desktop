import { app, shell } from "electron";
import fs from "node:fs";
import path from "node:path";

export type LogFile = "app" | "error" | "desktop-state" | "ai";

export class AppLogger {
  private readonly logsDir: string;

  constructor(logsDir = path.join(app.getPath("userData"), "logs")) {
    this.logsDir = logsDir;
    fs.mkdirSync(this.logsDir, { recursive: true });
  }

  get directory(): string {
    return this.logsDir;
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

  private write(file: LogFile, level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown): void {
    const line = JSON.stringify({
      at: new Date().toISOString(),
      level,
      message,
      data: data ?? null
    });

    fs.appendFileSync(path.join(this.logsDir, `${file}.log`), `${line}\n`, "utf8");
  }
}

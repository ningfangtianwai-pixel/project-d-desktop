import { app, dialog } from "electron";
import fs from "node:fs";
import path from "node:path";

const PRODUCT_NAME = "Project D";

function resolveUserDataPath(): string {
  const qaUserDataPath = process.env.PROJECTD_QA_USER_DATA_DIR;
  if (qaUserDataPath) return path.resolve(qaUserDataPath);
  return path.join(app.getPath("appData"), PRODUCT_NAME);
}

function writeStartupFailure(error: unknown): string {
  const logDir = path.join(app.getPath("userData"), "logs");
  const logPath = path.join(logDir, "startup-fatal.log");
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : null;

  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(
      logPath,
      `${JSON.stringify({ at: new Date().toISOString(), message, stack })}\n`,
      "utf8"
    );
  } catch {
    // A startup failure must still terminate even when logging is unavailable.
  }

  return logPath;
}

app.setName(PRODUCT_NAME);
app.setPath("userData", resolveUserDataPath());

try {
  require("./main.js");
} catch (error) {
  const logPath = writeStartupFailure(error);
  const message = error instanceof Error ? error.message : String(error);
  dialog.showErrorBox(
    "Project D 启动失败",
    `程序已安全退出，不会继续留在后台。\n\n错误：${message}\n\n诊断日志：${logPath}`
  );
  process.exit(1);
}

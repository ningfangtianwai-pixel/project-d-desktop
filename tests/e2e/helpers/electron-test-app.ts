import { _electron as electron, expect, type ElectronApplication, type Page } from "@playwright/test";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface ProjectDTestApp {
  app: ElectronApplication;
  env: NodeJS.ProcessEnv;
  root: string;
  userDataDir: string;
  window: Page;
}

interface LaunchOptions {
  env?: NodeJS.ProcessEnv;
  entry?: string;
  userDataDir?: string;
  waitForHealthy?: boolean;
}

const SECRET_ENV_KEYS = [
  "DEEPSEEK_API_KEY",
  "MIMO_API_KEY",
  "OPENAI_API_KEY",
  "OPENWEATHER_API_KEY",
  "PROJECTD_DEEPSEEK_API_KEY",
  "PROJECTD_MIMO_API_KEY",
  "PROJECTD_MIMO_ENDPOINT",
  "PROJECTD_OPENAI_COMPATIBLE_API_KEY",
  "PROJECTD_OPENWEATHER_API_KEY"
] as const;

const QA_ENV_KEYS = [
  "PROJECTD_QA_CRASH_RENDERER",
  "PROJECTD_QA_ENABLE_UPDATER",
  "PROJECTD_QA_FORCE_WHITE_WALLPAPER",
  "PROJECTD_QA_HANG_SHUTDOWN",
  "PROJECTD_QA_METRICS_PATH",
  "PROJECTD_QA_OPEN_SETTINGS",
  "PROJECTD_QA_SOAK"
] as const;

export async function createIsolatedUserData(label: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), `projectd-e2e-${slug(label)}-`));
}

export async function launchProjectD(label: string, options: LaunchOptions = {}): Promise<ProjectDTestApp> {
  const root = process.cwd();
  const userDataDir = options.userDataDir ?? await createIsolatedUserData(label);
  const qaToken = `--projectd-qa-run=${slug(label)}-${process.pid}-${Date.now()}`;
  const env: NodeJS.ProcessEnv = { ...process.env };

  delete env.ELECTRON_RUN_AS_NODE;
  delete env.VITE_DEV_SERVER_URL;
  for (const key of [...SECRET_ENV_KEYS, ...QA_ENV_KEYS]) delete env[key];

  Object.assign(env, {
    PROJECTD_DEMO_AUTORUN: "0",
    PROJECTD_QA_AUTO_QUIT_MS: "60000",
    PROJECTD_QA_IDLE: "1",
    PROJECTD_QA_USER_DATA_DIR: userDataDir,
    ...options.env
  });

  const entry = options.entry ?? root;
  const args = entry === root ? [root, qaToken] : [entry, root, qaToken];
  const app = await electron.launch({ args, cwd: root, env });
  await app.firstWindow();
  const window = await findMainWindow(app);
  if (options.waitForHealthy !== false) await waitForHealthyMainWindow(window);
  return { app, env, root, userDataDir, window };
}

async function findMainWindow(app: ElectronApplication, timeoutMs = 15_000): Promise<Page> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const candidate of app.windows()) {
      if (candidate.isClosed()) continue;
      const isMainWindow = await candidate.locator(".app-shell").count().catch(() => 0);
      if (isMainWindow > 0) return candidate;
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error("Project D main window was not created before the E2E timeout");
}

export async function waitForHealthyMainWindow(window: Page): Promise<void> {
  await window.waitForLoadState("domcontentloaded");
  await expect(window.locator("body")).toContainText("Project D");
  await expect(window.locator("#app")).toBeVisible();
  await expect.poll(async () => {
    const bounds = await window.locator(".app-shell").boundingBox().catch(() => null);
    return Boolean(bounds && bounds.width >= 100 && bounds.height >= 100);
  }, { timeout: 15_000 }).toBe(true);
  await expect.poll(async () => {
    const status = await window.evaluate(() => window.projectD.getDatabaseStatus()).catch(() => null);
    return Boolean(status?.path && status.path !== "browser-preview");
  }, { timeout: 15_000 }).toBe(true);
}

export async function assertVisualHealth(app: ElectronApplication, window: Page): Promise<void> {
  const screenshot = await window.screenshot();
  const visual = await app.evaluate(({ nativeImage }, encoded) => {
    const image = nativeImage.createFromBuffer(Buffer.from(encoded, "base64"));
    const pixels = image.toBitmap();
    let whitePixels = 0;
    let darkPixels = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const blue = pixels[offset];
      const green = pixels[offset + 1];
      const red = pixels[offset + 2];
      if (red >= 248 && green >= 248 && blue >= 248) whitePixels += 1;
      if (red <= 48 && green <= 48 && blue <= 48) darkPixels += 1;
    }
    const pixelCount = Math.max(1, pixels.length / 4);
    return { whiteRatio: whitePixels / pixelCount, darkPixels, size: image.getSize() };
  }, screenshot.toString("base64"));

  expect(visual.size.width).toBeGreaterThan(100);
  expect(visual.size.height).toBeGreaterThan(100);
  expect(visual.whiteRatio).toBeLessThan(0.96);
  expect(visual.darkPixels).toBeGreaterThan(100);
}

export async function assertRecoveredMainWindow(app: ElectronApplication): Promise<void> {
  await expect.poll(async () => app.evaluate(async ({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows().find((candidate) => !candidate.isDestroyed());
    if (!window || window.webContents.isDestroyed() || window.webContents.isLoadingMainFrame()) return false;
    try {
      return await window.webContents.executeJavaScript(`(async () => {
        const root = document.querySelector(".app-shell");
        const bounds = root?.getBoundingClientRect();
        const database = await window.projectD?.getDatabaseStatus();
        const desktop = await window.projectD?.getDesktopStatus();
        return Boolean(
          document.body?.innerText?.includes("Project D")
          && bounds && bounds.width >= 100 && bounds.height >= 100
          && database?.path && database.path !== "browser-preview"
          && desktop?.mode === "idle"
        );
      })()`);
    } catch {
      return false;
    }
  }), { timeout: 20_000 }).toBe(true);

  const visual = await app.evaluate(async ({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows().find((candidate) => !candidate.isDestroyed());
    if (!window) return null;
    const image = await window.webContents.capturePage();
    const pixels = image.toBitmap();
    let whitePixels = 0;
    let darkPixels = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const blue = pixels[offset];
      const green = pixels[offset + 1];
      const red = pixels[offset + 2];
      if (red >= 248 && green >= 248 && blue >= 248) whitePixels += 1;
      if (red <= 48 && green <= 48 && blue <= 48) darkPixels += 1;
    }
    const pixelCount = Math.max(1, pixels.length / 4);
    return { whiteRatio: whitePixels / pixelCount, darkPixels, size: image.getSize() };
  });
  expect(visual).not.toBeNull();
  expect(visual?.size.width ?? 0).toBeGreaterThan(100);
  expect(visual?.size.height ?? 0).toBeGreaterThan(100);
  expect(visual?.whiteRatio ?? 1).toBeLessThan(0.96);
  expect(visual?.darkPixels ?? 0).toBeGreaterThan(100);
}

export async function assertDesktopRemainsUntouched(window: Page): Promise<void> {
  const state = await window.evaluate(async () => {
    const desktop = await window.projectD.getDesktopStatus();
    const settings = await window.projectD.getSettings();
    return {
      desktopMode: desktop.mode,
      dynamicWallpaper: settings.wallpaper.isDynamic,
      petVisible: settings.pet.isVisible
    };
  });
  expect(state).toEqual({
    desktopMode: "idle",
    dynamicWallpaper: false,
    petVisible: false
  });
}

export async function closeProjectD(testApp: ProjectDTestApp, removeUserData = true): Promise<void> {
  await testApp.app.close().catch(() => undefined);
  if (removeUserData) await fs.rm(testApp.userDataDir, { recursive: true, force: true });
}

export async function forceKillProjectD(testApp: ProjectDTestApp): Promise<void> {
  const process = testApp.app.process();
  const processExit = new Promise<void>((resolve) => {
    if (process.exitCode !== null) resolve();
    else process.once("exit", () => resolve());
  });
  await new Promise<void>((resolve, reject) => {
    execFile("taskkill", ["/PID", String(process.pid), "/T", "/F"], { windowsHide: true }, (error) => {
      if (error && process.exitCode === null) reject(error);
      else resolve();
    });
  });
  await processExit;
}

export async function assertDuplicateLaunchRejected(testApp: ProjectDTestApp): Promise<void> {
  const electronExecutable = require("electron") as string;
  const duplicate = spawn(electronExecutable, [testApp.root, `--projectd-qa-run=duplicate-${Date.now()}`], {
    cwd: testApp.root,
    env: testApp.env,
    windowsHide: true,
    stdio: "ignore"
  });
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    duplicate.once("error", reject);
    duplicate.once("exit", resolve);
  });
  expect(exitCode).toBe(0);
  const log = await waitForLog(testApp.userDataDir, "bootstrap.log", "second instance detected");
  expect(log).toContain('"locked":false');
}

export async function waitForLog(userDataDir: string, filename: string, text: string, timeoutMs = 15_000): Promise<string> {
  const target = path.join(userDataDir, "logs", filename);
  await expect.poll(async () => {
    const content = await fs.readFile(target, "utf8").catch(() => "");
    return content.includes(text);
  }, { timeout: timeoutMs }).toBe(true);
  return fs.readFile(target, "utf8");
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "case";
}

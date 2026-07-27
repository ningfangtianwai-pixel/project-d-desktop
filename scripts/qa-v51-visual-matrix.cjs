const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts", "qa", "v51-visual-matrix");
const port = 4196;
const edge = [
  path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
  path.join(process.env.PROGRAMFILES ?? "", "Microsoft", "Edge", "Application", "msedge.exe")
].find((candidate) => fs.existsSync(candidate));

if (!edge) throw new Error("Microsoft Edge is required for V5.1 visual matrix QA");
fs.mkdirSync(output, { recursive: true });

const vite = spawn(process.execPath, [
  path.join(root, "node_modules", "vite", "bin", "vite.js"),
  "preview",
  "--host", "127.0.0.1",
  "--port", String(port)
], { cwd: root, windowsHide: true, stdio: "ignore" });

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => vite.kill());

async function run() {
  await waitForPort(port);
  const browser = await chromium.launch({ headless: true, executablePath: edge });
  const page = await browser.newPage({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1 });
  const captures = [];
  try {
    await page.addInitScript(() => globalThis.localStorage.setItem("projectd:onboarding:v1", JSON.stringify({
      version: 1, currentStep: 5, status: "completed", updatedAt: new Date().toISOString()
    })));
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
    await page.locator(".wallpaper-stage").waitFor();

    await setWallpaper(page, "anime-lakeside-station");
    captures.push(await capture(page, "01-quiet-dark"));

    await page.locator('.ambient-edge-rail button[title="AI 对话"]').click();
    captures.push(await capture(page, "02-task-assistant"));

    await page.evaluate(() => { globalThis.location.hash = "#/overlay"; });
    await page.locator(".overlay-page").waitFor();
    await page.locator(".pull-cord-group button").last().click();
    await page.locator(".overlay-wallpaper-backdrop").waitFor();
    captures.push(await capture(page, "03-task-organizer"));

    await page.evaluate(() => { globalThis.location.hash = ""; });
    await page.locator(".app-shell").waitFor();
    await page.evaluate(() => globalThis.document.querySelector(".action-button.quiet")?.click());
    await page.waitForFunction(() => globalThis.document.querySelector(".app-shell")?.getAttribute("data-experience-mode") === "clean");
    captures.push(await capture(page, "04-clean-wallpaper"));

    await page.keyboard.press("Escape");
    await page.waitForFunction(() => globalThis.document.querySelector(".app-shell")?.getAttribute("data-experience-mode") === "quiet");
    await page.locator(".ambient-edge-rail button[title=\"壁纸与场景\"]").click();
    await page.locator(".wallpaper-task-card").waitFor();
    await setWallpaper(page, "landscape-coastal-cliffs");
    captures.push(await capture(page, "05-task-bright-wallpaper"));

    await page.evaluate(() => { globalThis.location.hash = "#/wallpaper"; });
    await page.locator(".wallpaper-studio-page").waitFor();
    captures.push(await capture(page, "06-wallpaper-studio"));

    const report = { generatedAt: new Date().toISOString(), viewport: { width: 1536, height: 864 }, passed: captures.every((item) => item.wallpaperVisible), captures };
    fs.writeFileSync(path.join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ...report, output }, null, 2));
    if (!report.passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

async function setWallpaper(page, wallpaperId) {
  await page.evaluate(async (id) => {
    await globalThis.window.projectD.updateSettings({ wallpaper: { currentStyle: "user", dynamicId: id, isDynamic: true } });
  }, wallpaperId);
  await page.locator(".wallpaper-bg-img.is-active").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(350);
}

async function capture(page, name) {
  const mode = await page.locator(".app-shell").getAttribute("data-experience-mode").catch(() => null);
  const stageVisible = await page.locator(".wallpaper-stage").isVisible().catch(() => false);
  const backdropVisible = await page.locator(".overlay-wallpaper-backdrop").isVisible().catch(() => false);
  const wallpaperVisible = stageVisible || backdropVisible;
  const statusBox = await optionalBox(page, ".ambient-status-capsule");
  const railBox = await optionalBox(page, ".ambient-edge-rail");
  const bandBox = await optionalBox(page, ".desktop-band");
  const filename = `${name}.png`;
  await page.screenshot({ path: path.join(output, filename), fullPage: true });
  return { name, filename, mode, wallpaperVisible, statusBox, railBox, bandBox };
}

async function optionalBox(page, selector) {
  const locator = page.locator(selector);
  if (await locator.count() === 0) return null;
  return locator.boundingBox({ timeout: 2_000 }).catch(() => null);
}

function waitForPort(targetPort, timeoutMs = 10_000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const socket = net.createConnection({ host: "127.0.0.1", port: targetPort });
      socket.once("connect", () => { socket.destroy(); resolve(); });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) reject(new Error("Vite preview did not start in time"));
        else setTimeout(probe, 200);
      });
    };
    probe();
  });
}

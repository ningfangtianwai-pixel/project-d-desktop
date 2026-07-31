const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const output = process.env.PROJECTD_QA_OUTPUT
  ? path.resolve(process.env.PROJECTD_QA_OUTPUT)
  : path.join(root, "artifacts", "qa", "user-reported-ui");
const rendererOutput = process.env.PROJECTD_QA_RENDERER
  ? path.resolve(process.env.PROJECTD_QA_RENDERER)
  : path.join(root, "dist", "renderer");
const port = 4191;
const edge = [
  path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
  path.join(process.env.PROGRAMFILES ?? "", "Microsoft", "Edge", "Application", "msedge.exe")
].find((candidate) => fs.existsSync(candidate));

if (!edge) throw new Error("Microsoft Edge is required for the user-reported UI regression check");
fs.mkdirSync(output, { recursive: true });

const vite = spawn(process.execPath, [
  path.join(root, "node_modules", "vite", "bin", "vite.js"),
  "preview",
  "--outDir",
  rendererOutput,
  "--host",
  "127.0.0.1",
  "--port",
  String(port)
], {
  cwd: root,
  windowsHide: true,
  stdio: "ignore"
});

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  vite.kill();
});

async function run() {
  await waitForPort(port);
  const browser = await chromium.launch({ headless: true, executablePath: edge });
  try {
    const page = await browser.newPage({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1 });
    await page.addInitScript(() => globalThis.localStorage.setItem("projectd:onboarding:v1", JSON.stringify({
      version: 1,
      currentStep: 5,
      status: "completed",
      updatedAt: new Date().toISOString()
    })));

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
    await page.locator(".app-shell").waitFor();
    const mainWallpaperVisible = await page.locator(".wallpaper-stage").isVisible();

    // V6.0 starts in Native and requires an explicit wake before task surfaces appear.
    await page.locator('.ambient-edge-rail button[title="进入沉浸空间"]').click();
    await page.locator('.ambient-edge-rail button[title="AI 助手"]').click();
    const chatInput = page.locator(".chat-input input");
    await chatInput.waitFor({ state: "visible" });
    for (let index = 0; index < 7; index += 1) {
      await chatInput.fill(`history-${index}`);
      await chatInput.press("Enter");
      await page.locator(".chat-history article").nth(index * 2 + 1).waitFor();
    }
    const chatMessageCount = await page.locator(".chat-history article").count();
    await chatInput.scrollIntoViewIfNeeded();
    const chatInputVisible = await chatInput.isVisible();
    await page.screenshot({ path: path.join(output, "main-chat-history.png"), fullPage: true });

    // OrganizerSurface replaces the retired OverlayPage.
    await page.locator('.ambient-edge-rail button[title="桌面整理"]').click();
    await page.locator(".organizer-surface").waitFor();
    const organizerSurfaceVisible = await page.locator(".organizer-surface").isVisible();
    await page.screenshot({ path: path.join(output, "organizer-surface.png"), fullPage: true });

    // SearchSurface replaces the old overlay search.
    await page.locator('.ambient-edge-rail button[title="搜索工作区"]').click();
    await page.locator(".search-surface").waitFor();
    const searchSurfaceVisible = await page.locator(".search-surface").isVisible();
    const workspaceSearch = page.locator(".workspace-search input");
    await workspaceSearch.fill("ProjectD");
    await workspaceSearch.press("Enter");
    await page.screenshot({ path: path.join(output, "search-surface.png"), fullPage: true });

    await page.evaluate(() => { globalThis.location.hash = "#/settings"; });
    await page.locator(".settings-app").waitFor();
    const navButtons = page.locator(".settings-sidebar nav button");
    await navButtons.nth(5).click();
    const wallpaperSearch = page.locator(".wallpaper-search input");
    await wallpaperSearch.fill("动漫");
    const wallpaperSearchResults = await page.locator(".wallpaper-thumb").count();
    const wallpaperApplyButtons = await page.locator(".wallpaper-apply-now").count();
    await page.waitForFunction(() => Array.from(globalThis.document.querySelectorAll(".wallpaper-thumb img"))
      .every((image) => image.complete && image.naturalWidth > 0), undefined, { timeout: 15_000 });
    const unloadedWallpaperImages = await page.locator(".wallpaper-thumb img").evaluateAll((images) =>
      images.filter((image) => !image.complete || image.naturalWidth === 0).length
    );
    await page.screenshot({ path: path.join(output, "settings-wallpaper-browser.png"), fullPage: true });

    await navButtons.nth(8).click();
    const aiStatus = page.locator(".settings-pane .inline-status span");
    await page.locator(".settings-pane .inline-status .secondary-command").click();
    await aiStatus.filter({ hasText: /本地降级通道可用/ }).waitFor();

    await navButtons.nth(7).click();
    const characterButtons = page.locator(".pet-character-grid button");
    const characterCount = await characterButtons.count();
    await characterButtons.nth(1).click();
    const personalityButtons = page.locator(".persona-grid button");
    await personalityButtons.nth(6).click();
    const personalityPreview = await page.locator(".personality-preview strong").textContent();
    await page.locator(".settings-commandbar .primary-command").click();
    await page.waitForFunction(() => Array.from(globalThis.document.querySelectorAll(".pet-character-grid img"))
      .every((image) => image.complete && image.naturalWidth > 0), undefined, { timeout: 15_000 });
    const unloadedCharacterImages = await page.locator(".pet-character-grid img").evaluateAll((images) =>
      images.filter((image) => !image.complete || image.naturalWidth === 0).length
    );
    await page.screenshot({ path: path.join(output, "settings-pets-personality.png"), fullPage: true });

    await page.evaluate(async () => {
      await globalThis.window.projectD.updateSettings({
        pet: { autoOutfit: false, currentOutfit: "winter" }
      });
    });
    await page.setViewportSize({ width: 300, height: 310 });
    await page.evaluate(() => { globalThis.location.hash = "#/pet"; });
    const petSprite = page.locator(".pet-sprite");
    await petSprite.waitFor();
    const petShell = page.locator(".pet-shell");
    await petShell.waitFor();
    const petCutoutLoaded = await petSprite.evaluate((image) =>
      image.classList.contains("pet-character-cutout")
      && image.complete
      && image.naturalWidth > 0
    );
    const petOutfit = await petShell.getAttribute("data-outfit");
    const outfitStickerCount = await page.locator(".pet-outfit-accessory").count();
    await page.screenshot({ path: path.join(output, "pet-cutout.png"), fullPage: true });

    const checks = {
      mainWallpaperVisible,
      chatMessageCount,
      chatInputVisible,
      organizerSurfaceVisible,
      searchSurfaceVisible,
      wallpaperSearchResults,
      wallpaperApplyButtons,
      unloadedWallpaperImages,
      characterCount,
      unloadedCharacterImages,
      personalityPreview,
      petCutoutLoaded,
      petOutfit,
      outfitStickerCount
    };
    const passed = mainWallpaperVisible
      && chatMessageCount === 14
      && chatInputVisible
      && organizerSurfaceVisible
      && searchSurfaceVisible
      && wallpaperSearchResults >= 2
      && wallpaperApplyButtons === wallpaperSearchResults
      && unloadedWallpaperImages === 0
      && characterCount === 5
      && unloadedCharacterImages === 0
      && Boolean(personalityPreview?.trim())
      && petCutoutLoaded
      && petOutfit === "default"
      && outfitStickerCount === 0;
    const report = { generatedAt: new Date().toISOString(), passed, checks };
    fs.writeFileSync(path.join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ...report, reportPath: path.join(output, "report.json") }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

function waitForPort(targetPort, timeoutMs = 10_000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const socket = net.createConnection({ host: "127.0.0.1", port: targetPort });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) reject(new Error("Vite preview did not start in time"));
        else setTimeout(probe, 200);
      });
    };
    probe();
  });
}

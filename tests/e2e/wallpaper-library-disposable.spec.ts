import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("wallpaper studio imports, exports, and deletes a disposable user asset", async () => {
  const fixturePath = path.join(os.tmpdir(), `projectd-qa-wallpaper-${Date.now()}.png`);
  const exportPath = path.join(os.tmpdir(), `projectd-qa-wallpaper-export-${Date.now()}.png`);
  await fs.copyFile(path.join(process.cwd(), "public", "wallpapers", "anime-lakeside-station.png"), fixturePath);
  const outputDir = path.join(process.cwd(), "artifacts-e2e-v6", "wallpaper-library-visual");
  await fs.mkdir(outputDir, { recursive: true });
  const testApp = await launchProjectD("wallpaper-library-disposable", {
    env: {
      PROJECTD_QA_WALLPAPER_IMPORT_PATH: fixturePath,
      PROJECTD_QA_WALLPAPER_EXPORT_PATH: exportPath
    }
  });

  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();
    await testApp.window.evaluate(() => { window.location.hash = "#/wallpaper"; });
    await expect(testApp.window.locator(".wallpaper-studio-page")).toBeVisible();

    await testApp.window.locator('button[title="导入图片壁纸"]').click();
    const importedCard = testApp.window.locator(".wallpaper-filmstrip-item").filter({ hasText: "projectd-qa-wallpaper" });
    await expect(importedCard).toBeVisible();
    await expect.poll(async () => testApp.window.locator(".wallpaper-canvas-media img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect.poll(async () => testApp.window.locator(".wallpaper-canvas-media img").evaluate((image) => (image as HTMLImageElement).naturalHeight)).toBeGreaterThan(0);
    const canvasImage = await testApp.window.locator(".wallpaper-canvas-media img").evaluate((image) => ({
      naturalWidth: (image as HTMLImageElement).naturalWidth,
      naturalHeight: (image as HTMLImageElement).naturalHeight
    }));
    expect(canvasImage.naturalWidth).toBeGreaterThan(0);
    expect(canvasImage.naturalHeight).toBeGreaterThan(0);
    await expect(testApp.window.locator(".wallpaper-studio-toast")).toContainText("已加入壁纸库");
    await testApp.window.screenshot({ path: path.join(outputDir, "01-imported.png"), fullPage: true });

    await importedCard.click();
    await testApp.window.locator('button[title="导出原图"]').click();
    await expect(testApp.window.locator(".wallpaper-studio-toast")).toContainText("已导出");
    await expect.poll(async () => (await fs.stat(exportPath).catch(() => null))?.size ?? 0).toBeGreaterThan(0);

    testApp.window.once("dialog", (dialog) => dialog.accept());
    await testApp.window.locator('button[title="删除个人壁纸"]').click();
    await expect(testApp.window.locator(".wallpaper-studio-toast")).toContainText("已删除");
    await expect(importedCard).toHaveCount(0);
    await expect.poll(async () => (await fs.stat(exportPath).catch(() => null))?.size ?? 0).toBeGreaterThan(0);
    await testApp.window.screenshot({ path: path.join(outputDir, "02-deleted.png"), fullPage: true });
  } finally {
    await closeProjectD(testApp);
    await fs.rm(fixturePath, { force: true });
    await fs.rm(exportPath, { force: true });
  }
});

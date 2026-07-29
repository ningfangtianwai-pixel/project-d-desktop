import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

const coverPath = path.join(process.cwd(), "public", "wallpapers", "anime-lakeside-station.png");
const videoPath = path.join(process.cwd(), "assets", "wallpapers", "user", "cloud-light.mp4");

async function openWallpaperStudio(testApp: Awaited<ReturnType<typeof launchProjectD>>): Promise<void> {
  const onboardingSkip = testApp.window.locator(".onboarding-skip");
  if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();
  await testApp.window.evaluate(() => { window.location.hash = "#/wallpaper"; });
  await expect(testApp.window.locator(".wallpaper-studio-page")).toBeVisible();
}

test("wallpaper studio previews, range-reads, and commits a real Live Photo pair", async () => {
  const testApp = await launchProjectD("wallpaper-live-photo", {
    env: {
      PROJECTD_QA_LIVE_PHOTO_COVER_PATH: coverPath,
      PROJECTD_QA_LIVE_PHOTO_VIDEO_PATH: videoPath
    }
  });

  try {
    await openWallpaperStudio(testApp);
    await testApp.window.locator('button[title="导入 Live Photo"]').click();
    const dialog = testApp.window.locator(".live-photo-preview-dialog");
    await expect(dialog).toBeVisible();
    await expect(testApp.window.locator(".live-photo-preview-status.ready")).toBeVisible({ timeout: 20_000 });
    await expect(dialog.locator(".live-photo-preview-primary")).toBeEnabled();

    const rangeProbe = await testApp.window.locator(".live-photo-preview-media video").evaluate(async (element) => {
      const response = await fetch((element as HTMLVideoElement).src, { headers: { Range: "bytes=0-63" } });
      return {
        status: response.status,
        contentRange: response.headers.get("content-range"),
        bytes: (await response.arrayBuffer()).byteLength
      };
    });
    expect(rangeProbe.status).toBe(206);
    expect(rangeProbe.contentRange).toMatch(/^bytes 0-63\//);
    expect(rangeProbe.bytes).toBe(64);

    await testApp.window.screenshot({ path: path.join(process.cwd(), "artifacts-e2e-v6", "wallpaper-live-photo-visual", "01-preview-ready.png"), fullPage: true });
    await dialog.locator(".live-photo-preview-primary").click();
    await expect(dialog).toBeHidden();
    await expect(testApp.window.locator(".wallpaper-asset-badge")).toContainText("动态");
    await expect(testApp.window.locator(".wallpaper-asset-meta")).toContainText("Live Photo");
    await expect(testApp.window.locator(".wallpaper-studio-toast")).toContainText("Live Photo 已确认导入");
    await testApp.window.screenshot({ path: path.join(process.cwd(), "artifacts-e2e-v6", "wallpaper-live-photo-visual", "02-imported.png"), fullPage: true });
  } finally {
    await closeProjectD(testApp);
  }
});

test("wallpaper studio keeps the page usable when a Live Photo pair is missing", async () => {
  const missingCoverPath = path.join(process.cwd(), "artifacts-e2e-v6", "missing-live-photo-cover.png");
  const testApp = await launchProjectD("wallpaper-live-photo-failure", {
    env: {
      PROJECTD_QA_LIVE_PHOTO_COVER_PATH: missingCoverPath,
      PROJECTD_QA_LIVE_PHOTO_VIDEO_PATH: videoPath
    }
  });

  try {
    await openWallpaperStudio(testApp);
    await testApp.window.locator('button[title="导入 Live Photo"]').click();
    const toast = testApp.window.locator('.wallpaper-studio-toast[data-tone="error"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Live Photo 导入失败");
    await expect(testApp.window.locator(".live-photo-preview-dialog")).toHaveCount(0);
    await expect(testApp.window.locator(".wallpaper-studio-page")).toBeVisible();
  } finally {
    await closeProjectD(testApp);
    await fs.rm(missingCoverPath, { force: true });
  }
});

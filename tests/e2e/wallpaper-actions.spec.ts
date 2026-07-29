import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("wallpaper studio keeps apply feedback explicit", async () => {
  const outputDir = path.join(process.cwd(), "artifacts-e2e-v6", "wallpaper-feedback-visual");
  await fs.mkdir(outputDir, { recursive: true });
  const testApp = await launchProjectD("wallpaper-actions");

  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();

    await testApp.window.evaluate(() => {
      window.location.hash = "#/wallpaper";
    });
    await expect(testApp.window.locator(".wallpaper-studio-page")).toBeVisible();
    await expect(testApp.window.locator(".wallpaper-filmstrip-item").first()).toBeVisible();

    const applyButton = testApp.window.locator(".wallpaper-apply-primary");
    await expect(applyButton).toBeEnabled();
    await applyButton.click();

    const toast = testApp.window.locator(".wallpaper-studio-toast");
    await expect(toast).toHaveAttribute("data-tone", "success");
    await expect(toast).toContainText("已应用");
    await testApp.window.screenshot({ path: path.join(outputDir, "01-apply-success.png"), fullPage: true });
  } finally {
    await closeProjectD(testApp);
  }
});

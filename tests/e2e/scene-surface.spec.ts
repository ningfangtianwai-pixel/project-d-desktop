import { expect, test } from "@playwright/test";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("scene surface opens from the immersive rail and exposes saved-scene actions", async () => {
  const testApp = await launchProjectD("scene-surface");
  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) {
      await onboardingSkip.click();
    }
    await testApp.window.locator(".edge-rail-wake").click();
    await testApp.window.getByRole("button", { name: "场景与壁纸" }).click();
    await expect(testApp.window.locator(".scene-surface")).toBeVisible();
    await expect(testApp.window.locator(".scene-surface")).toContainText("让桌面进入一个状态");
    await expect(testApp.window.locator(".scene-live-profile")).toBeVisible();
    await expect(testApp.window.locator(".scene-profile-facts")).toContainText("壁纸宿主");
    await expect(testApp.window.getByRole("button", { name: "壁纸库" })).toBeVisible();
    await expect(testApp.window.locator(".scene-empty, .scene-list")).toHaveCount(1);
    await testApp.window.evaluate(async () => {
      await window.projectD.saveWorkspaceScene("V6 feedback scene");
    });
    await testApp.window.locator(".ambient-edge-rail > button").nth(0).click();
    await expect(testApp.window.locator(".search-surface")).toBeVisible();
    await testApp.window.locator(".ambient-edge-rail > button").nth(2).click();
    await expect(testApp.window.locator(".scene-list")).toBeVisible();
    await testApp.window.locator(".scene-card").first().locator(".scene-card-actions button").nth(1).click();
    await expect(testApp.window.locator(".scene-message")).toHaveAttribute("data-tone", "success");
  } finally {
    await closeProjectD(testApp);
  }
});

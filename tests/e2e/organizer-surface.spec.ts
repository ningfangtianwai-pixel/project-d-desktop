import { expect, test } from "@playwright/test";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("organizer surface keeps preview-first actions in one task workspace", async () => {
  const testApp = await launchProjectD("organizer-surface");
  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) {
      await onboardingSkip.click();
    }
    await testApp.window.locator(".edge-rail-wake").click();
    await testApp.window.getByRole("button", { name: "桌面整理" }).click();
    await expect(testApp.window.locator(".organizer-surface")).toBeVisible();
    await expect(testApp.window.locator(".organizer-command-panel")).toContainText("先预览，再改变桌面");
    await expect(testApp.window.locator(".legacy-control-grid")).toBeHidden();
    await expect(testApp.window.getByRole("button", { name: /生成收件箱方案/ })).toBeVisible();
  } finally {
    await closeProjectD(testApp);
  }
});

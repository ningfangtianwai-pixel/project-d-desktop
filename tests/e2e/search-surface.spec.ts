import { expect, test } from "@playwright/test";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("search task keeps scope and empty-result feedback visible", async () => {
  const testApp = await launchProjectD("search-surface");
  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();
    await testApp.window.locator(".edge-rail-wake").click();
    await testApp.window.getByRole("button", { name: "搜索工作区" }).click();
    await expect(testApp.window.locator(".search-surface")).toBeVisible();
    await expect(testApp.window.locator(".search-surface")).toContainText("不会扫描未授权目录");

    const input = testApp.window.locator(".search-surface input[type=search]");
    await input.fill("__projectd_query_that_should_not_match__");
    await input.press("Enter");
    await expect(testApp.window.locator(".workspace-search-status")).toContainText("没有找到匹配内容");
    await expect(testApp.window.locator(".search-empty")).toBeVisible();
    await expect(testApp.window.locator(".workspace-search-clear")).toBeVisible();
    await testApp.window.locator(".workspace-search-clear").click();
    await expect(input).toHaveValue("");
  } finally {
    await closeProjectD(testApp);
  }
});

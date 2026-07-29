import { expect, test } from "@playwright/test";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("assistant task keeps the chat UI usable with the local fallback", async () => {
  const testApp = await launchProjectD("assistant-surface");
  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();

    await testApp.window.evaluate(() => window.projectD.updateSettings({
      ai: { enabled: true, provider: "local-fallback", apiEndpoint: "", model: "" }
    }));
    await testApp.window.locator(".edge-rail-wake").click();
    await testApp.window.getByRole("button", { name: "AI 助手" }).click();
    await expect(testApp.window.locator(".assistant-surface")).toBeVisible();
    await expect(testApp.window.locator(".assistant-surface")).toContainText("无 Key 也可用");

    const input = testApp.window.locator(".assistant-surface .chat-input input");
    await input.fill("帮我看看今天的桌面");
    await input.press("Enter");
    await expect(input).toHaveValue("");
    const status = testApp.window.locator(".assistant-surface .chat-status");
    await expect(status).toHaveAttribute("data-tone", "success");
    await expect(status).toContainText("本地降级");
    await expect(testApp.window.locator(".assistant-surface .chat-input")).toHaveAttribute("aria-busy", "false");
  } finally {
    await closeProjectD(testApp);
  }
});

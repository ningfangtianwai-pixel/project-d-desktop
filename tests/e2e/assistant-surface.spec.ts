import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
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
    await expect(testApp.window.locator(".ambient-status-context")).toBeVisible();
    await expect(testApp.window.locator(".assistant-pet-portrait")).toBeVisible();
    await testApp.window.evaluate(() => window.projectD.updateSettings({
      pet: { isVisible: true, characterId: "luna-spring" }
    }));
    await expect(testApp.window.locator('.assistant-pet-portrait[data-visible="true"]')).toBeVisible();
    await expect(testApp.window.locator(".assistant-pet-art")).toHaveCSS("background-image", /url/);
    await expect(testApp.window.locator(".assistant-context-strip")).toBeVisible();
    await expect(testApp.window.locator(".assistant-context-chip")).toHaveCount(4);
    await expect(testApp.window.locator(".assistant-context-strip")).toContainText("本地降级");
    const evidenceDir = path.join(process.cwd(), "artifacts-e2e-v6", "assistant-context");
    await fs.mkdir(evidenceDir, { recursive: true });
    await testApp.window.screenshot({ path: path.join(evidenceDir, "01-assistant-context.png"), fullPage: true });
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

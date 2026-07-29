import { expect, test } from "@playwright/test";
import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("assistant shows a provider timeout while keeping the local reply available", async () => {
  const server = createServer(() => {
    // Keep the local request open; the QA-only timeout should abort it before this handler responds.
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("The QA provider server did not expose a port");

  const outputDir = path.join(process.cwd(), "artifacts-e2e-v6", "assistant-feedback-visual");
  await fs.mkdir(outputDir, { recursive: true });
  const testApp = await launchProjectD("assistant-provider-timeout", {
    env: {
      PROJECTD_QA_IDLE: "0",
      PROJECTD_QA_AI_TIMEOUT_MS: "100",
      PROJECTD_OPENAI_COMPATIBLE_API_KEY: "qa-only-invalid-key"
    }
  });

  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();

    await testApp.window.evaluate((apiEndpoint) => window.projectD.updateSettings({
      ai: { enabled: true, provider: "openai-compatible", apiEndpoint, model: "qa-timeout" }
    }), `http://127.0.0.1:${address.port}/v1/chat/completions`);
    await testApp.window.locator(".edge-rail-wake").click();
    await testApp.window.getByRole("button", { name: "AI 助手" }).click();
    await expect(testApp.window.locator(".assistant-surface")).toBeVisible();

    const input = testApp.window.locator(".assistant-surface .chat-input input");
    await input.fill("请回答一个本地降级测试");
    await input.press("Enter");

    const status = testApp.window.locator(".assistant-surface .chat-status");
    await expect(status).toHaveAttribute("data-tone", "error");
    await expect(status).toContainText("云端响应超时");
    await expect(status).toContainText("本地降级");
    await expect(input).toHaveValue("");
    await testApp.window.screenshot({ path: path.join(outputDir, "01-provider-timeout.png"), fullPage: true });
  } finally {
    await closeProjectD(testApp);
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

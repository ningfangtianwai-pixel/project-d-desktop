import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("pet click uses the saved personality voice and motion instead of the generic cheerful state", async () => {
  const testApp = await launchProjectD("pet-personality-feedback");
  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();
    await testApp.window.evaluate(async () => {
      const suggestion = await window.projectD.getLatestSuggestion();
      await window.projectD.setSuggestionsEnabled(false);
      if (suggestion) await window.projectD.dismissSuggestion(suggestion.id);
    });
    await testApp.window.evaluate(() => window.projectD.updateSettings({
      pet: {
        characterId: "lin-yuxi",
        personality: "cold",
        talkFrequency: "silent",
        actionInterval: 120,
        autoOutfit: true,
        currentOutfit: "default"
      }
    }));

    const petWindowPromise = testApp.app.waitForEvent("window");
    await testApp.window.evaluate(() => window.projectD.showPet());
    const petWindow = await petWindowPromise;
    await petWindow.waitForLoadState("domcontentloaded");
    await expect(petWindow.locator(".pet-shell")).toBeVisible();
    await petWindow.evaluate(() => window.projectD.setPetInteractive(true));
    await petWindow.locator(".pet-shell").evaluate((element) => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    await expect(petWindow.locator(".pet-shell")).toHaveAttribute("data-action", "idle");
    await expect(petWindow.locator(".pet-bubble")).toContainText(/桌面状态正常|没有需要处理的异常|优先级最高|已待命/);
    const outputDir = path.join(process.cwd(), "artifacts-e2e-v6", "pet-feedback-visual");
    await fs.mkdir(outputDir, { recursive: true });
    await petWindow.screenshot({ path: path.join(outputDir, "01-cold-personality-idle.png"), fullPage: true });
  } finally {
    await closeProjectD(testApp);
  }
});

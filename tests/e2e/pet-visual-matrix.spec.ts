import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

const CHARACTERS = ["luna-q", "luna-spring", "starlight", "floral-star", "lin-yuxi"] as const;

test("all bundled pet characters load a visible verified action asset", async () => {
  const testApp = await launchProjectD("pet-visual-matrix");
  const outputDir = path.join(process.cwd(), "artifacts-e2e-v6", "pet-visual-matrix");
  await fs.mkdir(outputDir, { recursive: true });

  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();
    await testApp.window.evaluate(async () => {
      const suggestion = await window.projectD.getLatestSuggestion();
      await window.projectD.setSuggestionsEnabled(false);
      if (suggestion) await window.projectD.dismissSuggestion(suggestion.id);
      await window.projectD.updateSettings({
        weather: { mode: "manual", manualWeather: "clear" },
        pet: { talkFrequency: "silent", actionInterval: 3600, autoOutfit: true, currentOutfit: "default" }
      });
    });

    const petWindowPromise = testApp.app.waitForEvent("window");
    await testApp.window.evaluate(() => window.projectD.showPet());
    const petWindow = await petWindowPromise;
    await petWindow.waitForLoadState("domcontentloaded");
    await expect(petWindow.locator(".pet-shell")).toBeVisible();
    await petWindow.evaluate(() => window.projectD.setPetInteractive(true));

    for (const characterId of CHARACTERS) {
      await testApp.window.evaluate((id) => window.projectD.updateSettings({ pet: { characterId: id } }), characterId);
      await expect.poll(async () => petWindow.locator(".pet-sprite").getAttribute("src")).toContain(`/pet/${characterId}/`);
      await expect.poll(async () => petWindow.locator(".pet-sprite").evaluate((image) => ({
        naturalWidth: (image as HTMLImageElement).naturalWidth,
        naturalHeight: (image as HTMLImageElement).naturalHeight,
        width: image.getBoundingClientRect().width,
        height: image.getBoundingClientRect().height,
        failed: image.classList.contains("pet-sprite-fallback")
      }))).toEqual(expect.objectContaining({ failed: false }));

      const bounds = await petWindow.locator(".pet-sprite").evaluate((image) => ({
        naturalWidth: (image as HTMLImageElement).naturalWidth,
        naturalHeight: (image as HTMLImageElement).naturalHeight,
        width: image.getBoundingClientRect().width,
        height: image.getBoundingClientRect().height
      }));
      expect(bounds.naturalWidth).toBeGreaterThan(0);
      expect(bounds.naturalHeight).toBeGreaterThan(0);
      expect(bounds.width).toBeGreaterThan(16);
      expect(bounds.height).toBeGreaterThan(16);
      await petWindow.screenshot({ path: path.join(outputDir, `${characterId}.png`), fullPage: true });
    }
  } finally {
    await closeProjectD(testApp);
  }
});

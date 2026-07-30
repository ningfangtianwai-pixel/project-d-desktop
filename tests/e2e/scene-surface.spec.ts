import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

async function openSceneSurface(testApp: Awaited<ReturnType<typeof launchProjectD>>): Promise<void> {
  await testApp.window.locator(".edge-rail-wake").click();
  await testApp.window.locator(".ambient-edge-rail > button").nth(2).click();
  await expect(testApp.window.locator(".scene-surface")).toBeVisible();
}

test("scene surface opens from the immersive rail and exposes saved-scene actions", async () => {
  const testApp = await launchProjectD("scene-surface");
  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) {
      await onboardingSkip.click();
    }
    await openSceneSurface(testApp);
    await expect(testApp.window.locator(".scene-live-profile")).toBeVisible();
    await expect(testApp.window.locator(".scene-profile-facts")).toContainText("Performance");
    await expect(testApp.window.locator(".scene-display-map")).toBeVisible();
    await expect(testApp.window.locator(".scene-display-card").first()).toContainText("Cover");
    const evidenceDir = path.join(process.cwd(), "artifacts-e2e-v6", "scene-display-map");
    await fs.mkdir(evidenceDir, { recursive: true });
    await testApp.window.screenshot({ path: path.join(evidenceDir, "01-scene-display-map.png"), fullPage: true });
    await expect(testApp.window.locator(".scene-current-actions button").nth(1)).toBeVisible();
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

test("applying a scene restores pet, weather, and performance state", async () => {
  const testApp = await launchProjectD("scene-state-restore");
  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();

    const sceneId = await testApp.window.evaluate(async () => {
      await window.projectD.updateSettings({
        weather: { mode: "manual", manualWeather: "rain", particleIntensity: 0.72 },
        pet: { isVisible: true, characterId: "luna-q", personality: "cheerful", currentOutfit: "raincoat" },
        appState: { performance_mode: "quality" }
      });
      const scene = await window.projectD.saveWorkspaceScene("V6 state restore");
      await window.projectD.updateSettings({
        weather: { mode: "manual", manualWeather: "clear", particleIntensity: 0.1 },
        pet: { isVisible: false, characterId: "starlight", personality: "quiet", currentOutfit: "default" },
        appState: { performance_mode: "batterySaver" }
      });
      return scene.id;
    });

    const restored = await testApp.window.evaluate(async (id) => {
      await window.projectD.applyWorkspaceScene(id);
      const settings = await window.projectD.getSettings();
      const runtime = await window.projectD.getRuntimeState();
      return {
        weather: settings.weather.manualWeather,
        intensity: settings.weather.particleIntensity,
        petVisible: settings.pet.isVisible,
        characterId: settings.pet.characterId,
        personality: settings.pet.personality,
        outfit: settings.pet.currentOutfit,
        performance: runtime.configuredMode
      };
    }, sceneId);

    expect(restored).toEqual({
      weather: "rain",
      intensity: 0.72,
      petVisible: true,
      characterId: "luna-q",
      personality: "cheerful",
      outfit: "raincoat",
      performance: "quality"
    });

    await openSceneSurface(testApp);
    await expect(testApp.window.locator(".scene-list")).toBeVisible();
    await expect(testApp.window.locator(".scene-card-state").first()).toContainText("Quality");
    await expect(testApp.window.locator(".scene-profile-facts")).toContainText("Luna Q");
  } finally {
    await closeProjectD(testApp);
  }
});

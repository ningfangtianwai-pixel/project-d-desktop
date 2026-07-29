import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

const modes = ["clear", "rain", "snow", "fog", "leaves", "light"] as const;

test("weather layers render each visual state and report renderer FPS", async () => {
  const testApp = await launchProjectD("weather-quality-matrix");
  const outputDir = path.join(process.cwd(), "artifacts-e2e-v6", "weather-quality-matrix");
  await fs.mkdir(outputDir, { recursive: true });

  try {
    await testApp.window.evaluate(() => {
      localStorage.setItem("projectd:onboarding:v1", JSON.stringify({ version: 1, currentStep: 5, status: "completed" }));
      window.location.reload();
    });
    await expect(testApp.window.locator(".app-shell")).toBeVisible();
    await expect(testApp.window.locator(".wallpaper-stage")).toBeVisible();
    await expect(testApp.window.locator(".real-weather-layer")).toBeVisible();
    const checks: Record<string, { weather: string | null; intensity: string | null; visibleLayers: string[]; textureCount: number; rainCount: number }> = {};

    for (const mode of modes) {
      await testApp.window.evaluate(async (nextMode) => {
        await window.projectD.updateSettings({
          weather: { mode: "manual", manualWeather: nextMode, particleIntensity: 0.85 }
        });
      }, mode);
      const layer = testApp.window.locator(".real-weather-layer");
      await expect.poll(async () => layer.getAttribute("data-weather")).toBe(mode);
      await expect.poll(async () => layer.getAttribute("data-intensity")).toBe("0.85");
      await testApp.window.waitForTimeout(750);
      const state = await layer.evaluate((element) => {
        const selectors = [".weather-fog", ".weather-leaves", ".weather-rain", ".weather-snow", ".weather-light", ".weather-grade"];
        return {
          weather: element.getAttribute("data-weather"),
          intensity: element.getAttribute("data-intensity"),
          visibleLayers: selectors.filter((selector) => Number.parseFloat(getComputedStyle(element.querySelector(selector)!).opacity) > 0),
          textureCount: element.querySelectorAll(".weather-texture").length,
          rainCount: element.querySelectorAll(".rain-streak").length
        };
      });
      checks[mode] = state;
      await testApp.window.screenshot({ path: path.join(outputDir, `${mode}.png`), fullPage: true });
    }

    expect(checks.clear.visibleLayers).toContain(".weather-grade");
    expect(checks.rain.visibleLayers).toContain(".weather-rain");
    expect(checks.rain.textureCount).toBe(2);
    expect(checks.rain.rainCount).toBe(96);
    expect(checks.snow.visibleLayers).toContain(".weather-snow");
    expect(checks.fog.visibleLayers).toContain(".weather-fog");
    expect(checks.leaves.visibleLayers).toContain(".weather-leaves");
    expect(checks.light.visibleLayers).toContain(".weather-light");

    await testApp.window.waitForTimeout(6_000);
    const metrics = await testApp.window.evaluate(() => window.projectD.getRuntimeMetrics());
    expect(metrics.rendererFpsSampleCount).toBeGreaterThan(0);
    expect(metrics.rendererFpsMedian).toBeGreaterThan(0);
  } finally {
    await closeProjectD(testApp);
  }
});

test("weather intensity zero disables particle opacity and Pixi particle budget", async () => {
  const testApp = await launchProjectD("weather-intensity-zero");
  try {
    await expect(testApp.window.locator(".real-weather-layer")).toBeVisible();
    await testApp.window.evaluate(async () => {
      await window.projectD.updateSettings({ weather: { mode: "manual", manualWeather: "rain", particleIntensity: 0 } });
    });
    const layer = testApp.window.locator(".real-weather-layer");
    await expect.poll(async () => layer.getAttribute("data-intensity")).toBe("0");
    await expect.poll(async () => layer.evaluate((element) => getComputedStyle(element.querySelector(".weather-rain")!).opacity)).toBe("0");
    await expect(testApp.window.locator(".wallpaper-stage")).toBeVisible();
  } finally {
    await closeProjectD(testApp);
  }
});

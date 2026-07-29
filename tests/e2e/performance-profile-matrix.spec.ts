import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

const profiles = ["quality", "balanced", "batterySaver"] as const;

test.setTimeout(120_000);

function percentile(values: number[], ratio: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
}

test("performance profiles propagate to weather rendering and local runtime evidence", async () => {
  const testApp = await launchProjectD("performance-profile-matrix", {
    env: { PROJECTD_QA_AUTO_QUIT_MS: "120000", PROJECTD_QA_DISABLE_GPU: "0" }
  });
  const outputPath = path.join(process.cwd(), "artifacts-e2e-v6", "performance-profile-matrix.json");

  try {
    await testApp.window.evaluate(() => {
      localStorage.setItem("projectd:onboarding:v1", JSON.stringify({ version: 1, currentStep: 5, status: "completed" }));
      window.location.reload();
    });
    await expect(testApp.window.locator(".wallpaper-stage")).toBeVisible();
    await testApp.window.evaluate(async () => {
      await window.projectD.updateSettings({ weather: { mode: "manual", manualWeather: "rain", particleIntensity: 0.85 } });
    });

    const evidence: Record<string, { configuredMode: string; effectiveProfile: string; cpuMedian: number; cpuP95: number; peakWorkingSetBytes: number; rendererFpsMedian: number; sampleCount: number }> = {};
    for (const profile of profiles) {
      await testApp.window.evaluate(async (nextProfile) => {
        await window.projectD.updateSettings({ appState: { performance_mode: nextProfile } });
      }, profile);
      await expect.poll(async () => (await testApp.window.evaluate(() => window.projectD.getRuntimeState())).effectiveProfile).toBe(profile);
      await expect.poll(async () => testApp.window.locator(".real-weather-layer").getAttribute("data-performance")).toBe(profile);
      await testApp.window.waitForTimeout(16_000);
      const metrics = await testApp.window.evaluate(() => window.projectD.getRuntimeMetrics());
      const samples = metrics.samples.filter((sample) => sample.profile === profile);
      expect(samples.length).toBeGreaterThan(0);
      expect(metrics.rendererFpsSampleCount).toBeGreaterThan(0);
      const profileCpu = samples.map((sample) => sample.cpuPercent);
      evidence[profile] = {
        configuredMode: (await testApp.window.evaluate(() => window.projectD.getRuntimeState())).configuredMode,
        effectiveProfile: (await testApp.window.evaluate(() => window.projectD.getRuntimeState())).effectiveProfile,
        cpuMedian: percentile(profileCpu, 0.5),
        cpuP95: percentile(profileCpu, 0.95),
        peakWorkingSetBytes: Math.max(...samples.map((sample) => sample.workingSetBytes)),
        rendererFpsMedian: metrics.rendererFpsMedian,
        sampleCount: samples.length
      };
    }

    await fs.writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), profiles: evidence }, null, 2)}\n`, "utf8");
    expect(Object.keys(evidence)).toEqual([...profiles]);
    for (const profile of profiles) {
      expect(evidence[profile].configuredMode).toBe(profile);
      expect(evidence[profile].effectiveProfile).toBe(profile);
      expect(evidence[profile].peakWorkingSetBytes).toBeGreaterThan(0);
      expect(evidence[profile].rendererFpsMedian).toBeGreaterThan(0);
    }
  } finally {
    await closeProjectD(testApp);
  }
});

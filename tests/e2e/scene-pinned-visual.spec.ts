import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("scene pinned-resource states stay readable from empty to overflow", async () => {
  const fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), "projectd-scene-visual-"));
  const fixturePaths = await Promise.all(Array.from({ length: 4 }, async (_, index) => {
    const fixturePath = path.join(fixtureDir, `ProjectD-Visual-${index + 1}.txt`);
    await fs.writeFile(fixturePath, `visual fixture ${index + 1}`, "utf8");
    return fixturePath;
  }));
  const outputDir = path.join(process.cwd(), "artifacts-e2e-v6", "scene-pinned-visual");
  await fs.mkdir(outputDir, { recursive: true });

  const testApp = await launchProjectD("scene-pinned-visual", {
    env: { PROJECTD_QA_SEARCH_FIXTURE_PATH: fixturePaths.join(";") }
  });

  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();
    const scene = await testApp.window.evaluate(() => window.projectD.saveWorkspaceScene("Pinned Visual States"));
    const results = await testApp.window.evaluate(() => window.projectD.searchWorkspace("in:everything ProjectD-Visual", 8));
    expect(results).toHaveLength(4);

    await openSceneSurface(testApp.window);
    await captureAndAssert(testApp.window, path.join(outputDir, "01-empty.png"), 0);

    await testApp.window.evaluate(async ({ resultId, sceneId }) => {
      await window.projectD.pinSearchResultToScene(resultId, sceneId);
    }, { resultId: results[0].id, sceneId: scene.id });
    await openSceneSurface(testApp.window);
    await captureAndAssert(testApp.window, path.join(outputDir, "02-one-resource.png"), 1);

    await testApp.window.evaluate(async ({ resultIds, sceneId }) => {
      for (const resultId of resultIds) await window.projectD.pinSearchResultToScene(resultId, sceneId);
    }, { resultIds: results.slice(1).map((result) => result.id), sceneId: scene.id });
    await openSceneSurface(testApp.window);
    await captureAndAssert(testApp.window, path.join(outputDir, "03-overflow.png"), 3);
    await expect(testApp.window.locator(".scene-pinned-more")).toHaveText("+1");
  } finally {
    await closeProjectD(testApp);
    await fs.rm(fixtureDir, { recursive: true, force: true });
  }
});

async function openSceneSurface(window: import("@playwright/test").Page): Promise<void> {
  const rail = window.locator(".ambient-edge-rail > button");
  if (await window.locator(".edge-rail-wake").isVisible().catch(() => false)) await window.locator(".edge-rail-wake").click();
  await rail.nth(0).click();
  await expect(window.locator(".search-surface")).toBeVisible();
  await rail.nth(2).click();
  await expect(window.locator(".scene-surface")).toBeVisible();
}

async function captureAndAssert(window: import("@playwright/test").Page, outputPath: string, expectedResources: number): Promise<void> {
  await expect(window.locator(".scene-card")).toHaveCount(1);
  await expect(window.locator(".scene-pinned-resource")).toHaveCount(Math.min(expectedResources, 3));
  await expect.poll(() => window.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const cardBox = await window.locator(".scene-card").boundingBox();
  expect(cardBox).not.toBeNull();
  for (const chip of await window.locator(".scene-pinned-resource").all()) {
    const chipBox = await chip.boundingBox();
    expect(chipBox).not.toBeNull();
    expect((chipBox?.x ?? 0) + (chipBox?.width ?? 0)).toBeLessThanOrEqual((cardBox?.x ?? 0) + (cardBox?.width ?? 0) + 1);
  }
  await window.screenshot({ path: outputPath, fullPage: true });
}

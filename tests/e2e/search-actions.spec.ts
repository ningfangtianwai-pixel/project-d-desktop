import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("search result actions can copy, pin to a scene, and authorize a read-only portal", async () => {
  const fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), "projectd-search-fixture-"));
  const fixturePath = path.join(fixtureDir, "ProjectD-QA-Fixture.txt");
  const outputDir = path.join(process.cwd(), "artifacts-e2e-v6", "search-feedback-visual");
  await fs.writeFile(fixturePath, "Project D controlled search fixture", "utf8");
  await fs.mkdir(outputDir, { recursive: true });

  const testApp = await launchProjectD("search-actions", {
    env: {
      PROJECTD_QA_SEARCH_FIXTURE_PATH: fixturePath,
      PROJECTD_QA_AUTO_AUTHORIZE_PORTAL: "1"
    }
  });

  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();

    await testApp.window.evaluate(() => window.projectD.saveWorkspaceScene("Search Fixture Scene"));
    await testApp.window.locator(".edge-rail-wake").click();
    await testApp.window.locator(".ambient-edge-rail > button").first().click();

    const search = testApp.window.locator(".search-surface");
    const input = search.locator("input[type=search]");
    await input.fill("in:everything ProjectD-QA-Fixture");
    await input.press("Enter");

    const result = search.locator(".workspace-search-result").first();
    await expect(result).toBeVisible();
    const actions = result.locator(".search-result-actions button");

    await actions.nth(1).click();
    await expect(search.locator(".workspace-search-status")).not.toHaveText("");
    await expect(result.locator(".search-result-feedback")).toHaveAttribute("data-tone", "success");
    await testApp.window.screenshot({ path: path.join(outputDir, "01-copy-feedback.png"), fullPage: true });

    await actions.nth(3).click();
    const scenePicker = result.locator(".search-scene-picker");
    await expect(scenePicker).toBeVisible();
    await scenePicker.locator("button").first().click();
    await expect(search.locator(".workspace-search-status")).not.toHaveText("");
    await expect(result.locator(".search-result-feedback")).toHaveAttribute("data-tone", "success");
    await testApp.window.screenshot({ path: path.join(outputDir, "02-scene-feedback.png"), fullPage: true });
    await expect.poll(async () => testApp.window.evaluate(async () => {
      const scenes = await window.projectD.getWorkspaceScenes();
      return scenes.at(-1)?.pinnedResources?.length ?? 0;
    })).toBe(1);

    await testApp.window.locator(".ambient-edge-rail > button").nth(2).click();
    await expect(testApp.window.locator(".scene-surface")).toBeVisible();
    await expect(testApp.window.locator(".scene-pinned-resources")).toContainText("ProjectD-QA-Fixture.txt");

    await testApp.window.locator(".ambient-edge-rail > button").first().click();
    await expect(search).toBeVisible();
    const refreshedResult = search.locator(".workspace-search-result").first();
    const refreshedActions = refreshedResult.locator(".search-result-actions button");
    await refreshedActions.nth(2).click();
    await expect(search.locator(".workspace-search-status")).not.toHaveText("");
    await expect(refreshedResult.locator(".search-result-feedback")).toHaveAttribute("data-tone", "success");
    await testApp.window.screenshot({ path: path.join(outputDir, "03-portal-feedback.png"), fullPage: true });
    await expect.poll(async () => testApp.window.evaluate(async () => (await window.projectD.getFolderPortals()).length)).toBeGreaterThan(0);
  } finally {
    await closeProjectD(testApp);
    await fs.rm(fixtureDir, { recursive: true, force: true });
  }
});

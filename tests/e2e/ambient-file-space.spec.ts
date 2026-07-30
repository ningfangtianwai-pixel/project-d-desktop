import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("immersive space exposes restrained native-like desktop files", async () => {
  const desktopPath = await fs.mkdtemp(path.join(os.tmpdir(), "projectd-ambient-files-"));
  const outputDir = path.join(process.cwd(), "artifacts-e2e-v6", "ambient-file-space-visual");
  await fs.mkdir(path.join(desktopPath, "Projects"), { recursive: true });
  await fs.writeFile(path.join(desktopPath, "Today.txt"), "Project D ambient fixture", "utf8");
  await fs.writeFile(path.join(desktopPath, "Notes.md"), "A quiet desktop", "utf8");
  await fs.writeFile(path.join(desktopPath, "Projects", "Roadmap.txt"), "V6", "utf8");
  await fs.mkdir(outputDir, { recursive: true });

  const testApp = await launchProjectD("ambient-file-space", {
    env: { PROJECTD_QA_DESKTOP_PATH: desktopPath }
  });

  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();

    await testApp.window.locator(".edge-rail-wake").click();
    const fileSpace = testApp.window.locator(".ambient-file-space");
    await expect(fileSpace).toBeVisible();
    await expect(fileSpace.locator(".ambient-file-group").first()).toBeVisible();
    await expect(fileSpace.locator(".desktop-folder-art")).toHaveCount(1);
    await expect(fileSpace.locator(".ambient-file-icon").first()).toHaveAttribute("title", /Today|Notes|Projects/);
    await testApp.window.screenshot({ path: path.join(outputDir, "01-immersive-files.png"), fullPage: true });

    await fileSpace.locator(".ambient-file-space-header button").click();
    await expect(testApp.window.locator(".organizer-surface")).toBeVisible();
    await expect(testApp.window.locator(".ambient-file-space")).toHaveCount(0);
    await testApp.window.screenshot({ path: path.join(outputDir, "02-organizer-entry.png"), fullPage: true });
  } finally {
    await closeProjectD(testApp);
    await fs.rm(desktopPath, { recursive: true, force: true });
  }
});

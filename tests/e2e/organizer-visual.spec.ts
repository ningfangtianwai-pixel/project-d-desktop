import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("organizer state strip stays legible through the reversible lifecycle", async () => {
  const desktopPath = await fs.mkdtemp(path.join(os.tmpdir(), "projectd-organizer-visual-"));
  const inboxDocuments = path.join(desktopPath, "Project D \u6536\u7eb3", "\u6587\u6863");
  const movablePath = path.join(desktopPath, "move-me.txt");
  const conflictPath = path.join(desktopPath, "keep-me.txt");
  const conflictTarget = path.join(inboxDocuments, "keep-me.txt");
  const outputDir = path.join(process.cwd(), "artifacts-e2e-v6", "organizer-state-visual");
  await fs.mkdir(inboxDocuments, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(movablePath, "visual fixture", "utf8");
  await fs.writeFile(conflictPath, "source remains", "utf8");
  await fs.writeFile(conflictTarget, "existing target", "utf8");

  const testApp = await launchProjectD("organizer-visual", {
    env: { PROJECTD_QA_DESKTOP_PATH: desktopPath }
  });

  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();
    await testApp.window.locator(".edge-rail-wake").click();
    await testApp.window.locator(".ambient-edge-rail > button").nth(1).click();

    const organizer = testApp.window.locator(".organizer-surface");
    await expect(organizer).toBeVisible();
    await expect(organizer.locator(".organizer-state-strip")).toHaveAttribute("data-state", "idle");
    await testApp.window.screenshot({ path: path.join(outputDir, "01-idle.png"), fullPage: true });

    await organizer.locator("button.action-button.inbox").click();
    await expect(organizer.locator(".organizer-state-strip")).toHaveAttribute("data-state", "review");
    await expect(organizer.locator(".organizer-state-metrics")).toContainText("1");
    await expect(organizer.locator(".organizer-state-metrics")).toContainText("冲突");
    await testApp.window.screenshot({ path: path.join(outputDir, "02-review.png"), fullPage: true });

    testApp.window.once("dialog", (dialog) => void dialog.accept());
    await organizer.locator(".inbox-execute").click();
    await expect.poll(async () => fs.access(path.join(inboxDocuments, "move-me.txt")).then(() => true).catch(() => false)).toBe(true);
    await expect(organizer.locator(".organizer-state-strip")).toHaveAttribute("data-state", "undoable");
    await testApp.window.screenshot({ path: path.join(outputDir, "03-undoable.png"), fullPage: true });

    await organizer.locator(".inbox-undo").click();
    await expect.poll(async () => fs.access(movablePath).then(() => true).catch(() => false)).toBe(true);
    await expect(organizer.locator(".organizer-state-strip")).toHaveAttribute("data-state", "idle");
    await testApp.window.screenshot({ path: path.join(outputDir, "04-restored.png"), fullPage: true });
    await expect(fs.access(conflictPath)).resolves.toBeUndefined();
    await expect(fs.access(conflictTarget)).resolves.toBeUndefined();
  } finally {
    await closeProjectD(testApp);
    await fs.rm(desktopPath, { recursive: true, force: true });
  }
});

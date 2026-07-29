import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("organizer previews conflicts and keeps execute/undo reversible", async () => {
  const desktopPath = await fs.mkdtemp(path.join(os.tmpdir(), "projectd-organizer-fixture-"));
  const inboxDocuments = path.join(desktopPath, "Project D 收纳", "文档");
  const movablePath = path.join(desktopPath, "move-me.txt");
  const conflictPath = path.join(desktopPath, "keep-me.txt");
  const conflictTarget = path.join(inboxDocuments, "keep-me.txt");
  const movableTarget = path.join(inboxDocuments, "move-me.txt");
  await fs.mkdir(inboxDocuments, { recursive: true });
  await fs.writeFile(movablePath, "reversible fixture", "utf8");
  await fs.writeFile(conflictPath, "source remains", "utf8");
  await fs.writeFile(conflictTarget, "existing target", "utf8");

  const testApp = await launchProjectD("organizer-actions", {
    env: { PROJECTD_QA_DESKTOP_PATH: desktopPath }
  });

  try {
    const onboardingSkip = testApp.window.locator(".onboarding-skip");
    if (await onboardingSkip.isVisible().catch(() => false)) await onboardingSkip.click();
    await testApp.window.locator(".edge-rail-wake").click();
    await testApp.window.locator(".ambient-edge-rail > button").nth(1).click();

    const organizer = testApp.window.locator(".organizer-surface");
    await expect(organizer).toBeVisible();
    await organizer.locator("button.action-button.inbox").click();
    await expect(organizer.locator(".inbox-review li")).toHaveCount(2);
    await expect(organizer.locator(".inbox-review li.conflict")).toHaveCount(1);
    await expect(organizer.locator(".organizer-state-strip")).toHaveAttribute("data-state", "review");

    await organizer.locator(".inbox-cancel").click();
    await expect(organizer.locator(".inbox-execute")).toHaveCount(0);

    await organizer.locator("button.action-button.inbox").click();
    await expect(organizer.locator(".inbox-execute")).toBeVisible();
    testApp.window.once("dialog", (dialog) => void dialog.accept());
    await organizer.locator(".inbox-execute").click();
    await expect.poll(async () => fs.access(movableTarget).then(() => true).catch(() => false)).toBe(true);
    await expect.poll(async () => fs.access(movablePath).then(() => true).catch(() => false)).toBe(false);
    await expect(organizer.locator(".inbox-undo")).toBeVisible();
    await expect(organizer.locator(".organizer-state-strip")).toHaveAttribute("data-state", "undoable");

    await organizer.locator(".inbox-undo").click();
    await expect.poll(async () => fs.access(movablePath).then(() => true).catch(() => false)).toBe(true);
    await expect.poll(async () => fs.access(movableTarget).then(() => true).catch(() => false)).toBe(false);
    await expect(fs.access(conflictPath)).resolves.toBeUndefined();
    await expect(fs.access(conflictTarget)).resolves.toBeUndefined();
    await expect(organizer.locator(".inbox-undo")).toHaveCount(0);
    await expect(organizer.locator(".organizer-state-strip")).toHaveAttribute("data-state", "idle");
  } finally {
    await closeProjectD(testApp);
    await fs.rm(desktopPath, { recursive: true, force: true });
  }
});

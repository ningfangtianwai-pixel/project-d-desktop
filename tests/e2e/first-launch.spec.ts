import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { assertDesktopRemainsUntouched, assertVisualHealth, closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("first launch creates an isolated profile and renders onboarding", async () => {
  const testApp = await launchProjectD("first-launch");
  try {
    await expect(testApp.window.locator(".onboarding-dialog")).toBeVisible();
    await assertVisualHealth(testApp.app, testApp.window);
    await assertDesktopRemainsUntouched(testApp.window);
    await expect.poll(async () => fs.stat(path.join(testApp.userDataDir, "database.sqlite")).then(() => true).catch(() => false)).toBe(true);
  } finally {
    await closeProjectD(testApp);
  }
});

import { expect, test } from "@playwright/test";
import { assertDesktopRemainsUntouched, assertDuplicateLaunchRejected, closeProjectD, launchProjectD, waitForLog } from "./helpers/electron-test-app";

test("a duplicate launch exits while the existing instance remains usable", async () => {
  const testApp = await launchProjectD("duplicate-launch");
  try {
    await assertDuplicateLaunchRejected(testApp);
    const log = await waitForLog(testApp.userDataDir, "bootstrap.log", "second instance detected");
    expect(log).toContain('"locked":false');
    expect(await testApp.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((window) => !window.isDestroyed()).length)).toBe(1);
    await expect(testApp.window.locator(".app-shell")).toBeVisible();
    await assertDesktopRemainsUntouched(testApp.window);
  } finally {
    await closeProjectD(testApp);
  }
});

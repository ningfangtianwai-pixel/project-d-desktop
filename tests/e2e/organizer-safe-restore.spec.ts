import { expect, test } from "@playwright/test";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

const { setWindowsDesktopIconsVisible } = require("../../dist/main/windows-desktop-icons.js");

test("organizer safety restore works from the shell and restores Explorer icons", async () => {
  test.setTimeout(90_000);
  const testApp = await launchProjectD("organizer-safe-restore", {
    env: { PROJECTD_QA_IDLE: "0" }
  });

  try {
    await testApp.window.evaluate(() => window.projectD.activateDesktop());
    await expect(testApp.window.locator(".organizer-surface")).toBeVisible();

    await testApp.window.locator('button[title="安全归位"]').click({ noWaitAfter: true }).catch((error: unknown) => {
      if (!String(error).includes("closed")) throw error;
    });
    await expect(testApp.window.locator(".app-shell")).toBeVisible();
    await expect.poll(async () => testApp.window.evaluate(() => window.projectD.getDesktopStatus()), {
      timeout: 15_000
    }).toMatchObject({ mode: "idle" });
  } finally {
    await setWindowsDesktopIconsVisible(true).catch(() => undefined);
    await closeProjectD(testApp);
  }
});

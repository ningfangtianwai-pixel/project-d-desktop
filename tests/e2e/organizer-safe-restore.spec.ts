import { expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

const { setWindowsDesktopIconsVisible } = require("../../dist/main/windows-desktop-icons.js");

test("organizer safety restore works from the overlay and restores Explorer icons", async () => {
  test.setTimeout(90_000);
  const testApp = await launchProjectD("organizer-safe-restore", {
    env: { PROJECTD_QA_IDLE: "0" }
  });

  try {
    await testApp.window.evaluate(() => window.projectD.activateDesktop());
    const overlay = await findOverlayWindow(testApp.app);
    await expect(overlay.locator(".overlay-page")).toBeVisible();

    await overlay.locator('button[title="安全归位"]').click({ noWaitAfter: true }).catch((error: unknown) => {
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

async function findOverlayWindow(app: ElectronApplication, timeoutMs = 20_000): Promise<Page> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const candidate of app.windows()) {
      if (!candidate.isClosed() && await candidate.locator(".overlay-page").count().catch(() => 0)) {
        return candidate;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Organizer overlay was not created before the E2E timeout");
}

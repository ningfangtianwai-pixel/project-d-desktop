import { expect, test } from "@playwright/test";
import { closeProjectD, launchProjectD, waitForLog } from "./helpers/electron-test-app";

const { probeWindowsDesktopIcons, setWindowsDesktopIconsVisible } = require("../../dist/main/windows-desktop-icons.js");
const { probeWindowsTaskbar, setWindowsTaskbarVisible } = require("../../dist/main/windows-taskbar.js");

test("clean desktop hides shell chrome, keeps the display awake, and restores system state", async () => {
  test.setTimeout(90_000);
  const testApp = await launchProjectD("clean-desktop-system-state", {
    env: {
      PROJECTD_QA_IDLE: "0",
      PROJECTD_QA_AUTO_QUIT_MS: "180000"
    }
  });

  try {
    const entered = await testApp.window.evaluate(() => window.projectD.enterCleanDesktop());
    expect(entered.mode).toBe("active");

    await expect.poll(async () => (await probeWindowsDesktopIcons()).visible, { timeout: 15_000 }).toBe(false);
    await expect.poll(async () => (await probeWindowsTaskbar()).visible, { timeout: 15_000 }).toBe(false);
    await waitForLog(testApp.userDataDir, "desktop-state.log", "clean desktop display sleep blocker started");

    const exited = await testApp.window.evaluate(() => window.projectD.exitCleanDesktop());
    expect(exited.mode).toBe("idle");
    await expect.poll(async () => (await probeWindowsDesktopIcons()).visible, { timeout: 15_000 }).toBe(true);
    await expect.poll(async () => (await probeWindowsTaskbar()).visible, { timeout: 15_000 }).toBe(true);
    await waitForLog(testApp.userDataDir, "desktop-state.log", "clean desktop display sleep blocker stopped");
  } finally {
    await setWindowsTaskbarVisible(true).catch(() => undefined);
    await setWindowsDesktopIconsVisible(true).catch(() => undefined);
    await closeProjectD(testApp);
  }
});

import { expect, test } from "@playwright/test";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

const { probeWindowsDesktopIcons, setWindowsDesktopIconsVisible } = require("../../dist/main/windows-desktop-icons.js");

test("idle Project D repairs an externally hidden native desktop", async () => {
  test.setTimeout(45_000);
  const testApp = await launchProjectD("desktop-icons-guard", {
    env: { PROJECTD_QA_IDLE: "1" }
  });

  try {
    await setWindowsDesktopIconsVisible(false);
    await expect.poll(async () => (await probeWindowsDesktopIcons()).visible, { timeout: 12_000 }).toBe(true);
  } finally {
    await setWindowsDesktopIconsVisible(true).catch(() => undefined);
    await closeProjectD(testApp);
  }
});

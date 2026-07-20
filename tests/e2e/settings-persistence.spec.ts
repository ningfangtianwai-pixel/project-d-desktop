import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import { assertDesktopRemainsUntouched, closeProjectD, createIsolatedUserData, launchProjectD } from "./helpers/electron-test-app";

test("settings survive a clean application restart", async () => {
  const userDataDir = await createIsolatedUserData("settings-persistence");
  let testApp = await launchProjectD("settings-save", { userDataDir });
  try {
    const saved = await testApp.window.evaluate(() => window.projectD.updateSettings({
      pet: { personality: "cool", scale: 1.15, talkFrequency: "rare" }
    }));
    expect(saved.pet).toMatchObject({ personality: "cool", scale: 1.15, talkFrequency: "rare" });
    await closeProjectD(testApp, false);

    testApp = await launchProjectD("settings-restart", { userDataDir });
    const restored = await testApp.window.evaluate(() => window.projectD.getSettings());
    expect(restored.pet).toMatchObject({ personality: "cool", scale: 1.15, talkFrequency: "rare" });
    await assertDesktopRemainsUntouched(testApp.window);
  } finally {
    await closeProjectD(testApp).catch(() => fs.rm(userDataDir, { recursive: true, force: true }));
  }
});

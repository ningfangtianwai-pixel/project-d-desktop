import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import { assertDesktopRemainsUntouched, assertVisualHealth, closeProjectD, createIsolatedUserData, forceKillProjectD, launchProjectD } from "./helpers/electron-test-app";

test("settings and database recover after a forced process termination", async () => {
  const userDataDir = await createIsolatedUserData("force-kill-recovery");
  let testApp = await launchProjectD("force-kill", { userDataDir });
  try {
    await testApp.window.evaluate(() => window.projectD.updateSettings({
      pet: { personality: "brave", talkFrequency: "chatty" }
    }));
    await forceKillProjectD(testApp);

    testApp = await launchProjectD("force-kill-restart", { userDataDir });
    const restored = await testApp.window.evaluate(() => window.projectD.getSettings());
    expect(restored.pet).toMatchObject({ personality: "brave", talkFrequency: "chatty" });
    await assertVisualHealth(testApp.app, testApp.window);
    await assertDesktopRemainsUntouched(testApp.window);
  } finally {
    await closeProjectD(testApp).catch(() => fs.rm(userDataDir, { recursive: true, force: true }));
  }
});

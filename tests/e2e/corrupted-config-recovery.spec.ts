import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { assertDesktopRemainsUntouched, assertVisualHealth, closeProjectD, createIsolatedUserData, launchProjectD } from "./helpers/electron-test-app";

test("malformed persisted configuration does not prevent the next launch", async () => {
  const userDataDir = await createIsolatedUserData("corrupt-config-recovery");
  let testApp = await launchProjectD("config-seed", { userDataDir });
  try {
    await testApp.window.evaluate(() => window.projectD.setState("boot_recovery_notice", "{not-valid-json"));
    await closeProjectD(testApp, false);
    await fs.writeFile(path.join(userDataDir, "Preferences"), "{not-valid-json", "utf8");

    testApp = await launchProjectD("config-recovery", { userDataDir });
    expect(await testApp.window.evaluate(() => window.projectD.getState("boot_recovery_notice"))).toBe("{not-valid-json");
    await expect(testApp.window.locator("body")).toContainText("{not-valid-json");
    await assertVisualHealth(testApp.app, testApp.window);
    await assertDesktopRemainsUntouched(testApp.window);
  } finally {
    await closeProjectD(testApp).catch(() => fs.rm(userDataDir, { recursive: true, force: true }));
  }
});

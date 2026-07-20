import { expect, test } from "@playwright/test";
import path from "node:path";
import { assertDesktopRemainsUntouched, closeProjectD, launchProjectD, waitForLog } from "./helpers/electron-test-app";

test("the tray quit command performs the guarded shutdown", async () => {
  const entry = path.join(process.cwd(), "tests", "e2e", "helpers", "tray-main-shim.cjs");
  const testApp = await launchProjectD("tray-exit", { entry });
  try {
    await assertDesktopRemainsUntouched(testApp.window);
    const closeEvent = testApp.app.waitForEvent("close");
    const invoked = await testApp.app.evaluate(() => {
      const invoke = (globalThis as typeof globalThis & { __PROJECTD_E2E_INVOKE_TRAY_QUIT__?: () => void })
        .__PROJECTD_E2E_INVOKE_TRAY_QUIT__;
      if (!invoke) return false;
      invoke();
      return true;
    });
    expect(invoked).toBe(true);
    await closeEvent;
    const log = await waitForLog(testApp.userDataDir, "bootstrap.log", "shutdown completed");
    expect(log).toContain("shutdown completed");
  } finally {
    await closeProjectD(testApp);
  }
});

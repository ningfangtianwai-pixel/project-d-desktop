import { expect, test } from "@playwright/test";
import { assertRecoveredMainWindow, closeProjectD, launchProjectD, waitForLog } from "./helpers/electron-test-app";

test("a crashed main renderer recovers without leaving a white screen", async () => {
  const testApp = await launchProjectD("renderer-recovery", {
    env: { PROJECTD_QA_CRASH_RENDERER: "main" },
    waitForHealthy: false
  });
  try {
    await waitForLog(testApp.userDataDir, "bootstrap.log", "QA renderer crash injected");
    await waitForLog(testApp.userDataDir, "app.log", '"status":"recovered"');
    await waitForLog(testApp.userDataDir, "app.log", '"status":"healthy"');
    await assertRecoveredMainWindow(testApp.app);
    expect(await testApp.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  } finally {
    await closeProjectD(testApp);
  }
});

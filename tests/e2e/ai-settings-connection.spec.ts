import { expect, test } from "@playwright/test";
import { closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("settings window can test the saved AI configuration without adding chat history", async () => {
  const testApp = await launchProjectD("ai-settings-connection");
  try {
    const settingsWindowPromise = testApp.app.waitForEvent("window");
    await testApp.window.evaluate(() => window.projectD.openSettings());
    const settingsWindow = await settingsWindowPromise;
    await settingsWindow.waitForLoadState("domcontentloaded");

    await settingsWindow.evaluate(() => window.projectD.updateSettings({
      ai: {
        enabled: true,
        provider: "local-fallback",
        apiEndpoint: "",
        model: ""
      }
    }));
    const before = await testApp.window.evaluate(() => window.projectD.getChatHistory());
    const result = await settingsWindow.evaluate(() => window.projectD.testAiConnection());
    const after = await testApp.window.evaluate(() => window.projectD.getChatHistory());

    expect(result).toEqual({
      provider: "local-fallback",
      mode: "local",
      message: "本地降级通道可用"
    });
    expect(after).toEqual(before);
  } finally {
    await closeProjectD(testApp);
  }
});

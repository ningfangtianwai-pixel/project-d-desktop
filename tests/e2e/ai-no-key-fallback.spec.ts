import { expect, test } from "@playwright/test";
import { assertDesktopRemainsUntouched, closeProjectD, launchProjectD } from "./helpers/electron-test-app";

test("AI falls back locally when an enabled provider has no API key", async () => {
  const testApp = await launchProjectD("ai-no-key");
  try {
    await testApp.window.evaluate(() => window.projectD.updateSettings({
        weather: { mode: "manual", manualWeather: "clear" },
        ai: {
          enabled: true,
          provider: "deepseek",
          apiEndpoint: "https://api.deepseek.com/chat/completions",
          model: "deepseek-chat",
          apiKey: null
        }
      }));
    const settingsWindowPromise = testApp.app.waitForEvent("window");
    await testApp.window.evaluate(() => window.projectD.openSettings());
    const settingsWindow = await settingsWindowPromise;
    await settingsWindow.waitForLoadState("domcontentloaded");
    await settingsWindow.evaluate(() => window.projectD.setPrivacyNetworkPaused(false));
    const response = await testApp.window.evaluate(() => window.projectD.sendChatMessage("hello from offline e2e"));
    expect(response.provider).toBe("deepseek");
    expect(response.fallback).toBe(true);
    expect(response.message.content.length).toBeGreaterThan(0);
    await settingsWindow.evaluate(() => window.projectD.setPrivacyNetworkPaused(true));
    await assertDesktopRemainsUntouched(testApp.window);
  } finally {
    await closeProjectD(testApp);
  }
});

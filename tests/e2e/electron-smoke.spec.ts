import { _electron as electron, expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("isolated Electron shell renders and exposes the secure preload API", async () => {
  const root = process.cwd();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "projectd-e2e-"));
  const qaToken = `--projectd-qa-run=e2e-${Date.now()}`;
  const app = await electron.launch({
    args: [root, qaToken],
    cwd: root,
    env: {
      ...process.env,
      PROJECTD_QA_USER_DATA_DIR: userDataDir,
      PROJECTD_QA_IDLE: "1",
      PROJECTD_DEMO_AUTORUN: "0",
      PROJECTD_QA_AUTO_QUIT_MS: "40000"
    }
  });

  try {
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    await expect(window.locator("body")).toContainText("Project D");
    const appBounds = await window.locator("#app").boundingBox();
    expect(appBounds?.width ?? 0).toBeGreaterThan(100);
    expect(appBounds?.height ?? 0).toBeGreaterThan(100);

    const screenshot = await window.screenshot();
    const visual = await app.evaluate(({ nativeImage }, encoded) => {
      const image = nativeImage.createFromBuffer(Buffer.from(encoded, "base64"));
      const pixels = image.toBitmap();
      let whitePixels = 0;
      let darkPixels = 0;
      for (let offset = 0; offset < pixels.length; offset += 4) {
        const blue = pixels[offset];
        const green = pixels[offset + 1];
        const red = pixels[offset + 2];
        if (red >= 248 && green >= 248 && blue >= 248) whitePixels += 1;
        if (red <= 48 && green <= 48 && blue <= 48) darkPixels += 1;
      }
      const pixelCount = Math.max(1, pixels.length / 4);
      return { whiteRatio: whitePixels / pixelCount, darkPixels, size: image.getSize() };
    }, screenshot.toString("base64"));
    expect(visual.size.width).toBeGreaterThan(100);
    expect(visual.size.height).toBeGreaterThan(100);
    expect(visual.whiteRatio).toBeLessThan(0.96);
    expect(visual.darkPixels).toBeGreaterThan(100);

    const appInfo = await window.evaluate(() => window.projectD.getAppInfo());
    const packageVersion = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version;
    expect(appInfo).toMatchObject({ name: "Project D", version: packageVersion, platform: "win32" });
    expect(await window.evaluate(() => typeof window.projectD.activateDesktop)).toBe("function");
  } finally {
    await app.close().catch(() => undefined);
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
});

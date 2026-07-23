const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts", "qa", "stage45-ui");
const port = 4189;
const edge = [
  path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
  path.join(process.env.PROGRAMFILES ?? "", "Microsoft", "Edge", "Application", "msedge.exe")
].find((candidate) => fs.existsSync(candidate));

if (!edge) throw new Error("Microsoft Edge is required for the Stage 45 browser-preview visual check");
fs.mkdirSync(output, { recursive: true });

const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");
const vite = spawn(process.execPath, [viteCli, "preview", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  windowsHide: true,
  stdio: "ignore"
});

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  vite.kill();
});

async function run() {
  await waitForPort(port);
  const browser = await chromium.launch({ headless: true, executablePath: edge });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await page.addInitScript(() => globalThis.localStorage.setItem("projectd:onboarding:v1", JSON.stringify({
      version: 1,
      currentStep: 5,
      status: "completed",
      updatedAt: new Date().toISOString()
    })));
    await page.goto(`http://127.0.0.1:${port}/#/overlay`, { waitUntil: "networkidle" });

    page.once("dialog", (dialog) => dialog.accept("视觉验收场景"));
    await page.getByTitle("保存当前场景").click();
    await page.getByTitle("搜索桌面与门户").click();
    const searchInput = page.locator(".desktop-search-form input");
    await searchInput.fill("ProjectD");
    await searchInput.press("Enter");
    await page.locator(".search-result-main").getByText("ProjectD需求.md", { exact: true }).waitFor();
    await page.getByTitle("钉到场景").click();
    const picker = page.locator(".search-scene-picker");
    await picker.getByText("视觉验收场景", { exact: true }).waitFor();
    const scenePickerVisible = await picker.isVisible();
    await page.screenshot({ path: path.join(output, "overlay-scene-picker.png"), fullPage: true });
    await picker.getByRole("menuitem", { name: /视觉验收场景/ }).click();
    await page.getByText(/已将.*钉到场景“视觉验收场景”/).waitFor();

    await page.evaluate(() => { globalThis.location.hash = "#/settings"; });
    await page.getByText("最近抑制", { exact: true }).waitFor();
    await page.getByText("当前处于用户配置的免打扰时段。", { exact: true }).waitFor();
    const suppressionHistoryVisible = true;
    await page.screenshot({ path: path.join(output, "settings-suppression-history.png"), fullPage: true });

    await page.locator(".settings-sidebar nav button").filter({ hasText: "门户" }).click();
    await page.getByText("1项钉选", { exact: false }).waitFor();
    const pinnedCountVisible = true;
    await page.screenshot({ path: path.join(output, "settings-pinned-count.png"), fullPage: true });
    const viewport = await page.evaluate(() => ({
      width: globalThis.innerWidth,
      height: globalThis.innerHeight,
      bodyWidth: globalThis.document.body.scrollWidth
    }));
    const checks = { scenePickerVisible, suppressionHistoryVisible, pinnedCountVisible, viewport };
    const report = {
      generatedAt: new Date().toISOString(),
      passed: Object.values(checks).slice(0, 3).every(Boolean) && viewport.bodyWidth <= viewport.width,
      checks
    };
    fs.writeFileSync(path.join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ...report, reportPath: path.join(output, "report.json") }, null, 2));
    if (!report.passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

function waitForPort(targetPort, timeoutMs = 10_000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const socket = net.createConnection({ host: "127.0.0.1", port: targetPort });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) reject(new Error("Vite preview did not start in time"));
        else setTimeout(probe, 200);
      });
    };
    probe();
  });
}

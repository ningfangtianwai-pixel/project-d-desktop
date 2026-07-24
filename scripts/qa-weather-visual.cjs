const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts", "qa", "weather-visual");
const port = 4194;
const edge = [
  path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
  path.join(process.env.PROGRAMFILES ?? "", "Microsoft", "Edge", "Application", "msedge.exe")
].find((candidate) => fs.existsSync(candidate));

if (!edge) throw new Error("Microsoft Edge is required for weather visual QA");
fs.mkdirSync(output, { recursive: true });

const vite = spawn(process.execPath, [path.join(root, "node_modules", "vite", "bin", "vite.js"), "preview", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  windowsHide: true,
  stdio: "ignore"
});

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => vite.kill());

async function run() {
  await waitForPort(port);
  const browser = await chromium.launch({ headless: true, executablePath: edge });
  try {
    const page = await browser.newPage({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1 });
    await page.addInitScript(() => globalThis.localStorage.setItem("projectd:onboarding:v1", JSON.stringify({ version: 1, currentStep: 5, status: "completed" })));
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
    await page.locator(".wallpaper-stage").waitFor();
    await page.evaluate(async () => {
      await globalThis.window.projectD.updateSettings({
        wallpaper: { currentStyle: "user", dynamicId: "anime-lakeside-station", isDynamic: true }
      });
    });
    await page.locator(".wallpaper-bg-img.is-active").waitFor();
    const modes = ["clear", "rain", "fog", "leaves", "light"];
    const checks = {};
    for (const mode of modes) {
      await page.evaluate(async (nextMode) => {
        await globalThis.window.projectD.updateSettings({ weather: { mode: "manual", manualWeather: nextMode, particleIntensity: 0.85 } });
      }, mode);
      const layer = page.locator(".real-weather-layer");
      await page.waitForTimeout(750);
      checks[mode] = await layer.evaluate((element) => ({
        weather: element.getAttribute("data-weather"),
        rainVisible: globalThis.getComputedStyle(element.querySelector(".weather-rain")).opacity,
        fogVisible: globalThis.getComputedStyle(element.querySelector(".weather-fog")).opacity,
        leavesVisible: globalThis.getComputedStyle(element.querySelector(".weather-leaves")).opacity,
        lightVisible: globalThis.getComputedStyle(element.querySelector(".weather-light")).opacity,
        rainStreaks: element.querySelectorAll(".rain-streak").length
      }));
      await page.screenshot({ path: path.join(output, `${mode}.png`) });
    }
    const passed = checks.rain.rainVisible !== "0" && checks.rain.rainStreaks === 96 && checks.fog.fogVisible !== "0" && checks.leaves.leavesVisible !== "0" && checks.light.lightVisible !== "0";
    const report = { generatedAt: new Date().toISOString(), passed, checks };
    fs.writeFileSync(path.join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ...report, output }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

function waitForPort(targetPort, timeoutMs = 10_000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const socket = net.createConnection({ host: "127.0.0.1", port: targetPort });
      socket.once("connect", () => { socket.destroy(); resolve(); });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) reject(new Error("Vite preview did not start in time"));
        else setTimeout(probe, 200);
      });
    };
    probe();
  });
}

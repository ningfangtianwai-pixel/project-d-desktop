const fs = require("node:fs");
const path = require("node:path");

const DEBUG_URL = process.env.PROJECTD_DEBUG_URL || "http://127.0.0.1:9333";
const outputDir = path.resolve(process.argv[2] || "docs/screenshots/stage36");
const captured = [];

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    await this.send("Page.enable");
    await this.send("Runtime.enable");
    return this;
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || "Evaluation failed");
    return response.result.value;
  }

  async screenshot(filename) {
    await this.send("Page.bringToFront");
    await wait(250);
    const result = await this.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });
    const target = path.join(outputDir, filename);
    fs.writeFileSync(target, Buffer.from(result.data, "base64"));
    captured.push(filename);
  }

  close() {
    this.socket.close();
  }
}

async function targets() {
  return fetch(`${DEBUG_URL}/json/list`).then((response) => response.json());
}

async function targetClient(predicate, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const target = (await targets()).find(predicate);
    if (target) return new CdpClient(target.webSocketDebuggerUrl).open();
    await wait(200);
  }
  throw new Error("Timed out waiting for Electron target");
}

function clickText(text) {
  return `(() => {
    const target = [...document.querySelectorAll("button")].find((button) => button.innerText.trim() === ${JSON.stringify(text)});
    if (!target) return false;
    target.click();
    return true;
  })()`;
}

async function captureMain(client) {
  await client.screenshot("01-main-onboarding-welcome.png");
  for (let step = 2; step <= 4; step += 1) {
    const advanced = await client.evaluate(`(() => {
      const button = document.querySelector(".onboarding-primary");
      if (!button) return false;
      button.click();
      return true;
    })()`);
    if (!advanced) break;
    await wait(350);
    await client.screenshot(`0${step}-main-onboarding-step-${step}.png`);
  }

  await client.evaluate(`document.querySelector(".onboarding-skip")?.click()`);
  await wait(500);
  await client.screenshot("05-main-desktop-workspace.png");

  for (let index = 1; index <= 2; index += 1) {
    await client.evaluate(`document.querySelector(".wallpaper-pull-cord")?.click()`);
    await wait(900);
    await client.screenshot(`0${5 + index}-main-wallpaper-cycle-${index}.png`);
  }

  await client.evaluate(`document.querySelector('button[title="搜索"]')?.click()`);
  await wait(350);
  await client.screenshot("08-main-search-panel.png");
  await client.evaluate(`(() => {
    const input = document.querySelector('input[type="search"], .workspace-search input, .search-panel input');
    if (!input) return false;
    input.value = "Project D";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  await wait(900);
  await client.screenshot("09-main-search-results.png");

  await client.evaluate(clickText("收件箱"));
  await wait(400);
  await client.screenshot("10-main-desktop-inbox.png");
  await client.evaluate(clickText("查看方案"));
  await wait(500);
  await client.screenshot("11-main-action-plan-preview.png");
}

async function captureSettings(client) {
  const tabs = ["通用", "布局", "自动规则", "文件门户", "隐私中心", "壁纸", "天气", "桌宠", "AI 对话", "恢复中心", "关于"];
  for (let index = 0; index < tabs.length; index += 1) {
    await client.evaluate(clickText(tabs[index]));
    await wait(350);
    const slug = ["general", "layout", "auto-rules", "portals", "privacy", "wallpaper", "weather", "pet", "ai-chat", "recovery", "about"][index];
    await client.screenshot(`${String(12 + index).padStart(2, "0")}-settings-${slug}.png`);
  }
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const mainClient = await targetClient((target) => target.type === "page" && !target.url.includes("#/"));
  await captureMain(mainClient);

  await mainClient.evaluate(`document.querySelector('button[title="设置"]')?.click()`);
  const settingsClient = await targetClient((target) => target.url.includes("#/settings"));
  await captureSettings(settingsClient);

  const wallpaperClient = await targetClient((target) => target.url.includes("#/wallpaper"));
  await wallpaperClient.screenshot("23-wallpaper-host-live.png");
  const petClient = await targetClient((target) => target.url.includes("#/pet"));
  await petClient.screenshot("24-pet-live.png");

  const index = [
    "# Project D Stage 36 Product Screenshots",
    "",
    `Captured from the packaged Electron application on ${new Date().toISOString()}.`,
    "",
    ...captured.map((filename, itemIndex) => `${itemIndex + 1}. [${filename}](./${filename})`),
    ""
  ].join("\n");
  fs.writeFileSync(path.join(outputDir, "README.md"), index, "utf8");
  console.log(JSON.stringify({ outputDir, count: captured.length, files: captured }, null, 2));

  petClient.close();
  wallpaperClient.close();
  settingsClient.close();
  mainClient.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

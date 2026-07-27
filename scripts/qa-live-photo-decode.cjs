const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { app, BrowserWindow } = require("electron");

async function main() {
  const videoPath = path.join(__dirname, "..", "assets", "wallpapers", "user", "cloud-light.mp4");
  assert.ok(fs.existsSync(videoPath), `Live Photo decode fixture is missing: ${videoPath}`);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "projectd-live-photo-decode-"));
  const htmlPath = path.join(root, "probe.html");
  const source = pathToFileURL(videoPath).href.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  fs.writeFileSync(htmlPath, `<!doctype html><video id="probe" muted preload="auto" src="${source}"></video>`);

  const window = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  try {
    await window.loadFile(htmlPath);
    const result = await window.webContents.executeJavaScript(`new Promise((resolve) => {
      const video = document.getElementById("probe");
      const finish = (ok, error) => resolve({ ok, error, width: video.videoWidth, height: video.videoHeight, readyState: video.readyState });
      const timer = setTimeout(() => finish(false, "decode timeout"), 15000);
      video.addEventListener("loadeddata", () => { clearTimeout(timer); finish(true, null); }, { once: true });
      video.addEventListener("error", () => { clearTimeout(timer); finish(false, "media error"); }, { once: true });
      video.load();
    })`, true);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.ok(result.width > 0 && result.height > 0, JSON.stringify(result));
    assert.ok(result.readyState >= 2, JSON.stringify(result));
    process.stdout.write(JSON.stringify({ passed: true, width: result.width, height: result.height, readyState: result.readyState }) + "\n");
  } finally {
    if (!window.isDestroyed()) window.destroy();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

app.whenReady()
  .then(main)
  .then(() => app.exit(0))
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("all desktop renderer windows keep the sandbox and web security enabled", () => {
  const source = fs.readFileSync(path.join(root, "src", "main", "main.ts"), "utf8");
  const windows = source.match(/new BrowserWindow\s*\(/g) ?? [];
  assert.ok(windows.length >= 5);
  assert.equal((source.match(/contextIsolation:\s*true/g) ?? []).length, windows.length);
  assert.equal((source.match(/nodeIntegration:\s*false/g) ?? []).length, windows.length);
  assert.equal((source.match(/sandbox:\s*true/g) ?? []).length, windows.length);
  assert.equal((source.match(/webSecurity:\s*true/g) ?? []).length, windows.length);

  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /default-src 'self'/);
  assert.match(html, /img-src[^;]*projectd-media:/);
  assert.match(html, /media-src[^;]*projectd-media:/);
  assert.match(html, /connect-src[^;]*projectd-media:/);
  assert.doesNotMatch(html, /script-src[^;]*'unsafe-eval'/);
});

test("provider configuration routes secrets through Electron safeStorage", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const script = fs.readFileSync(path.join(root, "scripts", "configure-providers.cjs"), "utf8");
  const database = fs.readFileSync(path.join(root, "src", "main", "database.ts"), "utf8");

  assert.match(packageJson.scripts["configure:providers"], /electron scripts\/configure-providers\.cjs/);
  assert.match(script, /DatabaseService/);
  assert.match(script, /safeStorage\.isEncryptionAvailable/);
  assert.doesNotMatch(script, /UPDATE\s+(?:weather_config|ai_config)/i);
  assert.match(database, /the API key was not saved/);
  assert.match(database, /removeLegacyPlaintextSecret/);
  assert.match(database, /legacy plaintext provider secrets were removed/);
  assert.match(database, /legacy plaintext provider secret ignored/);
});

test("main process delegates tray and shortcut ownership", () => {
  const source = fs.readFileSync(path.join(root, "src", "main", "main.ts"), "utf8");
  assert.match(source, /new ProjectTrayManager/);
  assert.match(source, /new ShortcutManager/);
  assert.doesNotMatch(source, /new Tray\s*\(/);
  assert.doesNotMatch(source, /globalShortcut\.register\s*\(/);
});

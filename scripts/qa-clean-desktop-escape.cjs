const { spawnSync } = require("node:child_process");

const endpoint = process.env.PROJECTD_CDP_ENDPOINT ?? "http://127.0.0.1:9333";
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

  close() {
    this.socket.close();
  }
}

async function main() {
  const targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
  const target = targets.find((item) => item.type === "page" && !item.url.includes("#/"));
  if (!target) throw new Error("Project D main renderer target was not found");
  const client = await new CdpClient(target.webSocketDebuggerUrl).open();

  try {
    const entered = await client.evaluate("window.projectD.enterCleanDesktop()");
    await wait(1_200);
    const sendKey = spawnSync("powershell.exe", [
      "-NoProfile",
      "-Command",
      "$shell = New-Object -ComObject WScript.Shell; $shell.SendKeys('{ESC}')"
    ], { encoding: "utf8" });
    if (sendKey.status !== 0) throw new Error(sendKey.stderr || "Failed to send Escape");
    const deadline = Date.now() + 25_000;
    let status = await client.evaluate("window.projectD.getDesktopStatus()");
    while (status.mode !== "idle" && Date.now() < deadline) {
      await wait(500);
      status = await client.evaluate("window.projectD.getDesktopStatus()");
    }
    if (entered.mode !== "active") {
      throw new Error(`Clean desktop did not activate safely: ${JSON.stringify(entered)}`);
    }
    const registry = spawnSync("reg.exe", [
      "query",
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
      "/v",
      "HideIcons"
    ], { encoding: "utf8" });
    const iconsVisible = registry.status === 0 && /HideIcons\s+REG_DWORD\s+0x0/i.test(registry.stdout);
    if (status.mode !== "idle" || !iconsVisible) {
      await client.evaluate("window.projectD.exitCleanDesktop()");
      throw new Error(`Escape recovery failed: ${JSON.stringify({ status, iconsVisible })}`);
    }
    console.log(JSON.stringify({ entered: entered.mode, exited: status.mode, iconsVisible, escapeRecovered: true }, null, 2));
  } finally {
    client.close();
  }
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});

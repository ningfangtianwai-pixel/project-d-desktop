const CDP_ENDPOINT = process.env.PROJECTD_CDP_ENDPOINT ?? "http://127.0.0.1:9333";
const PROBE_TIMEOUT_MS = 4_000;

async function main() {
  const targets = await fetch(`${CDP_ENDPOINT}/json/list`).then((response) => response.json());
  const settings = targets.find((target) => target.type === "page" && target.url.endsWith("#/settings"));
  if (!settings?.webSocketDebuggerUrl) throw new Error("Project D settings target was not found");

  const result = await evaluate(settings.webSocketDebuggerUrl, `
    (async () => {
      const calls = {
        getWallpaperLibrary: () => window.projectD.getWallpaperLibrary(),
        getSettings: () => window.projectD.getSettings(),
        getLayouts: () => window.projectD.getLayouts(),
        getContainers: () => window.projectD.getContainers(),
        getAutoRules: () => window.projectD.getAutoRules(),
        getAppInfo: () => window.projectD.getAppInfo(),
        getWallpaperHostState: () => window.projectD.getState("wallpaper_host"),
        getWeatherLocationState: () => window.projectD.getState("weather_location_source"),
        getRecoveryPathState: () => window.projectD.getState("recovery_script_path"),
        getPerformanceState: () => window.projectD.getState("performance_mode"),
        getAutoActivateState: () => window.projectD.getState("auto_activate_on_start"),
        getCoverAllDisplaysState: () => window.projectD.getState("cover_all_displays"),
        getFolderPortals: () => window.projectD.getFolderPortals(),
        getWorkspaceScenes: () => window.projectD.getWorkspaceScenes(),
        getActionHistory: () => window.projectD.getActionHistory(),
        getInterruptedActionRecoveries: () => window.projectD.getInterruptedActionRecoveries(),
        getSuggestionDeliveryControls: () => window.projectD.getSuggestionDeliveryControls(),
        getPrivacyNetworkState: () => window.projectD.getPrivacyNetworkState(),
        getRecoverySystemStatus: () => window.projectD.getRecoverySystemStatus()
      };
      const entries = await Promise.all(Object.entries(calls).map(async ([name, call]) => {
        const startedAt = performance.now();
        try {
          await Promise.race([
            call(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ${PROBE_TIMEOUT_MS}))
          ]);
          return [name, { status: "ready", elapsedMs: Math.round(performance.now() - startedAt) }];
        } catch (error) {
          return [name, {
            status: error instanceof Error && error.message === "timeout" ? "timeout" : "failed",
            elapsedMs: Math.round(performance.now() - startedAt),
            error: error instanceof Error ? error.message : String(error)
          }];
        }
      }));
      return Object.fromEntries(entries);
    })()
  `);

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(Object.values(result).some((item) => item.status !== "ready") ? 1 : 0);
}

function evaluate(webSocketUrl, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const requestId = 1;
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("Chrome DevTools Protocol evaluation timed out"));
    }, PROBE_TIMEOUT_MS + 3_000);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({
        id: requestId,
        method: "Runtime.evaluate",
        params: { expression, awaitPromise: true, returnByValue: true }
      }));
    });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== requestId) return;
      clearTimeout(timer);
      socket.close();
      if (message.error) return reject(new Error(message.error.message));
      if (message.result?.exceptionDetails) {
        return reject(new Error(message.result.exceptionDetails.text ?? "Renderer evaluation failed"));
      }
      resolve(message.result?.result?.value);
    });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("Chrome DevTools Protocol connection failed"));
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

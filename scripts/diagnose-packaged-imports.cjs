const fs = require("node:fs");
const path = require("node:path");

const appAsar = process.argv[2];
const outputPath = process.argv[3];

if (!appAsar || !outputPath) {
  throw new Error("Usage: electron diagnose-packaged-imports.cjs <app.asar> <output.log>");
}

function record(message, data) {
  const line = `${JSON.stringify({ at: new Date().toISOString(), message, data: data ?? null })}\n`;
  fs.appendFileSync(outputPath, line);
}

const modulePaths = [
  "node_modules/electron-updater",
  "dist/main/database.js",
  "dist/main/desktop-controller.js",
  "dist/main/file-scanner.js",
  "dist/main/logger.js",
  "dist/main/ai-service.js",
  "dist/main/weather-service.js",
  "dist/main/wallpaper-host.js",
  "dist/main/wallpaper-supervisor.js",
  "dist/main/pet-menu.js",
  "dist/main/actions/action-engine.js",
  "dist/main/scenes/scene-service.js",
  "dist/main/portals/portal-service.js",
  "dist/main/portals/portal-watcher.js",
  "dist/main/portals/portal-authorization.js",
  "dist/main/search/search-service.js",
  "dist/main/search/search-result-registry.js",
  "dist/main/search/everything-provider.js",
  "dist/main/search/windows-search-provider.js",
  "dist/main/suggestions/suggestion-engine.js",
  "dist/main/diagnostics/diagnostics-service.js",
  "dist/main/diagnostics/diagnostics-source.js",
  "dist/main/system-presence.js",
  "dist/main/desktop-runtime-recovery.js",
  "dist/main/explorer-monitor.js",
  "dist/main/privacy-network.js",
  "dist/main/actions/action-recovery.js",
  "dist/main/shutdown-deadline.js",
  "dist/main/window-resilience.js",
  "dist/main/update-service.js",
  "dist/main/operations/remote-config.js",
  "dist/main/operations/crash-metrics.js",
  "dist/main/operations/alert-engine.js",
  "dist/main/operations/operations-control.js",
  "dist/main/operations/operations-telemetry.js",
  "dist/shared/ipc.js",
  "dist/shared/operations.js",
  "dist/main/ipc/register-all.js",
  "dist/shared/wallpaper-library.js",
];

record("diagnostic start", { appAsar, electron: process.versions.electron, node: process.versions.node });

for (const relativePath of modulePaths) {
  const absolutePath = path.join(appAsar, ...relativePath.split("/"));
  record("before require", { relativePath, absolutePath });
  try {
    require(absolutePath);
    record("after require", { relativePath });
  } catch (error) {
    record("require failed", {
      relativePath,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
    });
    process.exitCode = 1;
    break;
  }
}

record("diagnostic complete");
require("electron").app.quit();

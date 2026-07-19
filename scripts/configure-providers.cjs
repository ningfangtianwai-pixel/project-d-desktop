const path = require("node:path");
const { app, safeStorage } = require("electron");

const PRODUCT_NAME = "Project D";

app.setName(PRODUCT_NAME);
app.setPath("userData", path.join(app.getPath("appData"), PRODUCT_NAME));

async function main() {
  if (!app.requestSingleInstanceLock()) {
    throw new Error("Close Project D before changing provider configuration");
  }

  await app.whenReady();
  const weatherKey = (process.env.PROJECTD_OPENWEATHER_API_KEY || "").trim();
  const deepSeekKey = (process.env.PROJECTD_DEEPSEEK_API_KEY || "").trim();
  if ((weatherKey || deepSeekKey) && !safeStorage.isEncryptionAvailable()) {
    throw new Error("System credential encryption is unavailable; no API key was saved");
  }

  const { AppLogger } = require("../dist/main/logger.js");
  const { DatabaseService } = require("../dist/main/database.js");
  const dbPath = process.env.PROJECTD_DB_PATH ? path.resolve(process.env.PROJECTD_DB_PATH) : undefined;
  const logger = new AppLogger();
  const database = new DatabaseService(logger, dbPath);

  try {
    await database.initialize();
    database.updateSettings({
      weather: {
        mode: "auto",
        city: null,
        latitude: null,
        longitude: null,
        ...(weatherKey ? { apiKey: weatherKey } : {})
      },
      ai: {
        provider: "deepseek",
        apiEndpoint: "https://api.deepseek.com/chat/completions",
        model: "deepseek-chat",
        enabled: true,
        ...(deepSeekKey ? { apiKey: deepSeekKey } : {})
      }
    });
    database.setAppState("provider_configured_at", new Date().toISOString());

    const settings = database.getSettings();
    process.stdout.write(`${JSON.stringify({
      dbPath: dbPath ?? path.join(app.getPath("userData"), "database.sqlite"),
      weatherMode: settings.weather.mode,
      weatherApiKeyConfigured: settings.weather.apiKeyConfigured,
      weatherLocation: "ip-auto",
      aiProvider: settings.ai.provider,
      aiApiKeyConfigured: settings.ai.apiKeyConfigured,
      secretStorage: "electron-safeStorage"
    }, null, 2)}\n`);
  } finally {
    database.close();
  }
}

main()
  .then(() => app.quit())
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    app.exit(1);
  });

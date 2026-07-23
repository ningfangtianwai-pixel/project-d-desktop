const path = require("node:path");
const { app } = require("electron");

app.setName("Project D");
app.setPath("userData", path.join(app.getPath("appData"), "Project D"));

async function main() {
  if (!app.requestSingleInstanceLock()) {
    throw new Error("Close Project D before testing the configured AI provider");
  }

  await app.whenReady();
  const { AiService } = require("../dist/main/ai-service.js");
  const { DatabaseService } = require("../dist/main/database.js");
  const { AppLogger } = require("../dist/main/logger.js");
  const dbPath = process.env.PROJECTD_DB_PATH ? path.resolve(process.env.PROJECTD_DB_PATH) : undefined;
  const logger = new AppLogger();
  const database = new DatabaseService(logger, dbPath);

  try {
    await database.initialize();
    const settings = database.getSettings();
    const result = await new AiService(
      database,
      { getCurrentWeather: async () => ({ condition: "clear" }) },
      logger
    ).testConnection();
    process.stdout.write(`${JSON.stringify({
      ok: result.mode === "remote",
      provider: result.provider,
      model: settings.ai.model,
      apiKeyConfigured: settings.ai.apiKeyConfigured,
      message: result.message
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

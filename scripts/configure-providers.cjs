const fs = require("node:fs");
const path = require("node:path");
const initSqlJs = require("sql.js");

async function main() {
  const dbPath = process.env.PROJECTD_DB_PATH || path.join(process.env.APPDATA ?? "", "Project D", "database.sqlite");
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    process.exitCode = 1;
    return;
  }

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file)
  });
  const db = new SQL.Database(fs.readFileSync(dbPath));
  const weatherKey = (process.env.PROJECTD_OPENWEATHER_API_KEY || "").trim();
  const deepSeekKey = (process.env.PROJECTD_DEEPSEEK_API_KEY || "").trim();

  db.run("INSERT INTO weather_config(id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM weather_config)");
  db.run("INSERT INTO ai_config(id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM ai_config)");

  db.run(
    `UPDATE weather_config
     SET mode = 'auto',
         api_key = CASE WHEN ? <> '' THEN ? ELSE api_key END,
         city = NULL,
         latitude = NULL,
         longitude = NULL,
         last_fetched_at = NULL
     WHERE id = (SELECT id FROM weather_config ORDER BY id LIMIT 1)`,
    [weatherKey, weatherKey]
  );

  db.run(
    `UPDATE ai_config
     SET provider = 'deepseek',
         api_key = CASE WHEN ? <> '' THEN ? ELSE api_key END,
         api_endpoint = 'https://api.deepseek.com/chat/completions',
         model = 'deepseek-chat',
         enabled = 1
     WHERE id = (SELECT id FROM ai_config ORDER BY id LIMIT 1)`,
    [deepSeekKey, deepSeekKey]
  );

  db.run(
    `INSERT INTO app_state(key, value, updated_at)
     VALUES ('provider_configured_at', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [new Date().toISOString()]
  );

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  db.close();

  console.log(
    JSON.stringify(
      {
        dbPath,
        weatherMode: "auto",
        weatherApiKeyConfigured: weatherKey.length > 0,
        weatherLocation: "ip-auto",
        aiProvider: "deepseek",
        aiApiKeyConfigured: deepSeekKey.length > 0
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

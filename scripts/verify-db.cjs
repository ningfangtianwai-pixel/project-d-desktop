const fs = require("node:fs");
const path = require("node:path");
const initSqlJs = require("sql.js");

async function main() {
  const dbPath = path.join(process.env.APPDATA ?? "", "Project D", "database.sqlite");

  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    process.exitCode = 1;
    return;
  }

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file)
  });
  const db = new SQL.Database(fs.readFileSync(dbPath));
  const count = (table) => db.exec(`SELECT COUNT(*) FROM ${table}`)[0].values[0][0];
  const scalar = (sql) => db.exec(sql)[0]?.values[0]?.[0] ?? null;
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")[0].values.map((row) => row[0]);

  const summary = {
    dbPath,
    tableCount: tables.length,
    containers: count("containers"),
    desktopFiles: count("desktop_files WHERE is_missing = 0"),
    missingFiles: count("desktop_files WHERE is_missing = 1"),
    layouts: count("layouts"),
    wallpaper: count("wallpaper_config"),
    weather: count("weather_config"),
    pet: count("pet_config"),
    ai: count("ai_config"),
    chatHistory: count("chat_history"),
    appState: count("app_state"),
    wallpaperDynamic: scalar("SELECT is_dynamic FROM wallpaper_config ORDER BY id LIMIT 1"),
    wallpaperHost: scalar("SELECT value FROM app_state WHERE key = 'wallpaper_host'"),
    petWindowBounds: scalar("SELECT value FROM app_state WHERE key = 'pet_window_bounds'"),
    weatherApiKeyConfigured: Number(scalar("SELECT COUNT(*) FROM weather_config WHERE api_key IS NOT NULL AND length(api_key) > 0")) > 0,
    weatherApiKeyEncrypted: Number(scalar("SELECT COUNT(*) FROM weather_config WHERE api_key LIKE 'safe:v1:%'")) > 0,
    weatherMode: scalar("SELECT mode FROM weather_config ORDER BY id LIMIT 1"),
    weatherCity: scalar("SELECT city FROM weather_config ORDER BY id LIMIT 1"),
    weatherLatitudeConfigured: scalar("SELECT latitude IS NOT NULL FROM weather_config ORDER BY id LIMIT 1") === 1,
    weatherLongitudeConfigured: scalar("SELECT longitude IS NOT NULL FROM weather_config ORDER BY id LIMIT 1") === 1,
    weatherLocationSource: scalar("SELECT value FROM app_state WHERE key = 'weather_location_source'"),
    aiProvider: scalar("SELECT provider FROM ai_config ORDER BY id LIMIT 1"),
    aiApiKeyConfigured: Number(scalar("SELECT COUNT(*) FROM ai_config WHERE api_key IS NOT NULL AND length(api_key) > 0")) > 0,
    aiApiKeyEncrypted: Number(scalar("SELECT COUNT(*) FROM ai_config WHERE api_key LIKE 'safe:v1:%'")) > 0,
    aiModel: scalar("SELECT model FROM ai_config ORDER BY id LIMIT 1"),
    sqlWasmCandidateExists: fs.existsSync(path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm"))
  };

  console.log(JSON.stringify(summary, null, 2));

  if (summary.tableCount < 12 || summary.containers < 7 || summary.appState < 5 || !summary.sqlWasmCandidateExists) {
    console.error("Database verification failed: required Stage 1 seed data is missing.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

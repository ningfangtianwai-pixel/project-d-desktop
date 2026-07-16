const fs = require("node:fs");
const path = require("node:path");
const initSqlJs = require("sql.js");

async function main() {
  const databasePath = process.argv[2];
  if (!databasePath) throw new Error("Usage: node scripts/inspect-database.cjs <database.sqlite>");

  const SQL = await initSqlJs();
  const database = new SQL.Database(fs.readFileSync(databasePath));
  const rows = (sql) => database.exec(sql)[0]?.values ?? [];
  const containerColumns = rows("PRAGMA table_info(containers)").map((row) => row[1]);
  const result = {
    path: path.resolve(databasePath),
    schemaVersion: rows("SELECT value FROM app_state WHERE key = 'schema_version'")[0]?.[0] ?? null,
    containerColumns,
    containerAccents: containerColumns.includes("accent_color")
      ? rows("SELECT accent_color, COUNT(*) FROM containers GROUP BY accent_color ORDER BY accent_color")
      : null
  };
  database.close();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

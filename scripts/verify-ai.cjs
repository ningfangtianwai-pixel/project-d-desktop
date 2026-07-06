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
  const row = db.exec("SELECT provider, api_key, api_endpoint, model FROM ai_config ORDER BY id LIMIT 1")[0]?.values[0] ?? [];
  db.close();

  const provider = String(row[0] || "local-fallback");
  const storedKey = typeof row[1] === "string" && row[1].trim() ? row[1].trim() : "";
  const apiKey = storedKey.startsWith("safe:v1:") ? process.env.PROJECTD_DEEPSEEK_API_KEY : storedKey || process.env.PROJECTD_DEEPSEEK_API_KEY;
  const endpoint = String(row[2] || "https://api.deepseek.com/chat/completions");
  const model = String(row[3] || "deepseek-chat");

  if (provider !== "deepseek") {
    throw new Error(`Expected deepseek provider, got ${provider}`);
  }
  if (!apiKey) {
    throw new Error("DeepSeek API key is not available to this verifier. Provide PROJECTD_DEEPSEEK_API_KEY when the database stores a safeStorage-encrypted key.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "你是 Project D 连通性检查助手，只需要简短回答。" },
        { role: "user", content: "请用中文回复：Project D DeepSeek 可用。" }
      ],
      temperature: 0.2,
      max_tokens: 40
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`DeepSeek returned ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || "";
  if (!content) {
    throw new Error("DeepSeek returned an empty response");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        provider,
        model,
        responsePreview: content.slice(0, 80)
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

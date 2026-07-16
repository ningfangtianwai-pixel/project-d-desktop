import { spawn } from "node:child_process";
import path from "node:path";
import type { SearchCandidate } from "./search-service.js";

const SEARCH_TIMEOUT_MS = 8_000;
const MAX_STDOUT_BYTES = 512_000;

const POWERSHELL_SCRIPT = `
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$query = [Environment]::GetEnvironmentVariable('PROJECTD_SEARCH_QUERY')
$limitRaw = [Environment]::GetEnvironmentVariable('PROJECTD_SEARCH_LIMIT')
$limit = [Math]::Min([Math]::Max([int]$limitRaw, 1), 100)
$escaped = $query.Replace("'", "''").Replace('[', '[[]').Replace('%', '[%]').Replace('_', '[_]')
$connection = New-Object -ComObject ADODB.Connection
$recordset = $null
try {
  $connection.Open('Provider=Search.CollatorDSO;Extended Properties="Application=Windows"')
  $sql = "SELECT TOP $limit System.ItemPathDisplay, System.FileName, System.DateModified FROM SYSTEMINDEX WHERE System.ItemPathDisplay IS NOT NULL AND System.FileName LIKE '%$escaped%' ORDER BY System.DateModified DESC"
  $recordset = New-Object -ComObject ADODB.Recordset
  $recordset.Open($sql, $connection)
  $items = @()
  while (-not $recordset.EOF -and $items.Count -lt $limit) {
    $items += [PSCustomObject]@{
      fullPath = [string]$recordset.Fields.Item('System.ItemPathDisplay').Value
      title = [string]$recordset.Fields.Item('System.FileName').Value
      modifiedAt = if ($recordset.Fields.Item('System.DateModified').Value) { ([datetime]$recordset.Fields.Item('System.DateModified').Value).ToUniversalTime().ToString('o') } else { '' }
    }
    $recordset.MoveNext()
  }
  @($items) | ConvertTo-Json -Compress
} finally {
  if ($recordset) { try { $recordset.Close() } catch {} }
  try { $connection.Close() } catch {}
}
`;

const ENCODED_SCRIPT = Buffer.from(POWERSHELL_SCRIPT, "utf16le").toString("base64");

export async function searchWindowsSearch(
  query: string,
  limit: number,
  signal?: AbortSignal
): Promise<SearchCandidate[]> {
  const normalizedQuery = query.replace(/[\x00-\x1f\x7f]/g, " ").trim().slice(0, 160);
  if (!normalizedQuery || signal?.aborted) return [];

  return new Promise((resolve) => {
    let stdout = "";
    let settled = false;
    const finish = (results: SearchCandidate[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(results);
    };
    const child = spawn("powershell.exe", [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy", "Bypass",
      "-EncodedCommand", ENCODED_SCRIPT
    ], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
      env: {
        ...process.env,
        PROJECTD_SEARCH_QUERY: normalizedQuery,
        PROJECTD_SEARCH_LIMIT: String(Math.min(Math.max(Math.floor(limit), 1), 100))
      }
    });
    const timer = setTimeout(() => {
      child.kill();
      finish(parseResults(stdout));
    }, SEARCH_TIMEOUT_MS);

    signal?.addEventListener("abort", () => {
      child.kill();
      finish([]);
    }, { once: true });
    child.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length < MAX_STDOUT_BYTES) stdout += chunk.toString("utf8");
    });
    child.on("error", () => finish([]));
    child.on("close", () => finish(parseResults(stdout)));
  });
}

function parseResults(raw: string): SearchCandidate[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows.flatMap((row, index) => {
      if (!row || typeof row !== "object") return [];
      const item = row as Record<string, unknown>;
      const fullPath = typeof item.fullPath === "string" ? item.fullPath : "";
      const title = typeof item.title === "string" && item.title ? item.title : path.basename(fullPath);
      if (!path.isAbsolute(fullPath) || !title || fullPath.includes("\0")) return [];
      return [{
        id: `windows-search:${index}:${Buffer.from(fullPath).toString("base64url").slice(0, 40)}`,
        title,
        fullPath,
        category: guessCategory(title),
        modifiedAt: typeof item.modifiedAt === "string" ? item.modifiedAt : ""
      }];
    });
  } catch {
    return [];
  }
}

function guessCategory(name: string): string {
  const extension = path.extname(name).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"].includes(extension)) return "image";
  if ([".mp4", ".mov", ".mkv", ".mp3", ".wav", ".flac"].includes(extension)) return "media";
  if ([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".md", ".csv"].includes(extension)) return "document";
  if ([".js", ".ts", ".py", ".java", ".c", ".cpp", ".h", ".rs", ".go", ".vue", ".json", ".html", ".css"].includes(extension)) return "code";
  if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(extension)) return "archive";
  return "other";
}

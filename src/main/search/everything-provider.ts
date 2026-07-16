import { spawn } from "node:child_process";
import type { SearchCandidate } from "./search-service.js";

const EVERYTHING_REGISTRY_KEYS = [
  "\\Software\\voidtools\\Everything",
  "\\Software\\Wow6432Node\\voidtools\\Everything"
] as const;

const PORTABLE_PATHS = [
  "Everything\\es.exe"
] as const;

const ES_TIMEOUT_MS = 8_000;
const ES_MAX_STDOUT_BYTES = 256_000;

let cachedExePath: string | null | undefined = undefined;

export function isEverythingAvailable(): boolean {
  return findEsExe() !== null;
}

export function findEsExe(): string | null {
  if (cachedExePath !== undefined) return cachedExePath as string | null;

  try {
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    for (const key of EVERYTHING_REGISTRY_KEYS) {
      try {
        const result = execSync(
          `reg query "HKLM${key}" /v "InstallLocation" 2>nul`,
          { encoding: "utf8", timeout: 3_000, windowsHide: true }
        );
        const match = result.match(/REG_SZ\s+(.+)/);
        if (match?.[1]) {
          cachedExePath = match[1].trim() + "\\es.exe";
          return cachedExePath!;
        }
      } catch { /* continue */ }
    }
  } catch { /* no registry access */ }

  try {
    const appData = process.env.APPDATA || "";
    for (const portable of PORTABLE_PATHS) {
      const full = require("node:path").join(appData, portable);
      if (require("node:fs").existsSync(full)) {
        cachedExePath = full;
        return cachedExePath!;
      }
    }
  } catch { /* no file access */ }

  cachedExePath = null;
  return null;
}

export async function searchEverything(
  query: string,
  limit: number,
  signal?: AbortSignal
): Promise<SearchCandidate[]> {
  const exe = findEsExe();
  if (!exe) return [];

  const safeQuery = limitQueryLength(sanitizeQuery(query));

  return new Promise((resolve) => {
    let stdout = "";
    let settled = false;

    const proc = spawn(exe, [
      safeQuery,
      "-n", String(Math.min(limit, 200)),
      "-csv",
      "-name-column",
      "-path-column",
      "-size-column",
      "-date-modified-column"
    ], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"]
    });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill();
        resolve(parseEverythingCsv(stdout));
      }
    }, ES_TIMEOUT_MS);

    if (signal) {
      signal.addEventListener("abort", () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          proc.kill();
          resolve([]);
        }
      }, { once: true });
    }

    proc.stdout!.on("data", (chunk: Buffer) => {
      if (stdout.length < ES_MAX_STDOUT_BYTES) {
        stdout += chunk.toString("utf8");
      }
    });

    proc.on("close", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(parseEverythingCsv(stdout));
      }
    });

    proc.on("error", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve([]);
      }
    });
  });
}

function sanitizeQuery(raw: string): string {
  return raw.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 200);
}

function limitQueryLength(query: string): string {
  return query.length > 200 ? query.slice(0, 200) : query;
}

function parseEverythingCsv(csv: string): SearchCandidate[] {
  if (!csv.trim()) return [];
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const results: SearchCandidate[] = [];
  for (let i = 1; i < Math.min(lines.length, 201); i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length < 4) continue;
    const name = fields[0]?.replace(/^"+|"+$/g, "") ?? "";
    const directoryPath = fields[1]?.replace(/^"+|"+$/g, "") ?? "";
    const fullPath = require("node:path").join(directoryPath, name);
    if (!name || !directoryPath) continue;

    results.push({
      id: `everything:${Buffer.from(fullPath).toString("base64").slice(0, 40)}`,
      title: name,
      fullPath,
      category: guessCategoryFromName(name),
      modifiedAt: fields[3]?.replace(/^"+|"+$/g, "") ?? ""
    });
  }

  return results;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function guessCategoryFromName(name: string): string {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
  const images = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"]);
  const media = new Set([".mp4", ".mov", ".mkv", ".mp3", ".wav", ".flac"]);
  const docs = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".md", ".csv"]);
  const code = new Set([".js", ".ts", ".py", ".java", ".c", ".cpp", ".h", ".rs", ".go", ".vue", ".json", ".xml", ".yaml", ".yml", ".html", ".css"]);
  const archives = new Set([".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"]);

  if (images.has(ext)) return "image";
  if (media.has(ext)) return "media";
  if (docs.has(ext)) return "document";
  if (code.has(ext)) return "code";
  if (archives.has(ext)) return "archive";
  return "other";
}

export type SearchOrigin = "desktop" | "portal" | "everything" | "windows-search";

export interface SearchCandidate {
  id: string;
  title: string;
  fullPath: string;
  category: string;
  modifiedAt: string;
}

export interface SearchResult extends SearchCandidate {
  origin: SearchOrigin;
  score: number;
  providerScore: number;
}

export interface SearchProviders {
  getDesktopCandidates(): SearchCandidate[] | Promise<SearchCandidate[]>;
  getPortalCandidates(): SearchCandidate[] | Promise<SearchCandidate[]>;
  everythingSearch?(query: string, limit: number, signal?: AbortSignal): Promise<SearchCandidate[]>;
  windowsSearch?(query: string, limit: number, signal?: AbortSignal): Promise<SearchCandidate[]>;
}

export interface SearchOptions {
  limit?: number;
  signal?: AbortSignal;
}

interface SearchQuery {
  extension: string | null;
  origin: SearchOrigin | null;
  keywords: string[];
}

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

const BOOST_DESKTOP = 1.0;
const BOOST_PORTAL = 0.9;
const BOOST_EVERYTHING = 0.7;
const BOOST_WINDOWS_SEARCH = 0.5;

export class SearchService {
  constructor(private readonly providers: SearchProviders) {}

  async search(rawQuery: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const query = parseQuery(rawQuery);
    const limit = normalizeLimit(options.limit);

    if (query.origin && query.origin !== "everything" && query.origin !== "windows-search") {
      return this.localSearch(query, limit);
    }

    let results: SearchResult[] = [];
    const externalQuery = buildExternalQuery(query);

    if ((!query.origin || query.origin === "everything") && this.providers.everythingSearch) {
      const candidates = await this.providers.everythingSearch(externalQuery, limit, options.signal);
      results.push(...scoreExternalResults(candidates, "everything", BOOST_EVERYTHING, query));
    }

    if ((!query.origin || query.origin === "windows-search") && this.providers.windowsSearch) {
      const candidates = await this.providers.windowsSearch(externalQuery, limit, options.signal);
      results.push(...scoreExternalResults(candidates, "windows-search", BOOST_WINDOWS_SEARCH, query));
    }

    if (!query.origin) results.push(...await this.localCandidates(query, limit));

    return deduplicateSorted(results.sort(compareResults)).slice(0, limit);
  }

  private async localSearch(query: SearchQuery, limit: number): Promise<SearchResult[]> {
    const candidates = await this.localCandidates(query, limit);
    return candidates.slice(0, limit);
  }

  private async localCandidates(query: SearchQuery, limit: number): Promise<SearchResult[]> {
    const sources = await Promise.all([
      query.origin === "portal" ? [] : this.providers.getDesktopCandidates(),
      query.origin === "desktop" ? [] : this.providers.getPortalCandidates()
    ]);

    const all: SearchResult[] = [
      ...sources[0].map((c) => ({ ...c, origin: "desktop" as const, score: 0, providerScore: 0 })),
      ...sources[1].map((c) => ({ ...c, origin: "portal" as const, score: 0, providerScore: 0 }))
    ];

    return all
      .map((c) => scoreCandidate(c, query))
      .filter((r): r is SearchResult => r !== null)
      .sort(compareResults)
      .slice(0, limit);
  }
}

function scoreExternalResults(candidates: SearchCandidate[], origin: SearchOrigin, providerScore: number, query: SearchQuery): SearchResult[] {
  return candidates
    .map((candidate) => scoreCandidate({ ...candidate, origin, score: 0, providerScore }, query))
    .filter((result): result is SearchResult => result !== null);
}

function deduplicateSorted(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.fullPath.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildExternalQuery(query: SearchQuery): string {
  const parts: string[] = [];
  if (query.extension) parts.push(`ext:${query.extension}`);
  parts.push(...query.keywords);
  return parts.join(" ").trim();
}

function parseQuery(rawQuery: string): SearchQuery {
  let extension: string | null = null;
  let origin: SearchOrigin | null = null;
  const keywords: string[] = [];

  for (const token of rawQuery.trim().toLocaleLowerCase().split(/\s+/)) {
    if (!token) continue;
    const prefix = token.slice(0, 3);
    if (prefix === "in:") {
      const src = token.slice(3);
      if (src === "desktop" || src === "portal" || src === "everything" || src === "windows-search" || src === "all") {
        origin = src === "all" ? null : (src as SearchOrigin);
      }
      continue;
    }

    const extensionValue = token.startsWith("ext:") ? token.slice(4) : token.startsWith(".") ? token : "";
    if (extensionValue && /^\.[a-z0-9]+$/i.test(extensionValue)) {
      extension = extensionValue;
      continue;
    }

    keywords.push(token);
  }

  return { extension, origin, keywords };
}

function scoreCandidate(candidate: SearchResult, query: SearchQuery): SearchResult | null {
  if (!query.keywords.length && !query.extension) return candidate;

  const title = candidate.title.toLocaleLowerCase();
  const fullPath = candidate.fullPath.toLocaleLowerCase();
  const extension = getExtension(candidate.title, candidate.fullPath);

  if (query.extension && extension !== query.extension) return null;

  let score = candidate.score;
  if (candidate.origin === "desktop") candidate.providerScore = BOOST_DESKTOP;
  if (candidate.origin === "portal") candidate.providerScore = BOOST_PORTAL;

  for (const keyword of query.keywords) {
    if (title === keyword) {
      score += 1_000;
    } else if (title.startsWith(keyword)) {
      score += 800;
    } else if (title.includes(keyword)) {
      score += 600;
    } else if (fullPath.includes(keyword)) {
      score += 300;
    } else {
      return null;
    }
  }

  return { ...candidate, score };
}

function getExtension(title: string, fullPath: string): string {
  const basename = title || fullPath.replace(/^.*[\\/]/, "");
  const index = basename.lastIndexOf(".");
  return index > 0 ? basename.slice(index).toLocaleLowerCase() : "";
}

function compareResults(left: SearchResult, right: SearchResult): number {
  if (right.score !== left.score) return right.score - left.score;

  const modifiedDifference = Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt);
  if (!Number.isNaN(modifiedDifference) && modifiedDifference !== 0) return modifiedDifference;

  if (right.providerScore !== left.providerScore) return right.providerScore - left.providerScore;

  return left.title.localeCompare(right.title, undefined, { sensitivity: "base" })
    || left.fullPath.localeCompare(right.fullPath, undefined, { sensitivity: "base" });
}

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.floor(limit as number), 1), MAX_LIMIT);
}

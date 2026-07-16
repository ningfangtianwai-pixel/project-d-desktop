import { randomUUID } from "node:crypto";
import type { SearchResult } from "./search-service.js";

export type SearchResultTarget =
  | { origin: "desktop"; fileId: number }
  | { origin: "portal"; portalId: string; relativePath: string }
  | { origin: "external"; provider: "everything" | "windows-search"; fullPath: string };

interface RegisteredTarget {
  target: SearchResultTarget;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 500;

/** Keeps renderer-visible search IDs opaque, short-lived, and main-process owned. */
export class SearchResultRegistry {
  private readonly entries = new Map<string, RegisteredTarget>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly ttlMs = DEFAULT_TTL_MS,
    private readonly maxEntries = DEFAULT_MAX_ENTRIES
  ) {}

  register(result: Pick<SearchResult, "id" | "origin" | "fullPath">): string {
    const target = parseTarget(result);
    this.prune();
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (!oldest) break;
      this.entries.delete(oldest);
    }

    const handle = `search:${randomUUID()}`;
    this.entries.set(handle, { target, expiresAt: this.now() + this.ttlMs });
    return handle;
  }

  resolve(handle: string): SearchResultTarget {
    this.prune();
    const registered = this.entries.get(handle);
    if (!registered) {
      throw new Error("Search result is invalid or has expired");
    }
    return registered.target;
  }

  private prune(): void {
    const now = this.now();
    for (const [handle, registered] of this.entries) {
      if (registered.expiresAt <= now) this.entries.delete(handle);
    }
  }
}

function parseTarget(result: Pick<SearchResult, "id" | "origin" | "fullPath">): SearchResultTarget {
  if (result.origin === "desktop") {
    const match = /^desktop:(\d+)$/.exec(result.id);
    const fileId = match ? Number(match[1]) : Number.NaN;
    if (!Number.isInteger(fileId) || fileId <= 0) throw new Error("Invalid desktop search candidate");
    return { origin: "desktop", fileId };
  }

  if (result.origin === "portal") {
    const match = /^portal:([^:]+):(.+)$/.exec(result.id);
    if (!match) throw new Error("Invalid portal search candidate");
    return { origin: "portal", portalId: match[1], relativePath: match[2] };
  }

  if (!result.fullPath || result.fullPath.includes("\0")) throw new Error("Invalid external search candidate");
  return { origin: "external", provider: result.origin, fullPath: result.fullPath };
}

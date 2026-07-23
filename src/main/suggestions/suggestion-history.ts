import type { SuggestionSuppressionHistoryEntry } from "../../shared/types.js";

export const SUGGESTION_SUPPRESSION_HISTORY_LIMIT = 20;

export function parseSuggestionSuppressionHistory(
  raw: string | null | undefined,
  limit = SUGGESTION_SUPPRESSION_HISTORY_LIMIT
): SuggestionSuppressionHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeEntry)
      .filter((entry): entry is SuggestionSuppressionHistoryEntry => entry !== null)
      .slice(-Math.max(1, limit));
  } catch {
    return [];
  }
}

export function appendSuggestionSuppressionHistory(
  history: readonly SuggestionSuppressionHistoryEntry[],
  entry: SuggestionSuppressionHistoryEntry,
  limit = SUGGESTION_SUPPRESSION_HISTORY_LIMIT
): SuggestionSuppressionHistoryEntry[] {
  const normalized = normalizeEntry(entry);
  if (!normalized) return history.slice(-Math.max(1, limit));
  return [...history, normalized].slice(-Math.max(1, limit));
}

function normalizeEntry(value: unknown): SuggestionSuppressionHistoryEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<SuggestionSuppressionHistoryEntry>;
  if (
    typeof entry.reason !== "string"
    || entry.reason.length < 1
    || entry.reason.length > 80
    || typeof entry.explanation !== "string"
    || entry.explanation.length < 1
    || entry.explanation.length > 500
    || typeof entry.suppressedAt !== "string"
    || !Number.isFinite(Date.parse(entry.suppressedAt))
  ) return null;
  return {
    reason: entry.reason,
    explanation: entry.explanation,
    suppressedAt: new Date(entry.suppressedAt).toISOString()
  };
}

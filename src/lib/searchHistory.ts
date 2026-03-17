export const SEARCH_HISTORY_STORAGE_KEY = 'message-search.search-history.v1';
export const SEARCH_HISTORY_MAX_ENTRIES = 50;
export const SEARCH_HISTORY_UPDATED_EVENT = 'message-search:history-updated';

function emitSearchHistoryUpdated(entries: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<string[]>(SEARCH_HISTORY_UPDATED_EVENT, {
      detail: entries,
    }),
  );
}

function normalizeSearchHistoryQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

function resolveMaxEntries(maxEntries: number): number {
  if (!Number.isFinite(maxEntries)) {
    return SEARCH_HISTORY_MAX_ENTRIES;
  }

  return Math.max(1, Math.floor(maxEntries));
}

function dedupeHistoryEntries(entries: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  entries.forEach((entry) => {
    const normalizedEntry = normalizeSearchHistoryQuery(entry);
    if (!normalizedEntry) {
      return;
    }

    const dedupeKey = normalizedEntry.toLowerCase();
    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    deduped.push(normalizedEntry);
  });

  return deduped;
}

export function sanitizeSearchHistory(entries: unknown, maxEntries = SEARCH_HISTORY_MAX_ENTRIES): string[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  const sanitizedEntries = entries.filter((entry): entry is string => typeof entry === 'string');
  return dedupeHistoryEntries(sanitizedEntries).slice(0, resolveMaxEntries(maxEntries));
}

export function readSearchHistory(maxEntries = SEARCH_HISTORY_MAX_ENTRIES): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    return sanitizeSearchHistory(parsedValue, maxEntries);
  } catch {
    return [];
  }
}

export function writeSearchHistory(entries: readonly string[], maxEntries = SEARCH_HISTORY_MAX_ENTRIES): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const normalizedEntries = sanitizeSearchHistory([...entries], maxEntries);
    if (normalizedEntries.length === 0) {
      window.localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
      emitSearchHistoryUpdated([]);
      return true;
    }

    window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(normalizedEntries));
    emitSearchHistoryUpdated(normalizedEntries);
    return true;
  } catch {
    return false;
  }
}

export function clearSearchHistory(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
    emitSearchHistoryUpdated([]);
    return true;
  } catch {
    return false;
  }
}

export function addSearchHistoryEntry(
  entries: readonly string[],
  query: string,
  maxEntries = SEARCH_HISTORY_MAX_ENTRIES,
): string[] {
  const normalizedQuery = normalizeSearchHistoryQuery(query);
  if (!normalizedQuery) {
    return sanitizeSearchHistory([...entries], maxEntries);
  }

  const dedupeKey = normalizedQuery.toLowerCase();
  const remainingEntries = sanitizeSearchHistory([...entries], Number.MAX_SAFE_INTEGER)
    .filter((entry) => entry.toLowerCase() !== dedupeKey);

  return [normalizedQuery, ...remainingEntries].slice(0, resolveMaxEntries(maxEntries));
}

export function removeSearchHistoryEntry(
  entries: readonly string[],
  query: string,
  maxEntries = SEARCH_HISTORY_MAX_ENTRIES,
): string[] {
  const normalizedQuery = normalizeSearchHistoryQuery(query);
  if (!normalizedQuery) {
    return sanitizeSearchHistory([...entries], maxEntries);
  }

  const dedupeKey = normalizedQuery.toLowerCase();
  const remainingEntries = sanitizeSearchHistory([...entries], Number.MAX_SAFE_INTEGER)
    .filter((entry) => entry.toLowerCase() !== dedupeKey);

  return remainingEntries.slice(0, resolveMaxEntries(maxEntries));
}

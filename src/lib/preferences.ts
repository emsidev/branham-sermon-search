export const INSTANT_SEARCH_STORAGE_KEY = 'message-search.instant-search-enabled';

export function getInstantSearchEnabled(defaultValue = true): boolean {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const rawValue = window.localStorage.getItem(INSTANT_SEARCH_STORAGE_KEY);
    if (rawValue == null) {
      return defaultValue;
    }

    return rawValue !== 'false';
  } catch {
    return defaultValue;
  }
}

export function setInstantSearchEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(INSTANT_SEARCH_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage write failures (private mode / blocked storage).
  }
}

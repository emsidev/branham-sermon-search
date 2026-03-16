export const INSTANT_SEARCH_STORAGE_KEY = 'message-search.instant-search-enabled';
export const HIT_SMOOTH_SCROLL_STORAGE_KEY = 'message-search.hit-smooth-scroll-enabled';
export const THEME_STORAGE_KEY = 'message-search.theme';

function readStoredBooleanPreference(storageKey: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (rawValue == null) {
      return defaultValue;
    }

    if (rawValue === 'true') {
      return true;
    }

    if (rawValue === 'false') {
      return false;
    }

    return defaultValue;
  } catch {
    return defaultValue;
  }
}

function writeStoredBooleanPreference(storageKey: string, enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, String(enabled));
  } catch {
    // Ignore storage write failures (private mode / blocked storage).
  }
}

export function getInstantSearchEnabled(defaultValue = true): boolean {
  return readStoredBooleanPreference(INSTANT_SEARCH_STORAGE_KEY, defaultValue);
}

export function setInstantSearchEnabled(enabled: boolean): void {
  writeStoredBooleanPreference(INSTANT_SEARCH_STORAGE_KEY, enabled);
}

export function getHitSmoothScrollEnabled(defaultValue = true): boolean {
  return readStoredBooleanPreference(HIT_SMOOTH_SCROLL_STORAGE_KEY, defaultValue);
}

export function setHitSmoothScrollEnabled(enabled: boolean): void {
  writeStoredBooleanPreference(HIT_SMOOTH_SCROLL_STORAGE_KEY, enabled);
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function getEffectiveHitScrollBehavior(defaultSmoothScrollEnabled = true): ScrollBehavior {
  if (!getHitSmoothScrollEnabled(defaultSmoothScrollEnabled)) {
    return 'auto';
  }

  if (prefersReducedMotion()) {
    return 'auto';
  }

  return 'smooth';
}

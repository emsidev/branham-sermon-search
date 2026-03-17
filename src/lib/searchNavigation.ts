export interface HomeSearchTransitionState {
  source: 'home';
  autofocus: true;
  requestId: string;
  caret?: number;
}

export interface ShortcutSearchTransitionState {
  source: 'shortcut';
  autofocus: true;
  requestId: string;
}

export type SearchAutofocusTransitionState = HomeSearchTransitionState | ShortcutSearchTransitionState;

export interface SearchReturnState {
  searchReturnTo: string;
}

export interface SearchUrlOptions {
  matchCase?: boolean;
  wholeWord?: boolean;
  fuzzy?: boolean;
}

const SEARCH_RETURN_PATH_RE = /^\/search(?:[?#].*)?$/;

function normalizeSearchReturnPath(value: string): string | null {
  const trimmed = value.trim();
  if (!SEARCH_RETURN_PATH_RE.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function isHomeSearchTransitionState(value: unknown): value is HomeSearchTransitionState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const hasValidCaret = candidate.caret === undefined
    || (typeof candidate.caret === 'number' && Number.isFinite(candidate.caret));

  return candidate.source === 'home'
    && candidate.autofocus === true
    && typeof candidate.requestId === 'string'
    && hasValidCaret;
}

export function isSearchAutofocusTransitionState(value: unknown): value is SearchAutofocusTransitionState {
  if (isHomeSearchTransitionState(value)) {
    return true;
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.source === 'shortcut'
    && candidate.autofocus === true
    && typeof candidate.requestId === 'string';
}

export function createShortcutSearchTransitionState(requestId: string): ShortcutSearchTransitionState {
  return {
    source: 'shortcut',
    autofocus: true,
    requestId,
  };
}

export function createSearchReturnState(searchReturnTo: string): SearchReturnState | null {
  const normalizedPath = normalizeSearchReturnPath(searchReturnTo);
  if (!normalizedPath) {
    return null;
  }

  return {
    searchReturnTo: normalizedPath,
  };
}

export function readSearchReturnTo(state: unknown): string | null {
  if (!state || typeof state !== 'object') {
    return null;
  }

  const candidate = state as Record<string, unknown>;
  if (typeof candidate.searchReturnTo !== 'string') {
    return null;
  }

  return normalizeSearchReturnPath(candidate.searchReturnTo);
}

export function buildSearchHrefFromQuery(query: string, options?: SearchUrlOptions): string {
  const trimmedQuery = query.trim();
  const matchCase = options?.matchCase;
  const wholeWord = options?.wholeWord;
  const fuzzy = options?.fuzzy;

  if (!trimmedQuery && matchCase === undefined && wholeWord === undefined && fuzzy !== true) {
    return '/search';
  }

  const params = new URLSearchParams();
  if (trimmedQuery) {
    params.set('q', trimmedQuery);
  }
  if (fuzzy === true) {
    params.set('fuzzy', '1');
  } else {
    if (matchCase === true) {
      params.set('matchCase', '1');
    }
    if (wholeWord === true) {
      params.set('wholeWord', '1');
    } else if (wholeWord === false) {
      params.set('wholeWord', '0');
    }
  }

  return `/search?${params.toString()}`;
}

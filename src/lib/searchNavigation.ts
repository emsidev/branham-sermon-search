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

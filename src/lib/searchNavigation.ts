export interface HomeSearchTransitionState {
  source: 'home';
  autofocus: true;
  requestId: string;
  caret?: number;
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

export const SHORTCUT_ACTIONS = [
  'focus_search',
  'open_books',
  'open_settings',
  'result_next',
  'result_prev',
] as const;

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];

export type ShortcutBindings = Record<ShortcutAction, string>;

export type ShortcutSyncStatus = 'synced' | 'local_fallback';

export interface ShortcutDefinition {
  action: ShortcutAction;
  label: string;
  description: string;
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    action: 'focus_search',
    label: 'Focus search',
    description: 'Focuses the search box from anywhere.',
  },
  {
    action: 'open_books',
    label: 'Open books',
    description: 'Navigates directly to the books page.',
  },
  {
    action: 'open_settings',
    label: 'Open settings',
    description: 'Navigates directly to the settings page.',
  },
  {
    action: 'result_next',
    label: 'Next result',
    description: 'Moves selection down in search results.',
  },
  {
    action: 'result_prev',
    label: 'Previous result',
    description: 'Moves selection up in search results.',
  },
];

export const SHORTCUT_DEFAULT_BINDINGS: ShortcutBindings = {
  focus_search: '/',
  open_books: 'b',
  open_settings: ',',
  result_next: 'j',
  result_prev: 'k',
};

const RESERVED_SHORTCUT_KEYS = new Set(['enter', 'escape', 'tab']);

export function isShortcutAction(value: string): value is ShortcutAction {
  return (SHORTCUT_ACTIONS as readonly string[]).includes(value);
}

export function getShortcutDefinition(action: ShortcutAction): ShortcutDefinition {
  return SHORTCUT_DEFINITIONS.find((definition) => definition.action === action) ?? {
    action,
    label: action,
    description: '',
  };
}

export function formatShortcutKey(key: string): string {
  if (key === ' ') {
    return 'Space';
  }

  if (key.length === 1 && /[a-z]/.test(key)) {
    return key.toLowerCase();
  }

  return key;
}

export function normalizeShortcutKey(rawKey: string): string | null {
  const key = rawKey.trim();
  if (!key || key.length !== 1) {
    return null;
  }

  if (/\s/.test(key)) {
    return null;
  }

  return key.toLowerCase();
}

export function validateShortcutKey(rawKey: string): { key: string | null; error: string | null } {
  const normalized = normalizeShortcutKey(rawKey);
  if (!normalized) {
    return {
      key: null,
      error: 'Use a single printable key.',
    };
  }

  if (RESERVED_SHORTCUT_KEYS.has(normalized)) {
    return {
      key: null,
      error: 'This key is reserved.',
    };
  }

  return {
    key: normalized,
    error: null,
  };
}

export function findShortcutConflict(
  bindings: ShortcutBindings,
  action: ShortcutAction,
  key: string
): ShortcutAction | null {
  return SHORTCUT_ACTIONS.find((candidateAction) => (
    candidateAction !== action && bindings[candidateAction] === key
  )) ?? null;
}

export function coerceShortcutBindings(
  candidate: Partial<Record<ShortcutAction, string>>
): ShortcutBindings {
  const coerced = {} as ShortcutBindings;
  const usedKeys = new Set<string>();
  const defaultKeys = Object.values(SHORTCUT_DEFAULT_BINDINGS);

  for (const action of SHORTCUT_ACTIONS) {
    const preferredKey = candidate[action];
    const normalizedPreferred = preferredKey ? normalizeShortcutKey(preferredKey) : null;

    if (normalizedPreferred && !RESERVED_SHORTCUT_KEYS.has(normalizedPreferred) && !usedKeys.has(normalizedPreferred)) {
      coerced[action] = normalizedPreferred;
      usedKeys.add(normalizedPreferred);
      continue;
    }

    const defaultKey = SHORTCUT_DEFAULT_BINDINGS[action];
    if (!usedKeys.has(defaultKey)) {
      coerced[action] = defaultKey;
      usedKeys.add(defaultKey);
      continue;
    }

    const fallbackKey = defaultKeys.find((key) => !usedKeys.has(key)) ?? defaultKey;
    coerced[action] = fallbackKey;
    usedKeys.add(fallbackKey);
  }

  return coerced;
}

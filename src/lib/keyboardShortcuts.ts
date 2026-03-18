export const SHORTCUT_ACTIONS = [
  'focus_search',
  'open_books',
  'open_settings',
  'result_next',
  'result_prev',
  'toggle_reading_mode',
  'cycle_highlight_mode',
  'reader_extend_selection',
  'reader_shrink_selection',
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
    label: 'Next/previous hit',
    description: 'Moves between hits in the current sermon (hold Shift for previous).',
  },
  {
    action: 'result_prev',
    label: 'Next/previous sermon hit',
    description: 'Jumps to the first hit in adjacent sermons (hold Shift for previous sermon).',
  },
  {
    action: 'toggle_reading_mode',
    label: 'Toggle reading mode',
    description: 'Enters or exits focused reading mode in sermon detail.',
  },
  {
    action: 'cycle_highlight_mode',
    label: 'Cycle highlight mode',
    description: 'Cycles reader highlight mode between word, sentence, and paragraph.',
  },
  {
    action: 'reader_extend_selection',
    label: 'Reader extend selection',
    description: 'Extends reader highlight selection by the active unit. Legacy aliases: Right Arrow and Space.',
  },
  {
    action: 'reader_shrink_selection',
    label: 'Reader shrink selection',
    description: 'Shrinks reader highlight selection by the active unit. Legacy aliases: Left Arrow and Shift+Space.',
  },
];

export const SHORTCUT_DEFAULT_BINDINGS: ShortcutBindings = {
  focus_search: '/',
  open_books: 'b',
  open_settings: ',',
  result_next: 'n',
  result_prev: 'm',
  toggle_reading_mode: 'r',
  cycle_highlight_mode: 'h',
  reader_extend_selection: 'ArrowRight',
  reader_shrink_selection: 'ArrowLeft',
};

const RESERVED_SHORTCUT_KEYS = new Set(['enter', 'escape', 'tab']);
const REMOVED_SHORTCUT_KEYS = new Set(['j', 'k']);
const NAMED_SHORTCUT_KEYS: Record<string, 'ArrowRight' | 'ArrowLeft' | 'Space'> = {
  arrowright: 'ArrowRight',
  right: 'ArrowRight',
  arrowleft: 'ArrowLeft',
  left: 'ArrowLeft',
  space: 'Space',
  spacebar: 'Space',
};
const ACTIONS_ALLOWING_NAMED_KEYS = new Set<ShortcutAction>([
  'reader_extend_selection',
  'reader_shrink_selection',
]);

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
  if (key === ' ' || key === 'Space') {
    return 'Space';
  }

  if (key === 'ArrowRight') {
    return 'Right';
  }

  if (key === 'ArrowLeft') {
    return 'Left';
  }

  if (key.length === 1 && /[a-z]/.test(key)) {
    return key.toLowerCase();
  }

  return key;
}

export function normalizeShortcutKey(rawKey: string): string | null {
  if (rawKey === ' ') {
    return 'Space';
  }

  const key = rawKey.trim();
  if (!key) {
    return null;
  }

  if (key.length === 1) {
    if (/\s/.test(key)) {
      return null;
    }

    return key.toLowerCase();
  }

  const normalizedNamedKey = NAMED_SHORTCUT_KEYS[key.toLowerCase()];
  if (normalizedNamedKey) {
    return normalizedNamedKey;
  }

  return null;
}

export function validateShortcutKey(
  rawKey: string,
  action?: ShortcutAction,
): { key: string | null; error: string | null } {
  const normalized = normalizeShortcutKey(rawKey);
  if (!normalized) {
    return {
      key: null,
      error: 'Use a single printable key.',
    };
  }

  const loweredKey = normalized.toLowerCase();
  if (RESERVED_SHORTCUT_KEYS.has(loweredKey)) {
    return {
      key: null,
      error: 'This key is reserved.',
    };
  }

  if (REMOVED_SHORTCUT_KEYS.has(loweredKey)) {
    return {
      key: null,
      error: `"${formatShortcutKey(loweredKey)}" is no longer supported.`,
    };
  }

  const isNamedKey = normalized.length > 1;
  if (isNamedKey && (!action || !ACTIONS_ALLOWING_NAMED_KEYS.has(action))) {
    return {
      key: null,
      error: 'Use a single printable key.',
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
    const normalizedPreferred = preferredKey
      ? validateShortcutKey(preferredKey, action).key
      : null;

    if (
      normalizedPreferred
      && !usedKeys.has(normalizedPreferred)
    ) {
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

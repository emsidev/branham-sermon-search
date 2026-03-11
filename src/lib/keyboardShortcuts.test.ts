import { describe, expect, it } from 'vitest';
import {
  SHORTCUT_DEFAULT_BINDINGS,
  coerceShortcutBindings,
  findShortcutConflict,
  normalizeShortcutKey,
  validateShortcutKey,
} from './keyboardShortcuts';

describe('keyboardShortcuts', () => {
  it('normalizes single-key bindings to lowercase', () => {
    expect(normalizeShortcutKey('B')).toBe('b');
    expect(normalizeShortcutKey('/')).toBe('/');
    expect(normalizeShortcutKey(',')).toBe(',');
  });

  it('rejects invalid shortcut keys', () => {
    expect(normalizeShortcutKey('Enter')).toBeNull();
    expect(normalizeShortcutKey('')).toBeNull();
    expect(normalizeShortcutKey('ab')).toBeNull();
  });

  it('returns a validation error for non-printable keys', () => {
    const result = validateShortcutKey('Enter');
    expect(result.key).toBeNull();
    expect(result.error).toBe('Use a single printable key.');
  });

  it('coerces partial and duplicate bindings into a unique set', () => {
    const coerced = coerceShortcutBindings({
      focus_search: 'B',
      open_books: 'b',
      open_settings: ',',
    });

    expect(Object.values(coerced)).toHaveLength(5);
    expect(new Set(Object.values(coerced)).size).toBe(5);
    expect(coerced.open_settings).toBe(',');
  });

  it('detects key conflicts between actions', () => {
    const conflict = findShortcutConflict(
      SHORTCUT_DEFAULT_BINDINGS,
      'open_books',
      '/'
    );

    expect(conflict).toBe('focus_search');
  });
});

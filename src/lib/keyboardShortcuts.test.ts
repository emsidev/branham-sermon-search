import { describe, expect, it } from 'vitest';
import {
  SHORTCUT_DEFAULT_BINDINGS,
  coerceShortcutBindings,
  findShortcutConflict,
  formatShortcutKey,
  normalizeShortcutKey,
  validateShortcutKey,
} from './keyboardShortcuts';

describe('keyboardShortcuts', () => {
  it('normalizes single-key bindings to lowercase', () => {
    expect(normalizeShortcutKey('B')).toBe('b');
    expect(normalizeShortcutKey('/')).toBe('/');
    expect(normalizeShortcutKey(',')).toBe(',');
    expect(normalizeShortcutKey('ArrowRight')).toBe('ArrowRight');
    expect(normalizeShortcutKey('ArrowLeft')).toBe('ArrowLeft');
    expect(normalizeShortcutKey('Space')).toBe('Space');
    expect(normalizeShortcutKey(' ')).toBe('Space');
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

  it('allows named keys only for reader selection actions', () => {
    expect(validateShortcutKey('ArrowRight', 'reader_extend_selection')).toEqual({
      key: 'ArrowRight',
      error: null,
    });
    expect(validateShortcutKey('ArrowLeft', 'reader_shrink_selection')).toEqual({
      key: 'ArrowLeft',
      error: null,
    });
    expect(validateShortcutKey('Space', 'reader_extend_selection')).toEqual({
      key: 'Space',
      error: null,
    });

    const invalidForGeneralAction = validateShortcutKey('ArrowRight', 'open_books');
    expect(invalidForGeneralAction.key).toBeNull();
    expect(invalidForGeneralAction.error).toBe('Use a single printable key.');
  });

  it('rejects removed legacy navigation keys', () => {
    const jResult = validateShortcutKey('j');
    expect(jResult.key).toBeNull();
    expect(jResult.error).toContain('no longer supported');

    const kResult = validateShortcutKey('k');
    expect(kResult.key).toBeNull();
    expect(kResult.error).toContain('no longer supported');
  });

  it('coerces partial and duplicate bindings into a unique set', () => {
    const coerced = coerceShortcutBindings({
      focus_search: 'B',
      open_books: 'b',
      open_settings: ',',
      reader_extend_selection: 'ArrowRight',
      reader_shrink_selection: 'ArrowLeft',
    });

    expect(Object.values(coerced)).toHaveLength(11);
    expect(new Set(Object.values(coerced)).size).toBe(11);
    expect(coerced.open_settings).toBe(',');
    expect(coerced.toggle_reading_mode).toBe('r');
    expect(coerced.toggle_slide_view).toBe('p');
    expect(coerced.add_slide_highlight).toBe('g');
    expect(coerced.cycle_highlight_mode).toBe('h');
    expect(coerced.reader_extend_selection).toBe('ArrowRight');
    expect(coerced.reader_shrink_selection).toBe('ArrowLeft');
  });

  it('detects key conflicts between actions', () => {
    const conflict = findShortcutConflict(
      SHORTCUT_DEFAULT_BINDINGS,
      'open_books',
      '/'
    );

    expect(conflict).toBe('focus_search');
  });

  it('formats named keys for display labels', () => {
    expect(formatShortcutKey('ArrowRight')).toBe('Right');
    expect(formatShortcutKey('ArrowLeft')).toBe('Left');
    expect(formatShortcutKey('Space')).toBe('Space');
  });
});

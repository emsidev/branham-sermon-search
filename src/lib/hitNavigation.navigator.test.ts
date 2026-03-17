import { describe, expect, it } from 'vitest';
import { createHitNavigator, resolveJumpToHitIndex } from './hitNavigation';

describe('createHitNavigator', () => {
  it('returns no active index for empty hit sets', () => {
    const navigator = createHitNavigator(0);

    expect(navigator.totalHits).toBe(0);
    expect(navigator.normalizeIndex(0)).toBe(-1);
    expect(navigator.getNextIndex(0)).toBe(-1);
    expect(navigator.getPrevIndex(0)).toBe(-1);
  });

  it('advances to next hit and wraps at end', () => {
    const navigator = createHitNavigator(3);

    expect(navigator.getNextIndex(-1)).toBe(0);
    expect(navigator.getNextIndex(0)).toBe(1);
    expect(navigator.getNextIndex(2)).toBe(0);
  });

  it('moves to previous hit and wraps at start', () => {
    const navigator = createHitNavigator(3);

    expect(navigator.getPrevIndex(-1)).toBe(2);
    expect(navigator.getPrevIndex(2)).toBe(1);
    expect(navigator.getPrevIndex(0)).toBe(2);
  });

  it('normalizes out-of-range indexes', () => {
    const navigator = createHitNavigator(4);

    expect(navigator.normalizeIndex(-5)).toBe(-1);
    expect(navigator.normalizeIndex(99)).toBe(3);
  });
});

describe('resolveJumpToHitIndex', () => {
  it('converts one-based input to zero-based index', () => {
    expect(resolveJumpToHitIndex('2', 5)).toBe(1);
  });

  it('clamps out-of-range values to first and last hits', () => {
    expect(resolveJumpToHitIndex('-10', 5)).toBe(0);
    expect(resolveJumpToHitIndex('99', 5)).toBe(4);
  });

  it('returns null for non-numeric or empty input', () => {
    expect(resolveJumpToHitIndex('', 5)).toBeNull();
    expect(resolveJumpToHitIndex('abc', 5)).toBeNull();
    expect(resolveJumpToHitIndex('2', 0)).toBeNull();
  });
});


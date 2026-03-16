import { beforeEach, describe, expect, it } from 'vitest';
import {
  HIT_SMOOTH_SCROLL_STORAGE_KEY,
  INSTANT_SEARCH_STORAGE_KEY,
  getEffectiveHitScrollBehavior,
  getHitSmoothScrollEnabled,
  getInstantSearchEnabled,
  setHitSmoothScrollEnabled,
  setInstantSearchEnabled,
} from './preferences';

function createMediaQueryList(matches: boolean, media: string): MediaQueryList {
  return {
    matches,
    media,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
}

describe('preferences', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      value: {
        getItem: (key: string) => (
          Object.prototype.hasOwnProperty.call(storage, key)
            ? storage[key]
            : null
        ),
        setItem: (key: string, value: string) => {
          storage[key] = String(value);
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
        clear: () => {
          storage = {};
        },
        key: (index: number) => Object.keys(storage)[index] ?? null,
        get length() {
          return Object.keys(storage).length;
        },
      } as Storage,
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => createMediaQueryList(false, query),
    });
  });

  it('reads and writes instant-search preference', () => {
    expect(getInstantSearchEnabled()).toBe(true);
    setInstantSearchEnabled(false);
    expect(window.localStorage.getItem(INSTANT_SEARCH_STORAGE_KEY)).toBe('false');
    expect(getInstantSearchEnabled()).toBe(false);
  });

  it('reads and writes smooth-hit-scroll preference', () => {
    expect(getHitSmoothScrollEnabled()).toBe(true);
    setHitSmoothScrollEnabled(false);
    expect(window.localStorage.getItem(HIT_SMOOTH_SCROLL_STORAGE_KEY)).toBe('false');
    expect(getHitSmoothScrollEnabled()).toBe(false);
  });

  it('falls back to default when smooth-hit-scroll storage value is invalid', () => {
    window.localStorage.setItem(HIT_SMOOTH_SCROLL_STORAGE_KEY, 'unexpected');
    expect(getHitSmoothScrollEnabled(true)).toBe(true);
    expect(getHitSmoothScrollEnabled(false)).toBe(false);
  });

  it('returns auto when smooth-hit-scroll preference is disabled', () => {
    window.localStorage.setItem(HIT_SMOOTH_SCROLL_STORAGE_KEY, 'false');
    expect(getEffectiveHitScrollBehavior()).toBe('auto');
  });

  it('returns auto when reduced motion is enabled', () => {
    window.localStorage.setItem(HIT_SMOOTH_SCROLL_STORAGE_KEY, 'true');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => createMediaQueryList(query.includes('prefers-reduced-motion'), query),
    });
    expect(getEffectiveHitScrollBehavior()).toBe('auto');
  });

  it('returns smooth when preference is enabled and reduced motion is off', () => {
    window.localStorage.setItem(HIT_SMOOTH_SCROLL_STORAGE_KEY, 'true');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => createMediaQueryList(false, query),
    });
    expect(getEffectiveHitScrollBehavior()).toBe('smooth');
  });
});

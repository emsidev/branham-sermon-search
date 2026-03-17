import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  SEARCH_HISTORY_MAX_ENTRIES,
  addSearchHistoryEntry,
  readSearchHistory,
  sanitizeSearchHistory,
  writeSearchHistory,
} from './searchHistory';

function createStorageMock(overrides: Partial<Storage> = {}): Storage {
  const data: Record<string, string> = {};

  return {
    getItem: (key: string) => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = String(value);
    },
    removeItem: (key: string) => {
      delete data[key];
    },
    clear: () => {
      Object.keys(data).forEach((key) => delete data[key]);
    },
    key: (index: number) => Object.keys(data)[index] ?? null,
    get length() {
      return Object.keys(data).length;
    },
    ...overrides,
  } as Storage;
}

describe('searchHistory', () => {
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      value: createStorageMock(),
    });
  });

  afterEach(() => {
    if (localStorageDescriptor) {
      Object.defineProperty(window, 'localStorage', localStorageDescriptor);
    }
  });

  it('sanitizes stored values and preserves order', () => {
    expect(sanitizeSearchHistory(['  The Token  ', '', 'the token', 'Seven Seals'])).toEqual([
      'The Token',
      'Seven Seals',
    ]);
  });

  it('writes and reads search history entries', () => {
    const writeResult = writeSearchHistory(['Leadership', 'Seven Seals']);
    expect(writeResult).toBe(true);
    expect(readSearchHistory()).toEqual(['Leadership', 'Seven Seals']);
  });

  it('deduplicates and prepends newest query when adding entries', () => {
    const nextEntries = addSearchHistoryEntry(['Token', 'Seven Seals', 'The Breach'], '  seven   seals ');
    expect(nextEntries).toEqual(['seven seals', 'Token', 'The Breach']);
  });

  it('caps history entries at max retention', () => {
    const seeded = Array.from({ length: SEARCH_HISTORY_MAX_ENTRIES + 10 }, (_, index) => `Query ${index}`);
    const result = sanitizeSearchHistory(seeded);
    expect(result).toHaveLength(SEARCH_HISTORY_MAX_ENTRIES);
  });

  it('returns an empty list when storage reads are blocked', () => {
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      value: createStorageMock({
        getItem: () => {
          throw new Error('Storage unavailable');
        },
      }),
    });

    expect(readSearchHistory()).toEqual([]);
  });

  it('returns false when storage writes are blocked', () => {
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      value: createStorageMock({
        setItem: () => {
          throw new Error('Storage unavailable');
        },
      }),
    });

    expect(writeSearchHistory(['Leadership'])).toBe(false);
  });
});

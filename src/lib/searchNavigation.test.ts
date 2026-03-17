import { describe, expect, it } from 'vitest';
import { buildSearchHrefFromQuery, createSearchReturnState, readSearchReturnTo } from './searchNavigation';

describe('searchNavigation', () => {
  it('builds fuzzy search URLs with canonical fuzzy=1 flag', () => {
    const href = buildSearchHrefFromQuery('only believ', {
      fuzzy: true,
      matchCase: true,
      wholeWord: true,
    });

    expect(href).toBe('/search?q=only+believ&fuzzy=1');
  });

  it('builds strict search URLs when fuzzy mode is disabled', () => {
    const href = buildSearchHrefFromQuery('Only Believe', {
      matchCase: true,
      wholeWord: true,
      fuzzy: false,
    });

    expect(href).toBe('/search?q=Only+Believe&matchCase=1&wholeWord=1');
  });

  it('returns /search when no query and no search mode flags are set', () => {
    expect(buildSearchHrefFromQuery('', {})).toBe('/search');
  });

  it('keeps fuzzy URL context even when query is empty', () => {
    expect(buildSearchHrefFromQuery('', { fuzzy: true })).toBe('/search?fuzzy=1');
  });

  it('creates and reads valid search return state', () => {
    const state = createSearchReturnState('/search?q=faith&fuzzy=1');

    expect(state).toEqual({ searchReturnTo: '/search?q=faith&fuzzy=1' });
    expect(readSearchReturnTo(state)).toBe('/search?q=faith&fuzzy=1');
  });
});

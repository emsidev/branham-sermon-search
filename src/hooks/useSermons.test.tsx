import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSermons } from './useSermons';

let currentParams = new URLSearchParams();
const setSearchParamsMock = vi.fn();

const getSearchMetaMock = vi.fn();
const listSermonsMock = vi.fn();
const searchSermonHitsMock = vi.fn();

function getLatestSearchParamsUpdater(): ((prev: URLSearchParams) => URLSearchParams) {
  const updater = setSearchParamsMock.mock.calls.at(-1)?.[0];
  if (typeof updater !== 'function') {
    throw new Error('Expected setSearchParams to be called with updater function.');
  }
  return updater as (prev: URLSearchParams) => URLSearchParams;
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [currentParams, setSearchParamsMock],
  };
});

vi.mock('@/data/dataPort', () => ({
  getDataPort: vi.fn(async () => ({
    getSearchMeta: (...args: unknown[]) => getSearchMetaMock(...args),
    listSermons: (...args: unknown[]) => listSermonsMock(...args),
    searchSermonHits: (...args: unknown[]) => searchSermonHitsMock(...args),
    getSermonDetail: vi.fn(),
    getAdjacentSermons: vi.fn(),
    getBoundarySermons: vi.fn(),
    getShortcutBindings: vi.fn(),
    saveShortcutBindings: vi.fn(),
  })),
}));

describe('useSermons', () => {
  beforeEach(() => {
    currentParams = new URLSearchParams();
    setSearchParamsMock.mockReset();
    getSearchMetaMock.mockReset();
    listSermonsMock.mockReset();
    searchSermonHitsMock.mockReset();

    getSearchMetaMock.mockResolvedValue({
      years: [1963],
      titles: ['God Hiding Himself'],
      locations: ['Phoenix, AZ'],
    });

    listSermonsMock.mockResolvedValue({
      rows: [
        {
          id: 'sermon-1',
          sermon_code: '63-0317M',
          title: 'God Hiding Himself',
          summary: null,
          date: '1963-03-17',
          year: 1963,
          location: 'Jeffersonville, IN',
          city: null,
          state: null,
          scripture: null,
          tags: [],
          text_content: '',
          created_at: '2026-03-09T00:00:00.000Z',
          updated_at: '2026-03-09T00:00:00.000Z',
        },
      ],
      total: 1,
    });

    searchSermonHitsMock.mockResolvedValue([]);
  });

  it('uses normal sermons query when q is empty', async () => {
    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isSearchMode).toBe(false);
    expect(searchSermonHitsMock).not.toHaveBeenCalled();
    expect(listSermonsMock).toHaveBeenCalledWith({
      year: null,
      title: null,
      location: null,
      limit: 25,
      offset: 0,
      sort: 'relevance-desc',
    });
    expect(result.current.sermons).toHaveLength(1);
  });

  it('uses search mode and total_count when q is present', async () => {
    currentParams = new URLSearchParams('q=they%20be%20healed%20unle');
    searchSermonHitsMock.mockResolvedValue([
      {
        hit_id: 'abc:para:1',
        sermon_id: 'abc',
        sermon_code: '54-0815',
        title: 'Questions And Answers',
        summary: null,
        date: '1954-08-15',
        location: 'Jeffersonville, IN',
        paragraph_number: 1,
        printed_paragraph_number: 2,
        chunk_index: 1,
        chunk_total: 3,
        match_source: 'paragraph_text',
        snippet: '... they be healed unless ...',
        relevance: 1.23,
        is_exact_match: false,
        tags: [],
        total_count: 42,
      },
    ]);

    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isSearchMode).toBe(true);
    expect(searchSermonHitsMock).toHaveBeenCalledTimes(1);
    expect(result.current.searchHits).toHaveLength(1);
    expect(result.current.total).toBe(42);
    expect(result.current.sermons).toHaveLength(0);
  });

  it('passes year, location, and page offset to search query', async () => {
    currentParams = new URLSearchParams('q=test&year=1963&title=God+Hiding+Himself&location=Phoenix%2C+AZ&page=2');

    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(searchSermonHitsMock).toHaveBeenCalledWith({
      query: 'test',
      year: 1963,
      title: 'God Hiding Himself',
      location: 'Phoenix, AZ',
      limit: 25,
      offset: 25,
      sort: 'relevance-desc',
      matchCase: false,
      wholeWord: true,
      fuzzy: false,
    });
  });

  it('parses fuzzy mode and disables strict flags in search payload', async () => {
    currentParams = new URLSearchParams('q=Only+Believ&fuzzy=1&matchCase=1&wholeWord=1');

    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.filters.fuzzy).toBe(true);
    expect(searchSermonHitsMock).toHaveBeenCalledWith({
      query: 'Only Believ',
      year: null,
      title: null,
      location: null,
      limit: 25,
      offset: 0,
      sort: 'relevance-desc',
      matchCase: false,
      wholeWord: false,
      fuzzy: true,
    });
  });

  it('applies structured filters on non-search query path', async () => {
    currentParams = new URLSearchParams('year=1963&title=God+Hiding+Himself&location=Jeffersonville%2C+IN');

    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isSearchMode).toBe(false);
    expect(listSermonsMock).toHaveBeenCalledWith({
      year: 1963,
      title: 'God Hiding Himself',
      location: 'Jeffersonville, IN',
      limit: 25,
      offset: 0,
      sort: 'relevance-desc',
    });
    expect(result.current.sermons).toHaveLength(1);
  });

  it('clearFilters removes only structured filters and page', async () => {
    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.clearFilters();
    const nextParams = getLatestSearchParamsUpdater()(
      new URLSearchParams('q=faith&year=1963&title=God+Hiding+Himself&location=Phoenix%2C+AZ&page=3&sort=date-desc&view=table&matchCase=1&wholeWord=0&fuzzy=1')
    );

    expect(nextParams.get('q')).toBe('faith');
    expect(nextParams.get('sort')).toBe('date-desc');
    expect(nextParams.get('view')).toBe('table');
    expect(nextParams.get('matchCase')).toBe('1');
    expect(nextParams.get('wholeWord')).toBe('0');
    expect(nextParams.get('fuzzy')).toBe('1');
    expect(nextParams.get('year')).toBeNull();
    expect(nextParams.get('title')).toBeNull();
    expect(nextParams.get('location')).toBeNull();
    expect(nextParams.get('page')).toBeNull();
  });
});


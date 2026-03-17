import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSermons } from './useSermons';

let currentParams = new URLSearchParams();
const setSearchParamsMock = vi.fn();

const rpcMock = vi.fn();
const fromMock = vi.fn();
let listQueryBuilder: ReturnType<typeof makeThenableBuilder> | null = null;

function makeThenableBuilder(result: unknown) {
  const promise = Promise.resolve(result);
  const builder = {
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return builder;
}

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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

describe('useSermons', () => {
  beforeEach(() => {
    currentParams = new URLSearchParams();
    setSearchParamsMock.mockReset();
    rpcMock.mockReset();
    fromMock.mockReset();
    listQueryBuilder = null;

    rpcMock.mockResolvedValue({ data: [], error: null });

    fromMock.mockImplementation((table: string) => {
      if (table !== 'sermons') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: (columns: string) => {
          if (columns === 'year') {
            return {
              order: vi.fn().mockResolvedValue({ data: [{ year: 1963 }], error: null }),
            };
          }

          if (columns === 'location') {
            return Promise.resolve({ data: [{ location: 'Phoenix, AZ' }], error: null });
          }

          if (columns === 'title') {
            return {
              order: vi.fn().mockResolvedValue({ data: [{ title: 'God Hiding Himself' }], error: null }),
            };
          }

          if (columns === '*') {
            listQueryBuilder = makeThenableBuilder({
              data: [
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
                  fts: null,
                  created_at: '2026-03-09T00:00:00.000Z',
                  updated_at: '2026-03-09T00:00:00.000Z',
                },
              ],
              count: 1,
              error: null,
            });
            return listQueryBuilder;
          }

          throw new Error(`Unexpected columns: ${columns}`);
        },
      };
    });
  });

  it('uses normal sermons query when q is empty', async () => {
    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isSearchMode).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(listQueryBuilder).not.toBeNull();
    expect(listQueryBuilder.range).toHaveBeenCalledWith(0, 24);
    expect(result.current.sermons).toHaveLength(1);
  });

  it('uses search RPC and total_count when q is present', async () => {
    currentParams = new URLSearchParams('q=they%20be%20healed%20unle');
    rpcMock.mockResolvedValue({
      data: [
        {
          hit_id: 'abc:para:1:chunk:1',
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
      ],
      error: null,
    });

    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isSearchMode).toBe(true);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(result.current.searchHits).toHaveLength(1);
    expect(result.current.total).toBe(42);
    expect(result.current.sermons).toHaveLength(0);
  });

  it('passes year, location, and page offset to search RPC', async () => {
    currentParams = new URLSearchParams('q=test&year=1963&title=God+Hiding+Himself&location=Phoenix%2C+AZ&page=2');
    rpcMock.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(rpcMock).toHaveBeenCalledWith('search_sermon_chunks', {
      p_query: 'test',
      p_year: 1963,
      p_title: 'God Hiding Himself',
      p_location: 'Phoenix, AZ',
      p_limit: 25,
      p_offset: 25,
      p_sort: 'relevance-desc',
      p_match_case: false,
      p_match_whole_word: true,
      p_enable_fuzzy: false,
    });
  });

  it('passes strict match flags to search RPC when enabled in URL params', async () => {
    currentParams = new URLSearchParams('q=Only+Believe&matchCase=1&wholeWord=1');
    rpcMock.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.filters.matchCase).toBe(true);
    expect(result.current.filters.wholeWord).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('search_sermon_chunks', {
      p_query: 'Only Believe',
      p_year: null,
      p_title: null,
      p_location: null,
      p_limit: 25,
      p_offset: 0,
      p_sort: 'relevance-desc',
      p_match_case: true,
      p_match_whole_word: true,
      p_enable_fuzzy: false,
    });
  });

  it('parses fuzzy mode and forces strict flags off in search RPC payload', async () => {
    currentParams = new URLSearchParams('q=Only+Believ&fuzzy=1&matchCase=1&wholeWord=1');
    rpcMock.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.filters.fuzzy).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('search_sermon_chunks', {
      p_query: 'Only Believ',
      p_year: null,
      p_title: null,
      p_location: null,
      p_limit: 25,
      p_offset: 0,
      p_sort: 'relevance-desc',
      p_match_case: false,
      p_match_whole_word: false,
      p_enable_fuzzy: true,
    });
  });

  it('updates year, title, and location query params via setFilter', async () => {
    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.setFilter('year', '1963');
    let nextParams = getLatestSearchParamsUpdater()(new URLSearchParams('q=faith&page=3'));
    expect(nextParams.get('year')).toBe('1963');
    expect(nextParams.get('page')).toBeNull();

    result.current.setFilter('title', 'God Hiding Himself');
    nextParams = getLatestSearchParamsUpdater()(new URLSearchParams('q=faith&page=4'));
    expect(nextParams.get('title')).toBe('God Hiding Himself');
    expect(nextParams.get('page')).toBeNull();

    result.current.setFilter('location', 'Phoenix, AZ');
    nextParams = getLatestSearchParamsUpdater()(new URLSearchParams('q=faith&page=5'));
    expect(nextParams.get('location')).toBe('Phoenix, AZ');
    expect(nextParams.get('page')).toBeNull();

    result.current.setFilter('fuzzy', true);
    nextParams = getLatestSearchParamsUpdater()(new URLSearchParams('q=faith&page=6'));
    expect(nextParams.get('fuzzy')).toBe('1');
    expect(nextParams.get('page')).toBeNull();
  });

  it('applies atomic fuzzy-on patch that clears strict params in one URL update', async () => {
    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.setFilters({ fuzzy: true });
    const nextParams = getLatestSearchParamsUpdater()(
      new URLSearchParams('q=faith&matchCase=1&wholeWord=1&page=4')
    );

    expect(nextParams.get('fuzzy')).toBe('1');
    expect(nextParams.get('matchCase')).toBeNull();
    expect(nextParams.get('wholeWord')).toBe('0');
    expect(nextParams.get('page')).toBeNull();
  });

  it('restores whole-word default when fuzzy is turned off with no strict mode active', async () => {
    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.setFilters({ fuzzy: false });
    const nextParams = getLatestSearchParamsUpdater()(
      new URLSearchParams('q=faith&fuzzy=1&wholeWord=0&page=2')
    );

    expect(nextParams.get('fuzzy')).toBeNull();
    expect(nextParams.get('matchCase')).toBeNull();
    expect(nextParams.get('wholeWord')).toBe('1');
    expect(nextParams.get('page')).toBeNull();
  });

  it('passes keyword and all structured filters together to search RPC', async () => {
    currentParams = new URLSearchParams('q=test&year=1963&title=God+Hiding+Himself&location=Phoenix%2C+AZ');
    rpcMock.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(rpcMock).toHaveBeenCalledWith('search_sermon_chunks', {
      p_query: 'test',
      p_year: 1963,
      p_title: 'God Hiding Himself',
      p_location: 'Phoenix, AZ',
      p_limit: 25,
      p_offset: 0,
      p_sort: 'relevance-desc',
      p_match_case: false,
      p_match_whole_word: true,
      p_enable_fuzzy: false,
    });
  });

  it('applies structured filters on non-search query path', async () => {
    currentParams = new URLSearchParams('year=1963&title=God+Hiding+Himself&location=Jeffersonville%2C+IN');

    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isSearchMode).toBe(false);
    expect(listQueryBuilder).not.toBeNull();
    expect(listQueryBuilder?.eq).toHaveBeenCalledWith('year', 1963);
    expect(listQueryBuilder?.eq).toHaveBeenCalledWith('title', 'God Hiding Himself');
    expect(listQueryBuilder?.eq).toHaveBeenCalledWith('location', 'Jeffersonville, IN');
    expect(result.current.sermons).toHaveLength(1);
  });

  it('handles search RPC error path gracefully', async () => {
    currentParams = new URLSearchParams('q=test&year=1963&title=God+Hiding+Himself&location=Phoenix%2C+AZ');
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'rpc failure' },
    });

    const { result } = renderHook(() => useSermons());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.searchHits).toEqual([]);
    expect(result.current.sermons).toEqual([]);
    expect(result.current.total).toBe(0);
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

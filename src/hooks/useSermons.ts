import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDataPort } from '@/data/dataPort';
import type {
  AdjacentSermonRecord,
  SearchHitRecord,
  SermonDetailRecord,
  SermonParagraphRecord,
  SermonRecord,
} from '@/data/contracts';

export type Sermon = SermonRecord;
export type SearchHit = SearchHitRecord;
export type SermonParagraph = SermonParagraphRecord;

export type SermonDetail = SermonDetailRecord;

interface UseSermonFilters {
  q: string;
  year: string;
  title: string;
  location: string;
  page: number;
  sort: 'relevance-desc' | 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';
  view: 'card' | 'table';
  matchCase: boolean;
  wholeWord: boolean;
  fuzzy: boolean;
}

interface UseSermonsResult {
  sermons: Sermon[];
  searchHits: SearchHit[];
  isSearchMode: boolean;
  total: number;
  loading: boolean;
  filters: UseSermonFilters;
  setFilters: (patch: Partial<UseSermonFilters>) => void;
  setFilter: (key: keyof UseSermonFilters, value: string | number | boolean) => void;
  clearFilters: () => void;
  years: number[];
  titles: string[];
  locations: string[];
  pageSize: number;
}

const PAGE_SIZE = 25;

function parseWholeWordParam(rawValue: string | null): boolean {
  if (rawValue == null) {
    return true;
  }

  return rawValue === '1';
}

export function useSermons(): UseSermonsResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<number[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const filters: UseSermonFilters = useMemo(() => ({
    q: searchParams.get('q') || '',
    year: searchParams.get('year') || '',
    title: searchParams.get('title') || '',
    location: searchParams.get('location') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
    sort: (searchParams.get('sort') as UseSermonFilters['sort']) || 'relevance-desc',
    view: (searchParams.get('view') as UseSermonFilters['view']) || 'card',
    matchCase: searchParams.get('matchCase') === '1',
    wholeWord: parseWholeWordParam(searchParams.get('wholeWord')),
    fuzzy: searchParams.get('fuzzy') === '1',
  }), [searchParams]);
  const isSearchMode = filters.q.trim().length > 0;

  const setFilters = useCallback((patch: Partial<UseSermonFilters>) => {
    const patchKeys = Object.keys(patch) as Array<keyof UseSermonFilters>;
    if (patchKeys.length === 0) {
      return;
    }

    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const hasPatch = (key: keyof UseSermonFilters): boolean => Object.prototype.hasOwnProperty.call(patch, key);

      for (const key of patchKeys) {
        if (key === 'matchCase' || key === 'wholeWord' || key === 'fuzzy') {
          continue;
        }

        const value = patch[key];
        if (value == null || value === '' || value === 0) {
          next.delete(key);
          continue;
        }

        next.set(key, String(value));
      }

      const currentMatchCase = next.get('matchCase') === '1';
      const currentWholeWord = parseWholeWordParam(next.get('wholeWord'));
      const currentFuzzy = next.get('fuzzy') === '1';
      const shouldRewriteStrictMode = hasPatch('matchCase') || hasPatch('wholeWord') || hasPatch('fuzzy');

      if (shouldRewriteStrictMode) {
        let nextMatchCase = hasPatch('matchCase') ? Boolean(patch.matchCase) : currentMatchCase;
        let nextWholeWord = hasPatch('wholeWord') ? Boolean(patch.wholeWord) : currentWholeWord;
        const nextFuzzy = hasPatch('fuzzy') ? Boolean(patch.fuzzy) : currentFuzzy;

        if (nextFuzzy) {
          nextMatchCase = false;
          nextWholeWord = false;
        } else if (hasPatch('fuzzy') && !nextMatchCase && !nextWholeWord) {
          // Turning fuzzy off with no active strict option falls back to whole-word default.
          nextWholeWord = true;
        }

        if (nextFuzzy) {
          next.set('fuzzy', '1');
        } else {
          next.delete('fuzzy');
        }

        if (nextMatchCase) {
          next.set('matchCase', '1');
        } else {
          next.delete('matchCase');
        }

        next.set('wholeWord', nextWholeWord ? '1' : '0');
      }

      if (patchKeys.some((key) => key !== 'page')) {
        next.delete('page');
      }

      return next;
    });
  }, [setSearchParams]);

  const setFilter = useCallback((key: keyof UseSermonFilters, value: string | number | boolean) => {
    setFilters({ [key]: value } as Partial<UseSermonFilters>);
  }, [setFilters]);

  const clearFilters = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('year');
      next.delete('title');
      next.delete('location');
      next.delete('page');
      return next;
    });
  }, [setSearchParams]);

  // Fetch meta (years, titles, locations)
  useEffect(() => {
    async function fetchMeta() {
      const port = await getDataPort();
      const meta = await port.getSearchMeta();
      setYears(meta.years);
      setTitles(meta.titles);
      setLocations(meta.locations);
    }
    fetchMeta();
  }, []);

  // Fetch sermons
  useEffect(() => {
    async function fetchSermons() {
      setLoading(true);
      const from = (filters.page - 1) * PAGE_SIZE;
      const port = await getDataPort();

      if (isSearchMode) {
        const data = await port.searchSermonHits({
          query: filters.q.trim(),
          year: filters.year ? parseInt(filters.year, 10) : null,
          title: filters.title || null,
          location: filters.location || null,
          limit: PAGE_SIZE,
          offset: from,
          sort: filters.sort,
          matchCase: filters.fuzzy ? false : filters.matchCase,
          wholeWord: filters.fuzzy ? false : filters.wholeWord,
          fuzzy: filters.fuzzy,
        });

        if (data) {
          setSearchHits(data as SearchHit[]);
          setSermons([]);
          setTotal(data[0]?.total_count ?? 0);
        } else {
          setSearchHits([]);
          setSermons([]);
          setTotal(0);
        }

        setLoading(false);
        return;
      }

      const { rows, total: totalCount } = await port.listSermons({
        year: filters.year ? parseInt(filters.year, 10) : null,
        title: filters.title || null,
        location: filters.location || null,
        limit: PAGE_SIZE,
        offset: from,
        sort: filters.sort,
      });

      if (rows) {
        setSermons(rows as Sermon[]);
        setSearchHits([]);
        setTotal(totalCount || 0);
      } else {
        setSermons([]);
        setSearchHits([]);
        setTotal(0);
      }
      setLoading(false);
    }
    fetchSermons();
  }, [filters, isSearchMode]);

  return {
    sermons,
    searchHits,
    isSearchMode,
    total,
    loading,
    filters,
    setFilters,
    setFilter,
    clearFilters,
    years,
    titles,
    locations,
    pageSize: PAGE_SIZE,
  };
}

export async function fetchSermonById(id: string): Promise<SermonDetail | null> {
  const port = await getDataPort();
  return port.getSermonDetail(id);
}

export async function fetchAdjacentSermons(date: string): Promise<{ prev: AdjacentSermonRecord | null; next: AdjacentSermonRecord | null }> {
  const port = await getDataPort();
  return port.getAdjacentSermons(date);
}

export async function fetchBoundarySermons(): Promise<{ first: AdjacentSermonRecord | null; last: AdjacentSermonRecord | null }> {
  const port = await getDataPort();
  return port.getBoundarySermons();
}

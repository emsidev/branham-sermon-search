import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Tables } from '@/integrations/supabase/types';

export type Sermon = Tables<'sermons'>;
export type SearchHit = Database['public']['Functions']['search_sermon_chunks']['Returns'][number];
type SermonDocument = Tables<'sermon_documents'>;
type SermonAudio = Tables<'sermon_audio'>;
export type SermonParagraph = Pick<
  Tables<'sermon_paragraphs'>,
  'paragraph_number' | 'printed_paragraph_number' | 'paragraph_text'
>;

export interface SermonDetail extends Sermon {
  pdf_source_path: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  paragraphs: SermonParagraph[];
}

interface UseSermonFilters {
  q: string;
  year: string;
  location: string;
  page: number;
  sort: 'relevance-desc' | 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';
  view: 'card' | 'table';
}

interface UseSermonsResult {
  sermons: Sermon[];
  searchHits: SearchHit[];
  isSearchMode: boolean;
  total: number;
  loading: boolean;
  filters: UseSermonFilters;
  setFilter: (key: keyof UseSermonFilters, value: string | number) => void;
  clearFilters: () => void;
  years: number[];
  locations: string[];
  pageSize: number;
}

const PAGE_SIZE = 25;

export function useSermons(): UseSermonsResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<number[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const filters: UseSermonFilters = useMemo(() => ({
    q: searchParams.get('q') || '',
    year: searchParams.get('year') || '',
    location: searchParams.get('location') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
    sort: (searchParams.get('sort') as UseSermonFilters['sort']) || 'relevance-desc',
    view: (searchParams.get('view') as UseSermonFilters['view']) || 'card',
  }), [searchParams]);
  const isSearchMode = filters.q.trim().length > 0;

  const setFilter = useCallback((key: keyof UseSermonFilters, value: string | number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === '' || value === 0) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
      if (key !== 'page') {
        next.delete('page');
      }
      return next;
    });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  // Fetch meta (years, locations)
  useEffect(() => {
    async function fetchMeta() {
      const [yearsRes, locationsRes] = await Promise.all([
        supabase.from('sermons').select('year').order('year', { ascending: false }),
        supabase.from('sermons').select('location'),
      ]);
      if (yearsRes.data) {
        const uniqueYears = [...new Set(yearsRes.data.map(r => r.year).filter(Boolean))] as number[];
        setYears(uniqueYears.sort((a, b) => b - a));
      }
      if (locationsRes.data) {
        const uniqueLocations = [...new Set(locationsRes.data.map(r => r.location).filter(Boolean))] as string[];
        setLocations(uniqueLocations.sort());
      }
    }
    fetchMeta();
  }, []);

  // Fetch sermons
  useEffect(() => {
    async function fetchSermons() {
      setLoading(true);
      const from = (filters.page - 1) * PAGE_SIZE;

      if (isSearchMode) {
        const { data, error } = await supabase.rpc('search_sermon_chunks', {
          p_query: filters.q.trim(),
          p_year: filters.year ? parseInt(filters.year, 10) : null,
          p_location: filters.location || null,
          p_limit: PAGE_SIZE,
          p_offset: from,
          p_sort: filters.sort,
        });

        if (!error && data) {
          setSearchHits(data);
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

      let query = supabase.from('sermons').select('*', { count: 'exact' });

      // Filters
      if (filters.year) {
        query = query.eq('year', parseInt(filters.year, 10));
      }
      if (filters.location) {
        query = query.eq('location', filters.location);
      }

      // Sorting
      const [sortField, sortDir] = filters.sort.split('-') as [string, string];
      if (sortField === 'date') {
        query = query.order('date', { ascending: sortDir === 'asc' });
      } else if (sortField === 'title') {
        query = query.order('title', { ascending: sortDir === 'asc' });
      } else {
        query = query.order('date', { ascending: false });
      }

      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, count, error } = await query;

      if (!error && data) {
        setSermons(data);
        setSearchHits([]);
        setTotal(count || 0);
      } else {
        setSermons([]);
        setSearchHits([]);
        setTotal(0);
      }
      setLoading(false);
    }
    fetchSermons();
  }, [filters, isSearchMode]);

  return { sermons, searchHits, isSearchMode, total, loading, filters, setFilter, clearFilters, years, locations, pageSize: PAGE_SIZE };
}

export async function fetchSermonById(id: string): Promise<SermonDetail | null> {
  const [{ data: sermon }, { data: doc }, { data: audio }, { data: paragraphs }] = await Promise.all([
    supabase.from('sermons').select('*').eq('id', id).single(),
    supabase.from('sermon_documents').select('pdf_source_path').eq('sermon_id', id).maybeSingle(),
    supabase.from('sermon_audio').select('audio_url,duration_seconds').eq('sermon_id', id).maybeSingle(),
    supabase
      .from('sermon_paragraphs')
      .select('paragraph_number,printed_paragraph_number,paragraph_text')
      .eq('sermon_id', id)
      .order('paragraph_number', { ascending: true }),
  ]);

  if (!sermon) {
    return null;
  }

  const typedDoc = doc as Pick<SermonDocument, 'pdf_source_path'> | null;
  const typedAudio = audio as Pick<SermonAudio, 'audio_url' | 'duration_seconds'> | null;

  return {
    ...sermon,
    pdf_source_path: typedDoc?.pdf_source_path ?? null,
    audio_url: typedAudio?.audio_url ?? null,
    duration_seconds: typedAudio?.duration_seconds ?? null,
    paragraphs: (paragraphs as SermonParagraph[] | null) ?? [],
  };
}

interface AdjacentSermon {
  id: string;
  title: string;
  date: string;
}

export async function fetchAdjacentSermons(date: string): Promise<{ prev: AdjacentSermon | null; next: AdjacentSermon | null }> {
  const [prevRes, nextRes] = await Promise.all([
    supabase.from('sermons').select('id,title,date').lt('date', date).order('date', { ascending: false }).limit(1),
    supabase.from('sermons').select('id,title,date').gt('date', date).order('date', { ascending: true }).limit(1),
  ]);
  return {
    prev: (prevRes.data?.[0] as AdjacentSermon) || null,
    next: (nextRes.data?.[0] as AdjacentSermon) || null,
  };
}

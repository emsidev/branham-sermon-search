import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Sermon = Tables<'sermons'>;

interface UseSermonFilters {
  q: string;
  year: string;
  location: string;
  page: number;
  sort: 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';
}

interface UseSermonsResult {
  sermons: Sermon[];
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
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<number[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const filters: UseSermonFilters = useMemo(() => ({
    q: searchParams.get('q') || '',
    year: searchParams.get('year') || '',
    location: searchParams.get('location') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
    sort: (searchParams.get('sort') as UseSermonFilters['sort']) || 'date-desc',
  }), [searchParams]);

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

      let query = supabase.from('sermons').select('*', { count: 'exact' });

      // Full-text search
      if (filters.q) {
        query = query.textSearch('fts', filters.q, { type: 'websearch' });
      }

      // Filters
      if (filters.year) {
        query = query.eq('year', parseInt(filters.year));
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
      }

      // Pagination
      const from = (filters.page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, count, error } = await query;

      if (!error && data) {
        setSermons(data);
        setTotal(count || 0);
      }
      setLoading(false);
    }
    fetchSermons();
  }, [filters]);

  return { sermons, total, loading, filters, setFilter, clearFilters, years, locations, pageSize: PAGE_SIZE };
}

export async function fetchSermonById(id: string): Promise<Sermon | null> {
  const { data } = await supabase.from('sermons').select('*').eq('id', id).single();
  return data;
}

export async function fetchAdjacentSermons(date: string): Promise<{ prev: Sermon | null; next: Sermon | null }> {
  const [prevRes, nextRes] = await Promise.all([
    supabase.from('sermons').select('id,title,date').lt('date', date).order('date', { ascending: false }).limit(1),
    supabase.from('sermons').select('id,title,date').gt('date', date).order('date', { ascending: true }).limit(1),
  ]);
  return {
    prev: prevRes.data?.[0] || null,
    next: nextRes.data?.[0] || null,
  };
}

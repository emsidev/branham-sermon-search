DROP FUNCTION IF EXISTS public.search_sermon_chunks(TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.search_sermon_chunks(TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, TEXT);

CREATE FUNCTION public.search_sermon_chunks(
  p_query TEXT,
  p_year INTEGER DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0,
  p_sort TEXT DEFAULT 'relevance-desc',
  p_match_case BOOLEAN DEFAULT false,
  p_match_whole_word BOOLEAN DEFAULT false,
  p_enable_fuzzy BOOLEAN DEFAULT false,
  p_title TEXT DEFAULT NULL
)
RETURNS TABLE (
  hit_id TEXT,
  sermon_id UUID,
  sermon_code TEXT,
  title TEXT,
  summary TEXT,
  date DATE,
  location TEXT,
  tags TEXT[],
  paragraph_number INTEGER,
  printed_paragraph_number INTEGER,
  chunk_index INTEGER,
  chunk_total INTEGER,
  match_source TEXT,
  is_exact_match BOOLEAN,
  snippet TEXT,
  relevance DOUBLE PRECISION,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF trim(coalesce(p_query, '')) = '' THEN
    RETURN;
  END IF;

  IF coalesce(p_enable_fuzzy, false) THEN
    RETURN QUERY
    SELECT *
    FROM public.search_sermon_chunks_base(
      p_query,
      p_year,
      p_location,
      p_limit,
      p_offset,
      p_sort,
      p_title
    );
    RETURN;
  END IF;

  IF NOT coalesce(p_match_case, false) AND NOT coalesce(p_match_whole_word, false) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.search_sermon_chunks(
    p_query,
    p_year,
    p_location,
    p_limit,
    p_offset,
    p_sort,
    p_match_case,
    p_match_whole_word,
    p_title
  );
END;
$$;

CREATE FUNCTION public.search_sermon_chunks(
  p_query TEXT,
  p_year INTEGER DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0,
  p_sort TEXT DEFAULT 'relevance-desc',
  p_enable_fuzzy BOOLEAN DEFAULT false,
  p_title TEXT DEFAULT NULL
)
RETURNS TABLE (
  hit_id TEXT,
  sermon_id UUID,
  sermon_code TEXT,
  title TEXT,
  summary TEXT,
  date DATE,
  location TEXT,
  tags TEXT[],
  paragraph_number INTEGER,
  printed_paragraph_number INTEGER,
  chunk_index INTEGER,
  chunk_total INTEGER,
  match_source TEXT,
  is_exact_match BOOLEAN,
  snippet TEXT,
  relevance DOUBLE PRECISION,
  total_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.search_sermon_chunks(
    p_query,
    p_year,
    p_location,
    p_limit,
    p_offset,
    p_sort,
    false,
    true,
    p_enable_fuzzy,
    p_title
  );
$$;

GRANT EXECUTE ON FUNCTION public.search_sermon_chunks(TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_sermon_chunks(TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, TEXT) TO anon, authenticated;

-- Rollback (manual)
-- DROP FUNCTION IF EXISTS public.search_sermon_chunks(TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, TEXT);
-- DROP FUNCTION IF EXISTS public.search_sermon_chunks(TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, TEXT);
-- Re-apply migration 20260316170000_s05_search_filters.sql to restore prior function signatures and routing.

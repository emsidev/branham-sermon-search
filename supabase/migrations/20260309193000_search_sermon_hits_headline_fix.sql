CREATE OR REPLACE FUNCTION public.search_sermon_hits(
  p_query TEXT,
  p_year INTEGER DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  hit_id TEXT,
  sermon_id UUID,
  sermon_code TEXT,
  title TEXT,
  date DATE,
  location TEXT,
  page_number INTEGER,
  match_source TEXT,
  snippet TEXT,
  relevance DOUBLE PRECISION,
  total_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
WITH params AS (
  SELECT
    trim(coalesce(p_query, '')) AS query_text,
    '%' || trim(coalesce(p_query, '')) || '%' AS like_query,
    websearch_to_tsquery('english', trim(coalesce(p_query, ''))) AS ts_query
),
page_hits AS (
  SELECT
    s.id::text || ':page:' || sp.page_number::text AS hit_id,
    s.id AS sermon_id,
    s.sermon_code,
    s.title,
    s.date,
    s.location,
    sp.page_number,
    'page_text'::text AS match_source,
    CASE
      WHEN sp.page_fts @@ p.ts_query THEN
        regexp_replace(
          regexp_replace(
            ts_headline(
              'english',
              sp.page_text,
              p.ts_query,
              'MaxWords=24,MinWords=10,ShortWord=2,MaxFragments=1,FragmentDelimiter= ... ,StartSel=__H__,StopSel=__E__'
            ),
            '__H__|__E__',
            '',
            'g'
          ),
          '<[^>]+>',
          '',
          'g'
        )
      WHEN position(lower(p.query_text) IN lower(sp.page_text)) > 0 THEN
        substr(
          sp.page_text,
          GREATEST(position(lower(p.query_text) IN lower(sp.page_text)) - 45, 1),
          140
        )
      ELSE left(sp.page_text, 140)
    END AS snippet,
    (
      CASE WHEN sp.page_fts @@ p.ts_query THEN 1.0 + ts_rank_cd(sp.page_fts, p.ts_query) ELSE 0.0 END +
      CASE WHEN sp.page_text ILIKE p.like_query THEN 0.35 ELSE 0.0 END +
      (similarity(lower(sp.page_text), lower(p.query_text)) * 0.15)
    )::double precision AS relevance
  FROM public.sermon_pages sp
  JOIN public.sermons s ON s.id = sp.sermon_id
  CROSS JOIN params p
  WHERE
    p.query_text <> ''
    AND (p_year IS NULL OR s.year = p_year)
    AND (p_location IS NULL OR s.location = p_location)
    AND (
      sp.page_fts @@ p.ts_query
      OR sp.page_text ILIKE p.like_query
      OR similarity(lower(sp.page_text), lower(p.query_text)) > 0.14
    )
),
metadata_candidates AS (
  SELECT
    s.id,
    s.sermon_code,
    s.title,
    s.date,
    s.location,
    m.field_name,
    m.field_value,
    p.query_text,
    p.like_query,
    p.ts_query
  FROM public.sermons s
  CROSS JOIN params p
  CROSS JOIN LATERAL (
    VALUES
      ('title'::text, coalesce(s.title, '')),
      ('scripture'::text, coalesce(s.scripture, '')),
      ('location'::text, coalesce(s.location, ''))
  ) AS m(field_name, field_value)
  WHERE
    p.query_text <> ''
    AND m.field_value <> ''
    AND (p_year IS NULL OR s.year = p_year)
    AND (p_location IS NULL OR s.location = p_location)
),
metadata_hits AS (
  SELECT
    mc.id::text || ':meta:' || mc.field_name AS hit_id,
    mc.id AS sermon_id,
    mc.sermon_code,
    mc.title,
    mc.date,
    mc.location,
    NULL::integer AS page_number,
    mc.field_name AS match_source,
    mc.field_value AS snippet,
    (
      CASE WHEN to_tsvector('english', mc.field_value) @@ mc.ts_query
        THEN 1.15 + ts_rank_cd(to_tsvector('english', mc.field_value), mc.ts_query)
        ELSE 0.0
      END +
      CASE WHEN mc.field_value ILIKE mc.like_query THEN 0.35 ELSE 0.0 END +
      (similarity(lower(mc.field_value), lower(mc.query_text)) * 0.25)
    )::double precision AS relevance
  FROM metadata_candidates mc
  WHERE
    to_tsvector('english', mc.field_value) @@ mc.ts_query
    OR mc.field_value ILIKE mc.like_query
    OR similarity(lower(mc.field_value), lower(mc.query_text)) > 0.14
),
all_hits AS (
  SELECT * FROM page_hits
  UNION ALL
  SELECT * FROM metadata_hits
),
ranked_hits AS (
  SELECT
    ah.*,
    COUNT(*) OVER () AS total_count
  FROM all_hits ah
)
SELECT
  rh.hit_id,
  rh.sermon_id,
  rh.sermon_code,
  rh.title,
  rh.date,
  rh.location,
  rh.page_number,
  rh.match_source,
  rh.snippet,
  rh.relevance,
  rh.total_count
FROM ranked_hits rh
ORDER BY rh.relevance DESC, rh.date DESC, rh.sermon_code ASC, rh.hit_id ASC
LIMIT GREATEST(p_limit, 1)
OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.search_sermon_hits(TEXT, INTEGER, TEXT, INTEGER, INTEGER) TO anon, authenticated;

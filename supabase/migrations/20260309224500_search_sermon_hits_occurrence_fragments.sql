DROP FUNCTION IF EXISTS public.search_sermon_hits(TEXT, INTEGER, TEXT, INTEGER, INTEGER);

CREATE FUNCTION public.search_sermon_hits(
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
  fragment_index INTEGER,
  fragment_total INTEGER,
  total_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
WITH RECURSIVE raw_params AS (
  SELECT regexp_replace(trim(coalesce(p_query, '')), '\s+', ' ', 'g') AS raw_query
),
params AS (
  SELECT
    trim(
      CASE
        WHEN rp.raw_query ~ '^".*"$' THEN trim(both '"' from rp.raw_query)
        WHEN rp.raw_query ~ '^''.*''$' THEN trim(both '''' from rp.raw_query)
        ELSE rp.raw_query
      END
    ) AS query_text
  FROM raw_params rp
),
prepared_params AS (
  SELECT
    p.query_text,
    '%' || p.query_text || '%' AS like_query,
    lower(p.query_text) AS query_lower,
    char_length(lower(p.query_text)) AS query_len,
    websearch_to_tsquery('english', p.query_text) AS ts_query
  FROM params p
),
page_candidates AS (
  SELECT
    s.id::text || ':page:' || sp.page_number::text AS hit_base,
    s.id AS sermon_id,
    s.sermon_code,
    s.title,
    s.date,
    s.location,
    sp.page_number,
    sp.page_text,
    sp.page_fts,
    position(pp.query_lower IN lower(sp.page_text)) AS first_match_pos,
    (
      CASE WHEN sp.page_fts @@ pp.ts_query THEN 1.0 + ts_rank_cd(sp.page_fts, pp.ts_query) ELSE 0.0 END +
      CASE WHEN sp.page_text ILIKE pp.like_query THEN 0.35 ELSE 0.0 END +
      (similarity(lower(sp.page_text), pp.query_lower) * 0.15)
    )::double precision AS relevance
  FROM public.sermon_pages sp
  JOIN public.sermons s ON s.id = sp.sermon_id
  CROSS JOIN prepared_params pp
  WHERE
    pp.query_text <> ''
    AND (p_year IS NULL OR s.year = p_year)
    AND (p_location IS NULL OR s.location = p_location)
    AND (
      sp.page_fts @@ pp.ts_query
      OR sp.page_text ILIKE pp.like_query
      OR similarity(lower(sp.page_text), pp.query_lower) > 0.14
    )
),
phrase_occurrences AS (
  SELECT
    pc.hit_base,
    pc.sermon_id,
    pc.sermon_code,
    pc.title,
    pc.date,
    pc.location,
    pc.page_number,
    pc.page_text,
    lower(pc.page_text) AS page_text_lower,
    pc.relevance,
    pc.first_match_pos AS match_pos,
    1 AS fragment_index
  FROM page_candidates pc
  WHERE pc.first_match_pos > 0

  UNION ALL

  SELECT
    po.hit_base,
    po.sermon_id,
    po.sermon_code,
    po.title,
    po.date,
    po.location,
    po.page_number,
    po.page_text,
    po.page_text_lower,
    po.relevance,
    po.match_pos + pp.query_len + nx.next_rel - 1 AS match_pos,
    po.fragment_index + 1 AS fragment_index
  FROM phrase_occurrences po
  CROSS JOIN prepared_params pp
  CROSS JOIN LATERAL (
    SELECT strpos(substr(po.page_text_lower, po.match_pos + pp.query_len), pp.query_lower) AS next_rel
  ) nx
  WHERE
    pp.query_len > 0
    AND nx.next_rel > 0
),
phrase_page_hits AS (
  SELECT
    po.hit_base || ':frag:' || po.fragment_index::text AS hit_id,
    po.sermon_id,
    po.sermon_code,
    po.title,
    po.date,
    po.location,
    po.page_number,
    'page_text'::text AS match_source,
    substr(
      po.page_text,
      GREATEST(po.match_pos - 45, 1),
      140
    ) AS snippet,
    po.relevance,
    po.fragment_index,
    COUNT(*) OVER (PARTITION BY po.sermon_id, po.page_number) AS fragment_total
  FROM phrase_occurrences po
),
fallback_page_hits AS (
  SELECT
    pc.hit_base || ':frag:1' AS hit_id,
    pc.sermon_id,
    pc.sermon_code,
    pc.title,
    pc.date,
    pc.location,
    pc.page_number,
    'page_text'::text AS match_source,
    CASE
      WHEN pc.page_fts @@ pp.ts_query THEN
        regexp_replace(
          regexp_replace(
            ts_headline(
              'english',
              pc.page_text,
              pp.ts_query,
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
      ELSE left(pc.page_text, 140)
    END AS snippet,
    pc.relevance,
    1 AS fragment_index,
    1 AS fragment_total
  FROM page_candidates pc
  CROSS JOIN prepared_params pp
  WHERE pc.first_match_pos = 0
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
    pp.query_text,
    pp.like_query,
    pp.ts_query
  FROM public.sermons s
  CROSS JOIN prepared_params pp
  CROSS JOIN LATERAL (
    VALUES
      ('title'::text, coalesce(s.title, '')),
      ('scripture'::text, coalesce(s.scripture, '')),
      ('location'::text, coalesce(s.location, ''))
  ) AS m(field_name, field_value)
  WHERE
    pp.query_text <> ''
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
    )::double precision AS relevance,
    NULL::integer AS fragment_index,
    NULL::integer AS fragment_total
  FROM metadata_candidates mc
  WHERE
    to_tsvector('english', mc.field_value) @@ mc.ts_query
    OR mc.field_value ILIKE mc.like_query
    OR similarity(lower(mc.field_value), lower(mc.query_text)) > 0.14
),
all_hits AS (
  SELECT * FROM phrase_page_hits
  UNION ALL
  SELECT * FROM fallback_page_hits
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
  rh.fragment_index,
  rh.fragment_total,
  rh.total_count
FROM ranked_hits rh
ORDER BY rh.relevance DESC, rh.date DESC, rh.sermon_code ASC, rh.hit_id ASC
LIMIT GREATEST(p_limit, 1)
OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.search_sermon_hits(TEXT, INTEGER, TEXT, INTEGER, INTEGER) TO anon, authenticated;

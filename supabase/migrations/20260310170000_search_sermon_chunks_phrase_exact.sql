DROP FUNCTION IF EXISTS public.search_sermon_chunks(TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT);

CREATE FUNCTION public.search_sermon_chunks(
  p_query TEXT,
  p_year INTEGER DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0,
  p_sort TEXT DEFAULT 'relevance-desc'
)
RETURNS TABLE (
  hit_id TEXT,
  sermon_id UUID,
  sermon_code TEXT,
  title TEXT,
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
WITH raw_params AS (
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
    trim(
      regexp_replace(
        regexp_replace(lower(p.query_text), '[[:punct:]]+', ' ', 'g'),
        '\s+',
        ' ',
        'g'
      )
    ) AS query_normalized,
    ' ' || trim(
      regexp_replace(
        regexp_replace(lower(p.query_text), '[[:punct:]]+', ' ', 'g'),
        '\s+',
        ' ',
        'g'
      )
    ) || ' ' AS query_normalized_bounded,
    websearch_to_tsquery('english', p.query_text) AS ts_query,
    CASE
      WHEN p_sort IN ('relevance-desc', 'title-asc', 'title-desc', 'date-asc', 'date-desc')
        THEN p_sort
      ELSE 'relevance-desc'
    END AS sort_mode
  FROM params p
),
chunk_totals AS (
  SELECT
    sc.paragraph_id,
    COUNT(*)::integer AS chunk_total
  FROM public.sermon_chunks sc
  GROUP BY sc.paragraph_id
),
chunk_hits AS (
  SELECT
    s.id::text || ':para:' || sp.paragraph_number::text || ':chunk:' || sc.chunk_index::text AS hit_id,
    s.id AS sermon_id,
    s.sermon_code,
    s.title,
    s.date,
    s.location,
    s.tags,
    sp.paragraph_number,
    sp.printed_paragraph_number,
    sc.chunk_index,
    ct.chunk_total,
    'paragraph_text'::text AS match_source,
    (
      pp.query_normalized <> ''
      AND (
        position(
          pp.query_normalized_bounded IN (
            ' ' || trim(
              regexp_replace(
                regexp_replace(lower(coalesce(sc.chunk_text, '')), '[[:punct:]]+', ' ', 'g'),
                '\s+',
                ' ',
                'g'
              )
            ) || ' '
          )
        ) > 0
        OR position(
          pp.query_normalized_bounded IN (
            ' ' || trim(
              regexp_replace(
                regexp_replace(lower(coalesce(sp.paragraph_text, '')), '[[:punct:]]+', ' ', 'g'),
                '\s+',
                ' ',
                'g'
              )
            ) || ' '
          )
        ) > 0
      )
    ) AS is_exact_match,
    CASE
      WHEN sc.chunk_fts @@ pp.ts_query THEN
        regexp_replace(
          regexp_replace(
            ts_headline(
              'english',
              sc.chunk_text,
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
      WHEN position(pp.query_lower IN lower(sc.chunk_text)) > 0 THEN
        substr(
          sc.chunk_text,
          GREATEST(position(pp.query_lower IN lower(sc.chunk_text)) - 45, 1),
          180
        )
      ELSE left(sc.chunk_text, 180)
    END AS snippet,
    (
      CASE WHEN sc.chunk_fts @@ pp.ts_query THEN 1.0 + ts_rank_cd(sc.chunk_fts, pp.ts_query) ELSE 0.0 END +
      CASE WHEN sc.chunk_text ILIKE pp.like_query THEN 0.35 ELSE 0.0 END +
      (similarity(lower(sc.chunk_text), pp.query_lower) * 0.15)
    )::double precision AS relevance
  FROM public.sermon_chunks sc
  JOIN public.sermon_paragraphs sp ON sp.id = sc.paragraph_id
  JOIN public.sermons s ON s.id = sc.sermon_id
  JOIN chunk_totals ct ON ct.paragraph_id = sc.paragraph_id
  CROSS JOIN prepared_params pp
  WHERE
    pp.query_text <> ''
    AND (p_year IS NULL OR s.year = p_year)
    AND (p_location IS NULL OR s.location = p_location)
    AND (
      sc.chunk_fts @@ pp.ts_query
      OR sc.chunk_text ILIKE pp.like_query
      OR similarity(lower(sc.chunk_text), pp.query_lower) > 0.14
    )
),
metadata_candidates AS (
  SELECT
    s.id,
    s.sermon_code,
    s.title,
    s.date,
    s.location,
    s.tags,
    m.field_name,
    m.field_value,
    pp.query_text,
    pp.query_normalized,
    pp.query_normalized_bounded,
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
    mc.tags,
    NULL::integer AS paragraph_number,
    NULL::integer AS printed_paragraph_number,
    NULL::integer AS chunk_index,
    NULL::integer AS chunk_total,
    mc.field_name AS match_source,
    (
      mc.query_normalized <> ''
      AND position(
        mc.query_normalized_bounded IN (
          ' ' || trim(
            regexp_replace(
              regexp_replace(lower(mc.field_value), '[[:punct:]]+', ' ', 'g'),
              '\s+',
              ' ',
              'g'
            )
          ) || ' '
        )
      ) > 0
    ) AS is_exact_match,
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
  SELECT * FROM chunk_hits
  UNION ALL
  SELECT * FROM metadata_hits
),
ranked_hits AS (
  SELECT
    ah.*,
    pp.sort_mode,
    COUNT(*) OVER () AS total_count
  FROM all_hits ah
  CROSS JOIN prepared_params pp
)
SELECT
  rh.hit_id,
  rh.sermon_id,
  rh.sermon_code,
  rh.title,
  rh.date,
  rh.location,
  rh.tags,
  rh.paragraph_number,
  rh.printed_paragraph_number,
  rh.chunk_index,
  rh.chunk_total,
  rh.match_source,
  rh.is_exact_match,
  rh.snippet,
  rh.relevance,
  rh.total_count
FROM ranked_hits rh
ORDER BY
  CASE WHEN rh.sort_mode = 'title-asc' THEN lower(rh.title) END ASC NULLS LAST,
  CASE WHEN rh.sort_mode = 'title-desc' THEN lower(rh.title) END DESC NULLS LAST,
  CASE WHEN rh.sort_mode = 'date-asc' THEN rh.date END ASC NULLS LAST,
  CASE WHEN rh.sort_mode = 'date-desc' THEN rh.date END DESC NULLS LAST,
  CASE WHEN rh.sort_mode = 'relevance-desc' THEN rh.relevance END DESC NULLS LAST,
  rh.relevance DESC,
  rh.date DESC,
  rh.sermon_code ASC,
  rh.hit_id ASC
LIMIT GREATEST(p_limit, 1)
OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.search_sermon_chunks(TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT) TO anon, authenticated;

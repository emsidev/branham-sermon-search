ALTER TABLE public.sermons
ADD COLUMN IF NOT EXISTS summary TEXT;

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
WITH raw_params AS (
  SELECT regexp_replace(trim(coalesce(p_query, '')), E'\\s+', ' ', 'g') AS raw_query
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
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(p.query_text),
              '([[:alnum:]])[''’‘`]([[:alnum:]])',
              E'\\1\\2',
              'g'
            ),
            '[''’‘`]+',
            ' ',
            'g'
          ),
          '[[:punct:]]+',
          ' ',
          'g'
        ),
        E'\\s+',
        ' ',
        'g'
      )
    ) AS query_normalized,
    ' ' || trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(p.query_text),
              '([[:alnum:]])[''’‘`]([[:alnum:]])',
              E'\\1\\2',
              'g'
            ),
            '[''’‘`]+',
            ' ',
            'g'
          ),
          '[[:punct:]]+',
          ' ',
          'g'
        ),
        E'\\s+',
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
chunk_candidates AS (
  SELECT
    s.id::text || ':para:' || sp.paragraph_number::text || ':chunk:' || sc.chunk_index::text AS hit_id,
    s.id AS sermon_id,
    s.sermon_code,
    s.title,
    s.summary,
    s.date,
    s.location,
    s.tags,
    sp.paragraph_number,
    sp.printed_paragraph_number,
    sc.chunk_index,
    ct.chunk_total,
    'paragraph_text'::text AS match_source,
    sc.chunk_text,
    sc.chunk_fts,
    pp.query_lower,
    pp.query_normalized,
    pp.query_normalized_bounded,
    pp.like_query,
    pp.ts_query,
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(coalesce(sc.chunk_text, '')),
              '([[:alnum:]])[''’‘`]([[:alnum:]])',
              E'\\1\\2',
              'g'
            ),
            '[''’‘`]+',
            ' ',
            'g'
          ),
          '[[:punct:]]+',
          ' ',
          'g'
        ),
        E'\\s+',
        ' ',
        'g'
      )
    ) AS chunk_text_normalized,
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(coalesce(sp.paragraph_text, '')),
              '([[:alnum:]])[''’‘`]([[:alnum:]])',
              E'\\1\\2',
              'g'
            ),
            '[''’‘`]+',
            ' ',
            'g'
          ),
          '[[:punct:]]+',
          ' ',
          'g'
        ),
        E'\\s+',
        ' ',
        'g'
      )
    ) AS paragraph_text_normalized
  FROM public.sermon_chunks sc
  JOIN public.sermon_paragraphs sp ON sp.id = sc.paragraph_id
  JOIN public.sermons s ON s.id = sc.sermon_id
  JOIN chunk_totals ct ON ct.paragraph_id = sc.paragraph_id
  CROSS JOIN prepared_params pp
  WHERE
    pp.query_text <> ''
    AND (p_year IS NULL OR s.year = p_year)
    AND (p_location IS NULL OR s.location = p_location)
),
chunk_hits AS (
  SELECT
    cc.hit_id,
    cc.sermon_id,
    cc.sermon_code,
    cc.title,
    cc.summary,
    cc.date,
    cc.location,
    cc.tags,
    cc.paragraph_number,
    cc.printed_paragraph_number,
    cc.chunk_index,
    cc.chunk_total,
    cc.match_source,
    (
      cc.query_normalized <> ''
      AND position(cc.query_normalized_bounded IN (' ' || cc.chunk_text_normalized || ' ')) > 0
    ) AS is_exact_match,
    CASE
      WHEN cc.chunk_fts @@ cc.ts_query THEN
        regexp_replace(
          regexp_replace(
            ts_headline(
              'english',
              cc.chunk_text,
              cc.ts_query,
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
      WHEN position(cc.query_lower IN lower(cc.chunk_text)) > 0 THEN
        substr(
          cc.chunk_text,
          GREATEST(position(cc.query_lower IN lower(cc.chunk_text)) - 45, 1),
          180
        )
      ELSE left(cc.chunk_text, 180)
    END AS snippet,
    (
      CASE WHEN cc.chunk_fts @@ cc.ts_query THEN 1.0 + ts_rank_cd(cc.chunk_fts, cc.ts_query) ELSE 0.0 END +
      CASE WHEN cc.chunk_text ILIKE cc.like_query THEN 0.35 ELSE 0.0 END +
      CASE WHEN cc.query_normalized <> '' AND position(cc.query_normalized IN cc.chunk_text_normalized) > 0 THEN 0.3 ELSE 0.0 END +
      CASE WHEN cc.query_normalized <> '' AND similarity(cc.chunk_text_normalized, cc.query_normalized) > 0.14
        THEN similarity(cc.chunk_text_normalized, cc.query_normalized) * 0.12
        ELSE 0.0
      END +
      (similarity(lower(cc.chunk_text), cc.query_lower) * 0.15)
    )::double precision AS relevance
  FROM chunk_candidates cc
  WHERE
    cc.chunk_fts @@ cc.ts_query
    OR cc.chunk_text ILIKE cc.like_query
    OR similarity(lower(cc.chunk_text), cc.query_lower) > 0.14
    OR (cc.query_normalized <> '' AND position(cc.query_normalized IN cc.chunk_text_normalized) > 0)
    OR (cc.query_normalized <> '' AND position(cc.query_normalized IN cc.paragraph_text_normalized) > 0)
    OR (cc.query_normalized <> '' AND similarity(cc.chunk_text_normalized, cc.query_normalized) > 0.14)
),
metadata_candidates AS (
  SELECT
    s.id,
    s.sermon_code,
    s.title,
    s.summary,
    s.date,
    s.location,
    s.tags,
    m.field_name,
    m.field_value,
    pp.query_text,
    pp.query_normalized,
    pp.query_normalized_bounded,
    pp.like_query,
    pp.ts_query,
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(m.field_value),
              '([[:alnum:]])[''’‘`]([[:alnum:]])',
              E'\\1\\2',
              'g'
            ),
            '[''’‘`]+',
            ' ',
            'g'
          ),
          '[[:punct:]]+',
          ' ',
          'g'
        ),
        E'\\s+',
        ' ',
        'g'
      )
    ) AS field_value_normalized
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
    mc.summary,
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
      AND position(mc.query_normalized_bounded IN (' ' || mc.field_value_normalized || ' ')) > 0
    ) AS is_exact_match,
    mc.field_value AS snippet,
    (
      CASE WHEN to_tsvector('english', mc.field_value) @@ mc.ts_query
        THEN 1.15 + ts_rank_cd(to_tsvector('english', mc.field_value), mc.ts_query)
        ELSE 0.0
      END +
      CASE WHEN mc.field_value ILIKE mc.like_query THEN 0.35 ELSE 0.0 END +
      CASE WHEN mc.query_normalized <> '' AND position(mc.query_normalized IN mc.field_value_normalized) > 0 THEN 0.3 ELSE 0.0 END +
      CASE WHEN mc.query_normalized <> '' AND similarity(mc.field_value_normalized, mc.query_normalized) > 0.14
        THEN similarity(mc.field_value_normalized, mc.query_normalized) * 0.2
        ELSE 0.0
      END +
      (similarity(lower(mc.field_value), lower(mc.query_text)) * 0.25)
    )::double precision AS relevance
  FROM metadata_candidates mc
  WHERE
    to_tsvector('english', mc.field_value) @@ mc.ts_query
    OR mc.field_value ILIKE mc.like_query
    OR similarity(lower(mc.field_value), lower(mc.query_text)) > 0.14
    OR (mc.query_normalized <> '' AND position(mc.query_normalized IN mc.field_value_normalized) > 0)
    OR (mc.query_normalized <> '' AND similarity(mc.field_value_normalized, mc.query_normalized) > 0.14)
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
  rh.summary,
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


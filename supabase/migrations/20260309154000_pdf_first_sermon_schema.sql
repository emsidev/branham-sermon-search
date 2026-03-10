-- Hard replace sermons schema for PDF-first ingestion.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS public.sermons CASCADE;

CREATE TABLE public.sermons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sermon_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)::INTEGER) STORED,
  location TEXT,
  city TEXT,
  state TEXT,
  scripture TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  text_content TEXT NOT NULL DEFAULT '',
  fts tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(scripture, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(location, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(text_content, '')), 'D')
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sermon_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sermon_id UUID NOT NULL UNIQUE REFERENCES public.sermons(id) ON DELETE CASCADE,
  pdf_source_path TEXT NOT NULL,
  pdf_filename TEXT,
  pdf_sha256 TEXT,
  page_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sermon_pages (
  id BIGSERIAL PRIMARY KEY,
  sermon_id UUID NOT NULL REFERENCES public.sermons(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  page_text TEXT NOT NULL,
  page_fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(page_text, ''))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sermon_id, page_number)
);

CREATE TABLE public.sermon_audio (
  sermon_id UUID PRIMARY KEY REFERENCES public.sermons(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  provider TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sermons_updated_at
BEFORE UPDATE ON public.sermons
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_sermon_audio_updated_at
BEFORE UPDATE ON public.sermon_audio
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_sermons_date ON public.sermons(date DESC);
CREATE INDEX idx_sermons_year ON public.sermons(year);
CREATE INDEX idx_sermons_location ON public.sermons(location);
CREATE INDEX idx_sermons_fts ON public.sermons USING GIN(fts);

CREATE INDEX idx_sermon_pages_sermon_page ON public.sermon_pages(sermon_id, page_number);
CREATE INDEX idx_sermon_pages_fts ON public.sermon_pages USING GIN(page_fts);

ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermon_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermon_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermon_audio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sermons are publicly readable"
  ON public.sermons
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Sermon documents are publicly readable"
  ON public.sermon_documents
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Sermon pages are publicly readable"
  ON public.sermon_pages
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Sermon audio mappings are publicly readable"
  ON public.sermon_audio
  FOR SELECT
  TO anon, authenticated
  USING (true);

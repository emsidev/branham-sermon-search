
-- Create sermons table
CREATE TABLE public.sermons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  year INTEGER,
  location TEXT,
  city TEXT,
  state TEXT,
  scripture TEXT,
  duration TEXT,
  audio_url TEXT,
  source_url TEXT,
  transcript TEXT,
  tags TEXT[] DEFAULT '{}',
  content_hash TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add full-text search vector column
ALTER TABLE public.sermons ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(scripture, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(location, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(transcript, '')), 'D')
  ) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX idx_sermons_fts ON public.sermons USING GIN(fts);

-- Create indexes for filtering
CREATE INDEX idx_sermons_year ON public.sermons(year);
CREATE INDEX idx_sermons_location ON public.sermons(location);
CREATE INDEX idx_sermons_date ON public.sermons(date DESC);

-- Enable RLS
ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth required)
CREATE POLICY "Sermons are publicly readable"
  ON public.sermons
  FOR SELECT
  TO anon, authenticated
  USING (true);

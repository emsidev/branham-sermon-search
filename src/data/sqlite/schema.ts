export const CONTENT_SCHEMA_VERSION = 1;
export const USER_SCHEMA_VERSION = 1;

export const CONTENT_SCHEMA_SQL = `
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS sermons (
  id TEXT PRIMARY KEY,
  sermon_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  date TEXT NOT NULL,
  year INTEGER,
  location TEXT,
  city TEXT,
  state TEXT,
  scripture TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  text_content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sermon_documents (
  id TEXT PRIMARY KEY,
  sermon_id TEXT NOT NULL UNIQUE,
  pdf_source_path TEXT,
  pdf_filename TEXT,
  pdf_sha256 TEXT,
  page_count INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  imported_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sermon_audio (
  sermon_id TEXT PRIMARY KEY,
  audio_url TEXT,
  duration_seconds INTEGER,
  provider TEXT,
  external_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sermon_paragraphs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sermon_id TEXT NOT NULL,
  paragraph_number INTEGER NOT NULL,
  printed_paragraph_number INTEGER,
  paragraph_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(sermon_id, paragraph_number)
);

CREATE TABLE IF NOT EXISTS sermon_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sermon_id TEXT NOT NULL,
  paragraph_id INTEGER NOT NULL,
  paragraph_number INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_start INTEGER NOT NULL,
  chunk_end INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(paragraph_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS search_documents (
  hit_id TEXT PRIMARY KEY,
  sermon_id TEXT NOT NULL,
  match_source TEXT NOT NULL,
  paragraph_number INTEGER,
  printed_paragraph_number INTEGER,
  chunk_index INTEGER,
  chunk_total INTEGER,
  searchable_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  snippet_text TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sermons_date ON sermons(date DESC);
CREATE INDEX IF NOT EXISTS idx_sermons_year ON sermons(year);
CREATE INDEX IF NOT EXISTS idx_sermons_location ON sermons(location);
CREATE INDEX IF NOT EXISTS idx_sermons_title ON sermons(title);
CREATE INDEX IF NOT EXISTS idx_search_documents_sermon ON search_documents(sermon_id);
CREATE INDEX IF NOT EXISTS idx_search_documents_source ON search_documents(match_source);

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const USER_SCHEMA_SQL = `
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS keyboard_shortcuts (
  action TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;


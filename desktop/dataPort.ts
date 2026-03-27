import { app } from 'electron';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

const CONTENT_SCHEMA_SQL = `
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
`;

const USER_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS keyboard_shortcuts (
  action TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

interface ContentManifest {
  dbVersion: string;
  schemaVersion: number;
  sha256: string;
  size: number;
  url: string;
}

interface SearchSermonsParams {
  query: string;
  year: number | null;
  title: string | null;
  location: string | null;
  limit: number;
  offset: number;
  sort: string;
  matchCase: boolean;
  wholeWord: boolean;
  fuzzy: boolean;
}

interface SearchCandidate {
  hit_id: string;
  sermon_id: string;
  sermon_code: string;
  title: string;
  summary: string | null;
  date: string;
  location: string | null;
  tags_json: string | null;
  paragraph_number: number | null;
  printed_paragraph_number: number | null;
  chunk_index: number | null;
  chunk_total: number | null;
  match_source: string;
  searchable_text: string;
  normalized_text: string;
  snippet_text: string;
}

function normalizeText(value: string, matchCase: boolean): string {
  return (matchCase ? value : value.toLowerCase()).replace(/\s+/g, ' ').trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWholeWordMatch(haystack: string, needle: string): boolean {
  const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(needle)}([^\\p{L}\\p{N}]|$)`, 'u');
  return regex.test(haystack);
}

function trigrams(value: string): Set<string> {
  const normalized = `  ${value}  `;
  const out = new Set<string>();
  for (let index = 0; index <= normalized.length - 3; index += 1) {
    out.add(normalized.slice(index, index + 3));
  }
  return out;
}

function trigramSimilarity(a: string, b: string): number {
  if (!a || !b) {
    return 0;
  }

  const aSet = trigrams(a);
  const bSet = trigrams(b);
  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) {
      intersection += 1;
    }
  }
  return (2 * intersection) / (aSet.size + bSet.size);
}

function computeRelevance(text: string, query: string, wholeWord: boolean, fuzzy: boolean): number {
  const normalizedText = normalizeText(text, false);
  const normalizedQuery = normalizeText(query, false);

  if (!normalizedText || !normalizedQuery) {
    return 0;
  }

  if (normalizedText === normalizedQuery) {
    return 1.0;
  }

  if (wholeWord && hasWholeWordMatch(normalizedText, normalizedQuery)) {
    return 0.92;
  }

  if (normalizedText.includes(normalizedQuery)) {
    return 0.78;
  }

  if (fuzzy) {
    return trigramSimilarity(normalizedText, normalizedQuery) * 0.7;
  }

  return 0;
}

function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) {
    return [];
  }
  try {
    const parsed = JSON.parse(tagsJson) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function rankSearchCandidates(candidates: SearchCandidate[], params: SearchSermonsParams): any[] {
  const out: any[] = [];
  const normalizedQuery = normalizeText(params.query, params.matchCase);

  for (const row of candidates) {
    if (!normalizedQuery) {
      continue;
    }

    const comparableText = params.matchCase ? row.searchable_text : row.normalized_text;
    let matched = false;
    let exact = false;

    if (params.fuzzy) {
      const contains = normalizeText(row.searchable_text, false).includes(normalizeText(params.query, false));
      const similarity = trigramSimilarity(normalizeText(row.searchable_text, false), normalizeText(params.query, false));
      matched = contains || similarity >= 0.28;
      exact = contains;
    } else if (params.wholeWord) {
      matched = hasWholeWordMatch(comparableText, normalizedQuery);
      exact = normalizeText(row.searchable_text, params.matchCase) === normalizedQuery;
    } else {
      matched = comparableText.includes(normalizedQuery);
      exact = normalizeText(row.searchable_text, params.matchCase) === normalizedQuery;
    }

    if (!matched) {
      continue;
    }

    out.push({
      hit_id: row.hit_id,
      sermon_id: row.sermon_id,
      sermon_code: row.sermon_code,
      title: row.title,
      summary: row.summary,
      date: row.date,
      location: row.location,
      tags: parseTags(row.tags_json),
      paragraph_number: row.paragraph_number,
      printed_paragraph_number: row.printed_paragraph_number,
      chunk_index: row.chunk_index,
      chunk_total: row.chunk_total,
      match_source: row.match_source,
      is_exact_match: exact,
      snippet: row.snippet_text || row.searchable_text,
      relevance: computeRelevance(row.searchable_text, params.query, params.wholeWord, params.fuzzy),
      total_count: 0,
    });
  }

  out.sort((left, right) => {
    if (params.sort === 'date-asc') {
      return left.date.localeCompare(right.date);
    }
    if (params.sort === 'date-desc') {
      return right.date.localeCompare(left.date);
    }
    if (params.sort === 'title-asc') {
      return left.title.localeCompare(right.title);
    }
    if (params.sort === 'title-desc') {
      return right.title.localeCompare(left.title);
    }
    if (right.relevance !== left.relevance) {
      return right.relevance - left.relevance;
    }
    if (Number(right.is_exact_match) !== Number(left.is_exact_match)) {
      return Number(right.is_exact_match) - Number(left.is_exact_match);
    }
    return right.date.localeCompare(left.date);
  });

  const total = out.length;
  const sliced = out.slice(params.offset, params.offset + params.limit);
  return sliced.map((row) => ({ ...row, total_count: total }));
}

function readManifest(baseDir: string): ContentManifest | null {
  const manifestPath = path.join(baseDir, 'content-manifest.json');
  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8')) as ContentManifest;
  } catch {
    return null;
  }
}

function ensureDirectory(absolutePath: string): void {
  if (!existsSync(absolutePath)) {
    mkdirSync(absolutePath, { recursive: true });
  }
}

export class DesktopDataPort {
  private readonly contentDb: DatabaseSync;
  private readonly userDb: DatabaseSync;

  private constructor(contentDbPath: string, userDbPath: string) {
    this.contentDb = new DatabaseSync(contentDbPath);
    this.userDb = new DatabaseSync(userDbPath);
    this.contentDb.exec(CONTENT_SCHEMA_SQL);
    this.userDb.exec(USER_SCHEMA_SQL);
  }

  static initialize(projectRoot: string, isDevelopment: boolean): DesktopDataPort {
    const bundledDataDir = isDevelopment
      ? path.join(projectRoot, 'public', 'data')
      : path.join(projectRoot, 'dist', 'data');
    const manifest = readManifest(bundledDataDir);
    const dbVersion = manifest?.dbVersion ?? 'local-dev';

    const userDataPath = app.getPath('userData');
    const contentVersionDir = path.join(userDataPath, 'content', dbVersion);
    ensureDirectory(contentVersionDir);
    const seededContentPath = path.join(contentVersionDir, 'content.sqlite');
    const bundledContentPath = path.join(bundledDataDir, 'content.sqlite');

    if (!existsSync(seededContentPath) && existsSync(bundledContentPath)) {
      copyFileSync(bundledContentPath, seededContentPath);
    }

    const userDbPath = path.join(userDataPath, 'user.sqlite');
    return new DesktopDataPort(seededContentPath, userDbPath);
  }

  async getSearchMeta(): Promise<{ years: number[]; titles: string[]; locations: string[] }> {
    const years = this.contentDb
      .prepare('SELECT DISTINCT year FROM sermons WHERE year IS NOT NULL ORDER BY year DESC')
      .all()
      .map((row: any) => row.year)
      .filter((value: unknown): value is number => typeof value === 'number');

    const titles = this.contentDb
      .prepare("SELECT DISTINCT title FROM sermons WHERE title IS NOT NULL AND title <> '' ORDER BY title ASC")
      .all()
      .map((row: any) => row.title)
      .filter((value: unknown): value is string => typeof value === 'string');

    const locations = this.contentDb
      .prepare("SELECT DISTINCT location FROM sermons WHERE location IS NOT NULL AND location <> '' ORDER BY location ASC")
      .all()
      .map((row: any) => row.location)
      .filter((value: unknown): value is string => typeof value === 'string');

    return { years, titles, locations };
  }

  async listSermons(params: {
    year: number | null;
    title: string | null;
    location: string | null;
    limit: number;
    offset: number;
    sort: string;
  }): Promise<{ rows: any[]; total: number }> {
    const where: string[] = [];
    const queryParams: SQLInputValue[] = [];
    if (params.year != null) {
      where.push('year = ?');
      queryParams.push(params.year);
    }
    if (params.title) {
      where.push('title = ?');
      queryParams.push(params.title);
    }
    if (params.location) {
      where.push('location = ?');
      queryParams.push(params.location);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const total = this.contentDb
      .prepare(`SELECT COUNT(*) AS total FROM sermons ${whereClause}`)
      .get(...queryParams) as { total: number };

    const orderBy = params.sort === 'date-asc'
      ? 'date ASC'
      : params.sort === 'title-asc'
        ? 'title ASC'
        : params.sort === 'title-desc'
          ? 'title DESC'
          : 'date DESC';

    const rows = this.contentDb
      .prepare(`
        SELECT *
        FROM sermons
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ?
        OFFSET ?
      `)
      .all(...queryParams, params.limit, params.offset)
      .map((row: any) => ({
        ...row,
        tags: parseTags(row.tags_json ?? null),
      }));

    return { rows, total: total.total ?? 0 };
  }

  async searchSermonHits(params: SearchSermonsParams): Promise<any[]> {
    const where: string[] = [];
    const queryParams: SQLInputValue[] = [];
    if (params.year != null) {
      where.push('s.year = ?');
      queryParams.push(params.year);
    }
    if (params.title) {
      where.push('s.title = ?');
      queryParams.push(params.title);
    }
    if (params.location) {
      where.push('s.location = ?');
      queryParams.push(params.location);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const rows = this.contentDb.prepare(`
      SELECT
        sd.hit_id,
        sd.sermon_id,
        s.sermon_code,
        s.title,
        s.summary,
        s.date,
        s.location,
        s.tags_json,
        sd.paragraph_number,
        sd.printed_paragraph_number,
        sd.chunk_index,
        sd.chunk_total,
        sd.match_source,
        sd.searchable_text,
        sd.normalized_text,
        sd.snippet_text
      FROM search_documents sd
      INNER JOIN sermons s ON s.id = sd.sermon_id
      ${whereClause}
    `).all(...queryParams) as unknown as SearchCandidate[];

    return rankSearchCandidates(rows, params);
  }

  async getSermonDetail(id: string): Promise<any | null> {
    const sermon = this.contentDb.prepare('SELECT * FROM sermons WHERE id = ? LIMIT 1').get(id) as any;
    if (!sermon) {
      return null;
    }

    const documentRow = this.contentDb
      .prepare('SELECT pdf_source_path FROM sermon_documents WHERE sermon_id = ? LIMIT 1')
      .get(id) as { pdf_source_path: string | null } | undefined;
    const audioRow = this.contentDb
      .prepare('SELECT audio_url, duration_seconds FROM sermon_audio WHERE sermon_id = ? LIMIT 1')
      .get(id) as { audio_url: string | null; duration_seconds: number | null } | undefined;
    const paragraphs = this.contentDb
      .prepare(`
        SELECT paragraph_number, printed_paragraph_number, paragraph_text
        FROM sermon_paragraphs
        WHERE sermon_id = ?
        ORDER BY paragraph_number ASC
      `)
      .all(id);

    return {
      ...sermon,
      tags: parseTags(sermon.tags_json ?? null),
      pdf_source_path: documentRow?.pdf_source_path ?? null,
      audio_url: audioRow?.audio_url ?? null,
      duration_seconds: audioRow?.duration_seconds ?? null,
      paragraphs,
    };
  }

  async getAdjacentSermons(date: string): Promise<{ prev: any | null; next: any | null }> {
    const prev = this.contentDb
      .prepare('SELECT id, title, date FROM sermons WHERE date < ? ORDER BY date DESC LIMIT 1')
      .get(date) as any;
    const next = this.contentDb
      .prepare('SELECT id, title, date FROM sermons WHERE date > ? ORDER BY date ASC LIMIT 1')
      .get(date) as any;

    return {
      prev: prev ?? null,
      next: next ?? null,
    };
  }

  async getBoundarySermons(): Promise<{ first: any | null; last: any | null }> {
    const first = this.contentDb
      .prepare('SELECT id, title, date FROM sermons ORDER BY date ASC LIMIT 1')
      .get() as any;
    const last = this.contentDb
      .prepare('SELECT id, title, date FROM sermons ORDER BY date DESC LIMIT 1')
      .get() as any;
    return {
      first: first ?? null,
      last: last ?? null,
    };
  }

  async getShortcutBindings(): Promise<Array<{ action: string; key: string; updated_at: string }>> {
    return this.userDb
      .prepare('SELECT action, key, updated_at FROM keyboard_shortcuts ORDER BY action ASC')
      .all() as Array<{ action: string; key: string; updated_at: string }>;
  }

  async saveShortcutBindings(bindings: Array<{ action: string; key: string; updated_at: string }>): Promise<void> {
    this.userDb.exec('BEGIN');
    try {
      this.userDb.exec('DELETE FROM keyboard_shortcuts');
      const statement = this.userDb.prepare(
        'INSERT INTO keyboard_shortcuts(action, key, updated_at) VALUES (?, ?, ?)'
      );
      for (const binding of bindings) {
        statement.run(binding.action, binding.key, binding.updated_at);
      }
      this.userDb.exec('COMMIT');
    } catch (error) {
      this.userDb.exec('ROLLBACK');
      throw error;
    }
  }
}

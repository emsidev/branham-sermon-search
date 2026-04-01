import { app } from 'electron';
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
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

CREATE VIRTUAL TABLE IF NOT EXISTS search_documents_fts USING fts4(
  searchable_text,
  content='search_documents'
);

CREATE TABLE IF NOT EXISTS search_terms (
  term TEXT PRIMARY KEY,
  prefix2 TEXT NOT NULL,
  length INTEGER NOT NULL,
  doc_freq INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sermons_date ON sermons(date DESC);
CREATE INDEX IF NOT EXISTS idx_sermons_year ON sermons(year);
CREATE INDEX IF NOT EXISTS idx_sermons_location ON sermons(location);
CREATE INDEX IF NOT EXISTS idx_sermons_title ON sermons(title);
CREATE INDEX IF NOT EXISTS idx_search_documents_sermon ON search_documents(sermon_id);
CREATE INDEX IF NOT EXISTS idx_search_terms_prefix2_length_freq ON search_terms(prefix2, length, doc_freq DESC);
`;

const USER_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS keyboard_shortcuts (
  action TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const CONTENT_DOWNLOAD_URL = 'https://github.com/emsidev/branham-sermon-search/releases/download/content-db/content.sqlite';
const CONTENT_FILE_NAME = 'content.sqlite';
const TEMP_CONTENT_FILE_NAME = 'content.sqlite.download';

export type DesktopBootstrapPhase = 'needs-download' | 'downloading' | 'ready' | 'error';

export interface DesktopBootstrapStatus {
  phase: DesktopBootstrapPhase;
  receivedBytes: number;
  totalBytes: number | null;
  error: string | null;
  usingFallbackData: boolean;
}

interface DesktopDataPortInitializeOptions {
  forceDownload?: boolean;
  allowFallbackOnFailure?: boolean;
  onStatus?: (status: DesktopBootstrapStatus) => void;
}

interface SearchSermonsParams {
  query: string;
  year: number | null;
  title: string | null;
  location: string | null;
  limit: number;
  offset: number;
  sort: 'relevance-desc' | 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';
  matchCase: boolean;
  wholeWord: boolean;
  fuzzy: boolean;
}

interface SearchSuggestionsParams {
  query: string;
  maxSuggestions?: number;
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

interface SearchCandidateEvaluation {
  matched: boolean;
  exact: boolean;
  score: number;
}

const TOKEN_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const FUZZY_PREFILTER_LIMIT = 3000;
const FUZZY_TERM_EXPANSION_LIMIT = 8;
const SUGGESTION_TERM_EXPANSION_LIMIT = 40;
const DEFAULT_SUGGESTION_LIMIT = 3;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeSearchText(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

function normalizeSearchQuery(value: string, matchCase: boolean): string {
  const normalized = normalizeWhitespace(value);
  return matchCase ? normalized : normalized.toLowerCase();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWholeWordMatch(haystack: string, needle: string): boolean {
  const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(needle)}([^\\p{L}\\p{N}]|$)`, 'u');
  return regex.test(haystack);
}

function extractSearchTerms(value: string): string[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) {
    return [];
  }

  const matches = normalized.match(TOKEN_PATTERN);
  if (!matches) {
    return [];
  }

  return matches
    .map((term) => term.replace(/^['’]+|['’]+$/g, ''))
    .filter((term) => term.length > 0);
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

function toFtsPhraseQuery(value: string): string {
  return `"${normalizeWhitespace(value).replace(/"/g, '""')}"`;
}

function sanitizeFtsTerm(value: string): string {
  return value
    .replace(/"/g, '')
    .replace(/[^\p{L}\p{N}'’]/gu, '')
    .trim();
}

function buildFuzzyFtsExpression(candidateTerms: string[]): string | null {
  const uniqueTerms = [...new Set(candidateTerms.map((term) => sanitizeFtsTerm(term)).filter((term) => term.length >= 2))];
  if (uniqueTerms.length === 0) {
    return null;
  }

  return uniqueTerms.map((term) => `${term}*`).join(' OR ');
}

function termPrefix2(term: string): string {
  return term.slice(0, 2);
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

function computeRelevance(text: string, query: string, wholeWord: boolean, fuzzy: boolean): number {
  const normalizedText = normalizeSearchText(text);
  const normalizedQuery = normalizeSearchText(query);

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
    const density = Math.min(1, normalizedQuery.length / Math.max(normalizedText.length, 1));
    return 0.72 + density * 0.2;
  }

  if (fuzzy) {
    return trigramSimilarity(normalizedText, normalizedQuery) * 0.7;
  }

  return 0;
}

function evaluateSearchCandidate(row: SearchCandidate, params: SearchSermonsParams): SearchCandidateEvaluation {
  const text = params.matchCase ? row.searchable_text : row.normalized_text;
  const normalizedQuery = normalizeSearchQuery(params.query, params.matchCase);
  if (!normalizedQuery) {
    return { matched: false, exact: false, score: 0 };
  }

  if (params.fuzzy) {
    const searchableNormalized = normalizeSearchText(row.searchable_text);
    const queryNormalized = normalizeSearchText(params.query);
    const contains = searchableNormalized.includes(queryNormalized);
    const similarity = trigramSimilarity(searchableNormalized, queryNormalized);
    return {
      matched: contains || similarity >= 0.28,
      exact: contains,
      score: Math.max(computeRelevance(row.searchable_text, params.query, false, true), similarity),
    };
  }

  const matched = params.wholeWord
    ? hasWholeWordMatch(text, normalizedQuery)
    : text.includes(normalizedQuery);
  if (!matched) {
    return { matched: false, exact: false, score: 0 };
  }

  return {
    matched: true,
    exact: normalizeSearchQuery(row.searchable_text, params.matchCase) === normalizedQuery,
    score: computeRelevance(row.searchable_text, params.query, params.wholeWord, false),
  };
}

function buildSearchHit(row: SearchCandidate, evaluation: SearchCandidateEvaluation): any {
  return {
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
    is_exact_match: evaluation.exact,
    snippet: row.snippet_text || row.searchable_text,
    relevance: evaluation.score,
    total_count: 0,
  };
}

function compareSearchHits(left: any, right: any, sort: SearchSermonsParams['sort']): number {
  if (sort === 'date-asc') {
    return left.date.localeCompare(right.date);
  }
  if (sort === 'date-desc') {
    return right.date.localeCompare(left.date);
  }
  if (sort === 'title-asc') {
    return left.title.localeCompare(right.title);
  }
  if (sort === 'title-desc') {
    return right.title.localeCompare(left.title);
  }
  if (right.relevance !== left.relevance) {
    return right.relevance - left.relevance;
  }
  if (Number(right.is_exact_match) !== Number(left.is_exact_match)) {
    return Number(right.is_exact_match) - Number(left.is_exact_match);
  }
  return right.date.localeCompare(left.date);
}

function rankSearchCandidates(candidates: SearchCandidate[], params: SearchSermonsParams): any[] {
  const out: any[] = [];
  for (const row of candidates) {
    const evaluation = evaluateSearchCandidate(row, params);
    if (!evaluation.matched) {
      continue;
    }

    out.push(buildSearchHit(row, evaluation));
  }

  out.sort((left, right) => compareSearchHits(left, right, params.sort));
  const total = out.length;
  const sliced = out.slice(params.offset, params.offset + params.limit);
  return sliced.map((row) => ({ ...row, total_count: total }));
}

function buildSearchFilters(params: Pick<SearchSermonsParams, 'year' | 'title' | 'location'>): { whereClause: string; queryParams: SQLInputValue[] } {
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

  return {
    whereClause: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '',
    queryParams,
  };
}

function buildCandidateWhereClause(baseWhereClause: string, condition: string): string {
  if (!baseWhereClause) {
    return `WHERE ${condition}`;
  }
  return `${baseWhereClause} AND ${condition}`;
}

function buildSearchCandidateSelect(whereClause: string, includeFts = false): string {
  return `
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
    ${includeFts ? 'INNER JOIN search_documents_fts ON search_documents_fts.docid = sd.rowid' : ''}
    ${whereClause}
  `;
}

function rebuildSearchIndexes(db: DatabaseSync): void {
  db.prepare("INSERT INTO search_documents_fts(search_documents_fts) VALUES('rebuild')").run();
  db.exec('DELETE FROM search_terms');

  const termDocumentFrequency = new Map<string, number>();
  const iterator = db.prepare('SELECT normalized_text FROM search_documents').iterate() as Iterable<{ normalized_text: string | null }>;
  for (const row of iterator) {
    const uniqueTerms = new Set(extractSearchTerms(row.normalized_text ?? '').filter((term) => term.length >= 2));
    for (const term of uniqueTerms) {
      termDocumentFrequency.set(term, (termDocumentFrequency.get(term) ?? 0) + 1);
    }
  }

  const statement = db.prepare(`
    INSERT INTO search_terms(term, prefix2, length, doc_freq)
    VALUES (?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    for (const [term, docFrequency] of [...termDocumentFrequency.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      statement.run(term, termPrefix2(term), term.length, docFrequency);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function ensureSearchIndexesReady(db: DatabaseSync): void {
  const { total: documentCount } = db.prepare('SELECT COUNT(*) AS total FROM search_documents').get() as { total: number };
  if ((documentCount ?? 0) === 0) {
    return;
  }

  const { total: ftsCount } = db.prepare('SELECT COUNT(*) AS total FROM search_documents_fts').get() as { total: number };
  const { total: termCount } = db.prepare('SELECT COUNT(*) AS total FROM search_terms').get() as { total: number };
  if ((ftsCount ?? 0) === 0 || (termCount ?? 0) === 0) {
    rebuildSearchIndexes(db);
  }
}

function expandFuzzyTerms(db: DatabaseSync, query: string): string[] {
  const expanded = new Set<string>();
  const sourceTerms = extractSearchTerms(query).filter((term) => term.length >= 3);

  for (const term of sourceTerms) {
    expanded.add(term);
    const rows = db.prepare(`
      SELECT term, doc_freq
      FROM search_terms
      WHERE prefix2 = ?
        AND length BETWEEN ? AND ?
      ORDER BY doc_freq DESC, term ASC
      LIMIT ?
    `).all(
      termPrefix2(term),
      Math.max(2, term.length - 2),
      term.length + 2,
      SUGGESTION_TERM_EXPANSION_LIMIT,
    ) as Array<{ term: string; doc_freq: number }>;

    const best = rows
      .map((row) => ({
        term: row.term,
        docFrequency: Number(row.doc_freq ?? 0),
        similarity: trigramSimilarity(term, row.term),
      }))
      .filter((row) => row.similarity >= 0.3)
      .sort((left, right) =>
        right.similarity - left.similarity
          || right.docFrequency - left.docFrequency
          || left.term.localeCompare(right.term),
      )
      .slice(0, FUZZY_TERM_EXPANSION_LIMIT);

    for (const row of best) {
      expanded.add(row.term);
    }
  }

  return [...expanded];
}

function fetchStrictWholeWordCandidates(db: DatabaseSync, params: SearchSermonsParams): SearchCandidate[] {
  const { whereClause, queryParams } = buildSearchFilters(params);
  const withMatchClause = buildCandidateWhereClause(whereClause, 'search_documents_fts MATCH ?');
  return db.prepare(buildSearchCandidateSelect(withMatchClause, true))
    .all(...queryParams, toFtsPhraseQuery(params.query)) as unknown as SearchCandidate[];
}

function fetchStrictSubstringCandidates(db: DatabaseSync, params: SearchSermonsParams): SearchCandidate[] {
  const { whereClause, queryParams } = buildSearchFilters(params);
  const withSubstringClause = buildCandidateWhereClause(whereClause, "sd.normalized_text LIKE '%' || ? || '%'");
  return db.prepare(buildSearchCandidateSelect(withSubstringClause))
    .all(...queryParams, normalizeSearchText(params.query)) as unknown as SearchCandidate[];
}

function fetchFuzzyCandidates(db: DatabaseSync, params: SearchSermonsParams): SearchCandidate[] {
  const { whereClause, queryParams } = buildSearchFilters(params);
  const expandedTerms = expandFuzzyTerms(db, params.query);
  const fallbackTerms = extractSearchTerms(params.query);
  const ftsExpression = buildFuzzyFtsExpression(expandedTerms.length > 0 ? expandedTerms : fallbackTerms);
  if (!ftsExpression) {
    return [];
  }

  const withMatchClause = buildCandidateWhereClause(whereClause, 'search_documents_fts MATCH ?');
  return db.prepare(`${buildSearchCandidateSelect(withMatchClause, true)} LIMIT ?`)
    .all(...queryParams, ftsExpression, FUZZY_PREFILTER_LIMIT) as unknown as SearchCandidate[];
}

function fetchSearchCandidates(db: DatabaseSync, params: SearchSermonsParams): SearchCandidate[] {
  if (params.fuzzy) {
    return fetchFuzzyCandidates(db, params);
  }
  if (params.wholeWord) {
    return fetchStrictWholeWordCandidates(db, params);
  }
  return fetchStrictSubstringCandidates(db, params);
}

function buildSearchSuggestions(db: DatabaseSync, params: SearchSuggestionsParams): string[] {
  const maxSuggestions = Math.max(1, Math.min(5, params.maxSuggestions ?? DEFAULT_SUGGESTION_LIMIT));
  const normalizedQuery = normalizeSearchText(params.query);
  if (!normalizedQuery) {
    return [];
  }

  const queryTerms = extractSearchTerms(params.query);
  if (queryTerms.length === 0) {
    return [];
  }

  const suggestions = new Set<string>();
  const candidateRowsByIndex = queryTerms.map((term) => {
    if (term.length < 4) {
      return [];
    }

    const rows = db.prepare(`
      SELECT term, doc_freq
      FROM search_terms
      WHERE prefix2 = ?
        AND length BETWEEN ? AND ?
      ORDER BY doc_freq DESC, term ASC
      LIMIT ?
    `).all(
      termPrefix2(term),
      Math.max(2, term.length - 2),
      term.length + 2,
      SUGGESTION_TERM_EXPANSION_LIMIT,
    ) as Array<{ term: string; doc_freq: number }>;

    return rows
      .map((row) => ({
        term: row.term,
        docFrequency: Number(row.doc_freq ?? 0),
        similarity: trigramSimilarity(term, row.term),
      }))
      .filter((row) => row.term !== term && row.similarity >= 0.35)
      .sort((left, right) =>
        right.similarity - left.similarity
          || right.docFrequency - left.docFrequency
          || left.term.localeCompare(right.term),
      )
      .slice(0, 3);
  });

  for (let index = 0; index < queryTerms.length; index += 1) {
    const candidates = candidateRowsByIndex[index];
    if (!candidates || candidates.length === 0) {
      continue;
    }

    for (const candidate of candidates) {
      const suggestionTerms = [...queryTerms];
      suggestionTerms[index] = candidate.term;
      const suggestion = suggestionTerms.join(' ');
      if (suggestion === normalizedQuery) {
        continue;
      }

      suggestions.add(suggestion);
      if (suggestions.size >= maxSuggestions) {
        return [...suggestions];
      }
    }
  }

  return [...suggestions];
}

function ensureDirectory(absolutePath: string): void {
  if (!existsSync(absolutePath)) {
    mkdirSync(absolutePath, { recursive: true });
  }
}

function hasUsableSermonData(contentDbPath: string): boolean {
  if (!existsSync(contentDbPath)) {
    return false;
  }

  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(contentDbPath);
    const row = db.prepare('SELECT COUNT(*) AS total FROM sermons').get() as { total?: number } | undefined;
    return Number(row?.total ?? 0) > 0;
  } catch {
    return false;
  } finally {
    db?.close();
  }
}

function emitBootstrapStatus(
  callback: ((status: DesktopBootstrapStatus) => void) | undefined,
  status: DesktopBootstrapStatus
): void {
  callback?.(status);
}

async function downloadContentDatabase(
  seededContentPath: string,
  onProgress?: (receivedBytes: number, totalBytes: number | null) => void
): Promise<void> {
  const contentDir = path.dirname(seededContentPath);
  ensureDirectory(contentDir);

  const tempPath = path.join(contentDir, TEMP_CONTENT_FILE_NAME);
  rmSync(tempPath, { force: true });

  const response = await fetch(CONTENT_DOWNLOAD_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download content DB from ${CONTENT_DOWNLOAD_URL}: HTTP ${response.status}.`);
  }

  const contentLengthHeader = response.headers.get('content-length');
  const totalBytesFromHeader = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : NaN;
  const totalBytes = Number.isFinite(totalBytesFromHeader) && totalBytesFromHeader > 0
    ? totalBytesFromHeader
    : null;
  const reader = response.body.getReader();
  const writer = createWriteStream(tempPath);

  try {
    let receivedBytes = 0;
    onProgress?.(receivedBytes, totalBytes);

    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }

      const value = chunk.value;
      if (!value) {
        continue;
      }

      receivedBytes += value.byteLength;
      const chunkBuffer = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
      if (!writer.write(chunkBuffer)) {
        await new Promise<void>((resolve, reject) => {
          writer.once('drain', resolve);
          writer.once('error', reject);
        });
      }
      onProgress?.(receivedBytes, totalBytes);
    }

    await new Promise<void>((resolve, reject) => {
      writer.end(() => resolve());
      writer.once('error', reject);
    });
    rmSync(seededContentPath, { force: true });
    renameSync(tempPath, seededContentPath);
  } catch (error) {
    writer.destroy();
    rmSync(tempPath, { force: true });
    throw error;
  } finally {
    reader.releaseLock();
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
    ensureSearchIndexesReady(this.contentDb);
  }

  static async initialize(
    projectRoot: string,
    isDevelopment: boolean,
    options: DesktopDataPortInitializeOptions = {}
  ): Promise<DesktopDataPort> {
    const {
      forceDownload = false,
      allowFallbackOnFailure = false,
      onStatus,
    } = options;

    const userDataPath = app.getPath('userData');
    const contentDir = path.join(userDataPath, 'content');
    ensureDirectory(contentDir);
    const seededContentPath = path.join(contentDir, CONTENT_FILE_NAME);
    const userDbPath = path.join(userDataPath, 'user.sqlite');

    const createFallbackPort = (
      phase: DesktopBootstrapPhase,
      errorMessage: string | null
    ): DesktopDataPort => {
      emitBootstrapStatus(onStatus, {
        phase,
        receivedBytes: 0,
        totalBytes: null,
        error: errorMessage,
        usingFallbackData: true,
      });
      return new DesktopDataPort(':memory:', userDbPath);
    };

    try {
      if (!forceDownload) {
        if (!hasUsableSermonData(seededContentPath)) {
          return createFallbackPort('needs-download', null);
        }

        emitBootstrapStatus(onStatus, {
          phase: 'ready',
          receivedBytes: 0,
          totalBytes: null,
          error: null,
          usingFallbackData: false,
        });

        return new DesktopDataPort(seededContentPath, userDbPath);
      }

      emitBootstrapStatus(onStatus, {
        phase: 'downloading',
        receivedBytes: 0,
        totalBytes: null,
        error: null,
        usingFallbackData: false,
      });

      await downloadContentDatabase(
        seededContentPath,
        (receivedBytes, totalBytes) => {
          emitBootstrapStatus(onStatus, {
            phase: 'downloading',
            receivedBytes,
            totalBytes,
            error: null,
            usingFallbackData: false,
          });
        }
      );

      emitBootstrapStatus(onStatus, {
        phase: 'ready',
        receivedBytes: 0,
        totalBytes: null,
        error: null,
        usingFallbackData: false,
      });
      return new DesktopDataPort(seededContentPath, userDbPath);
    } catch (error) {
      if (!allowFallbackOnFailure) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      return createFallbackPort('error', errorMessage);
    }
  }

  close(): void {
    this.contentDb.close();
    this.userDb.close();
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
    const normalizedQuery = normalizeSearchText(params.query);
    if (!normalizedQuery) {
      return [];
    }

    const candidates = fetchSearchCandidates(this.contentDb, {
      ...params,
      query: normalizedQuery,
    });

    return rankSearchCandidates(candidates, params);
  }

  async getSearchSuggestions(params: SearchSuggestionsParams): Promise<string[]> {
    return buildSearchSuggestions(this.contentDb, params);
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

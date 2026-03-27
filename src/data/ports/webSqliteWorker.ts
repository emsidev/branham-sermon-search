/// <reference lib="webworker" />

import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { openDB } from 'idb';
import type {
  DataPort,
  ListSermonsParams,
  SearchSuggestionsParams,
  SearchSermonsParams,
  ShortcutBindingRow,
} from '@/data/contracts';
import { CONTENT_SCHEMA_SQL, CONTENT_SCHEMA_VERSION, USER_SCHEMA_SQL, USER_SCHEMA_VERSION } from '@/data/sqlite/schema';
import {
  evaluateSearchCandidate,
  rankSearchCandidates,
  type SearchCandidateRow,
} from '@/data/sqlite/searchEngine';
import {
  buildFuzzyFtsExpression,
  extractSearchTerms,
  normalizeSearchText,
  termPrefix2,
  toFtsPhraseQuery,
  trigramSimilarity,
} from '@/data/sqlite/searchIndex';

interface WorkerRpcRequest {
  type: 'rpc';
  id: number;
  method: keyof DataPort | 'init';
  params: unknown;
}

type WorkerRequest = WorkerRpcRequest;

interface WorkerRpcResponse {
  type: 'rpc';
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

interface ContentManifest {
  dbVersion: string;
  schemaVersion: number;
  sha256: string;
  size: number;
  url: string;
  downloadUrl?: string;
}

const DB_NAME = 'the-table-search-sqlite';
const DB_STORE = 'files';
const CONTENT_KEY = 'content.sqlite';
const USER_KEY = 'user.sqlite';
const DEFAULT_MANIFEST_URL = '/data/content-manifest.json';
const FUZZY_PREFILTER_LIMIT = 3000;
const FUZZY_TERM_EXPANSION_LIMIT = 8;
const SUGGESTION_TERM_EXPANSION_LIMIT = 40;
const DEFAULT_SUGGESTION_LIMIT = 3;

let sqlRuntime: SqlJsStatic | null = null;
let contentDb: Database | null = null;
let userDb: Database | null = null;
let initialized = false;

async function getStorage() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    },
  });
}

async function readStoredFile(key: string): Promise<Uint8Array | null> {
  const db = await getStorage();
  const raw = await db.get(DB_STORE, key);
  if (raw instanceof Uint8Array) {
    return raw;
  }
  if (raw instanceof ArrayBuffer) {
    return new Uint8Array(raw);
  }
  return null;
}

async function writeStoredFile(key: string, value: Uint8Array): Promise<void> {
  const db = await getStorage();
  await db.put(DB_STORE, value, key);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function ensureRuntime(): SqlJsStatic {
  if (!sqlRuntime) {
    throw new Error('SQLite runtime is not initialized');
  }

  return sqlRuntime;
}

function ensureContentDb(): Database {
  if (!contentDb) {
    throw new Error('Content database is not initialized');
  }
  return contentDb;
}

function ensureUserDb(): Database {
  if (!userDb) {
    throw new Error('User database is not initialized');
  }
  return userDb;
}

function runQuery<T extends Record<string, unknown>>(db: Database, sql: string, params: unknown[] = []): T[] {
  const statement = db.prepare(sql);
  statement.bind(params);
  const rows: T[] = [];
  while (statement.step()) {
    rows.push(statement.getAsObject() as T);
  }
  statement.free();
  return rows;
}

function initContentMetadata(db: Database, version: string): void {
  db.exec(CONTENT_SCHEMA_SQL);
  const statement = db.prepare('INSERT OR REPLACE INTO app_metadata(key, value) VALUES (?, ?)');
  statement.run(['content_schema_version', String(CONTENT_SCHEMA_VERSION)]);
  statement.run(['content_db_version', version]);
  statement.free();
}

function initUserMetadata(db: Database): void {
  db.exec(USER_SCHEMA_SQL);
  const statement = db.prepare('INSERT OR REPLACE INTO app_metadata(key, value) VALUES (?, ?)');
  statement.run(['user_schema_version', String(USER_SCHEMA_VERSION)]);
  statement.free();
}

async function tryFetchManifest(): Promise<ContentManifest | null> {
  try {
    const response = await fetch(DEFAULT_MANIFEST_URL, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    const manifest = (await response.json()) as ContentManifest;
    if (!manifest?.url) {
      return null;
    }

    return manifest;
  } catch {
    return null;
  }
}

function resolveManifestContentUrl(manifest: ContentManifest): string | null {
  const candidate = manifest.downloadUrl ?? manifest.url;
  if (!candidate) {
    return null;
  }

  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    return candidate;
  }

  if (candidate.startsWith('/')) {
    return candidate;
  }

  return null;
}

async function tryDownloadContentBytes(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function loadContentDb(runtime: SqlJsStatic): Promise<Database> {
  const manifest = await tryFetchManifest();
  const manifestUrl = manifest ? resolveManifestContentUrl(manifest) : null;
  const storedContent = await readStoredFile(CONTENT_KEY);
  if (storedContent && storedContent.length > 0) {
    if (!manifest?.sha256) {
      return new runtime.Database(storedContent);
    }

    const storedHash = await sha256Hex(storedContent);
    if (storedHash === manifest.sha256) {
      return new runtime.Database(storedContent);
    }

    const downloaded = manifestUrl ? await tryDownloadContentBytes(manifestUrl) : null;
    if (downloaded && downloaded.length > 0) {
      await writeStoredFile(CONTENT_KEY, downloaded);
      return new runtime.Database(downloaded);
    }

    return new runtime.Database(storedContent);
  }

  if (manifest && manifestUrl) {
    const downloaded = await tryDownloadContentBytes(manifestUrl);
    if (downloaded && downloaded.length > 0) {
      await writeStoredFile(CONTENT_KEY, downloaded);
      return new runtime.Database(downloaded);
    }
  }

  const db = new runtime.Database();
  initContentMetadata(db, manifest?.dbVersion ?? 'local-dev');
  await writeStoredFile(CONTENT_KEY, db.export());
  return db;
}

async function loadUserDb(runtime: SqlJsStatic): Promise<Database> {
  const storedUser = await readStoredFile(USER_KEY);
  if (storedUser && storedUser.length > 0) {
    return new runtime.Database(storedUser);
  }

  const db = new runtime.Database();
  initUserMetadata(db);
  await writeStoredFile(USER_KEY, db.export());
  return db;
}

async function maybeUpgradeContentDb(db: Database): Promise<boolean> {
  db.exec(CONTENT_SCHEMA_SQL);
  const versionRows = runQuery<{ value: string }>(db, "SELECT value FROM app_metadata WHERE key = 'content_schema_version' LIMIT 1");
  const currentVersion = versionRows.length === 0 ? 0 : Number.parseInt(versionRows[0].value ?? '0', 10);
  if (currentVersion < CONTENT_SCHEMA_VERSION) {
    rebuildSearchIndexes(db);
    const statement = db.prepare('INSERT OR REPLACE INTO app_metadata(key, value) VALUES (?, ?)');
    statement.run(['content_schema_version', String(CONTENT_SCHEMA_VERSION)]);
    statement.free();
    return true;
  }

  return ensureSearchIndexesReady(db);
}

async function maybeUpgradeUserDb(db: Database): Promise<boolean> {
  db.exec(USER_SCHEMA_SQL);
  const versionRows = runQuery<{ value: string }>(db, "SELECT value FROM app_metadata WHERE key = 'user_schema_version' LIMIT 1");
  if (versionRows.length === 0 || Number.parseInt(versionRows[0].value ?? '0', 10) < USER_SCHEMA_VERSION) {
    const statement = db.prepare('INSERT OR REPLACE INTO app_metadata(key, value) VALUES (?, ?)');
    statement.run(['user_schema_version', String(USER_SCHEMA_VERSION)]);
    statement.free();
    return true;
  }

  return false;
}

async function persistContentDb(): Promise<void> {
  await writeStoredFile(CONTENT_KEY, ensureContentDb().export());
}

async function persistUserDb(): Promise<void> {
  await writeStoredFile(USER_KEY, ensureUserDb().export());
}

async function initialize(): Promise<void> {
  if (initialized) {
    return;
  }

  sqlRuntime = await initSqlJs({
    locateFile: () => wasmUrl,
  });
  contentDb = await loadContentDb(ensureRuntime());
  userDb = await loadUserDb(ensureRuntime());
  const contentChanged = await maybeUpgradeContentDb(ensureContentDb());
  const userChanged = await maybeUpgradeUserDb(ensureUserDb());
  if (contentChanged) {
    await persistContentDb();
  }
  if (userChanged) {
    await persistUserDb();
  }
  initialized = true;
}

function appendFilter(where: string[], params: unknown[], column: string, value: string | number | null): void {
  if (value == null || value === '') {
    return;
  }

  where.push(`${column} = ?`);
  params.push(value);
}

function buildListSermonsQuery(params: ListSermonsParams): { sql: string; queryParams: unknown[] } {
  const where: string[] = [];
  const queryParams: unknown[] = [];
  appendFilter(where, queryParams, 'year', params.year);
  appendFilter(where, queryParams, 'title', params.title);
  appendFilter(where, queryParams, 'location', params.location);

  const orderBy = params.sort === 'date-asc'
    ? 'date ASC'
    : params.sort === 'title-asc'
      ? 'title ASC'
      : params.sort === 'title-desc'
        ? 'title DESC'
        : 'date DESC';

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT *
    FROM sermons
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ?
    OFFSET ?
  `;

  queryParams.push(params.limit, params.offset);
  return { sql, queryParams };
}

function buildSearchFilters(params: Pick<SearchSermonsParams, 'year' | 'title' | 'location'>): { whereClause: string; queryParams: unknown[] } {
  const where: string[] = [];
  const queryParams: unknown[] = [];
  appendFilter(where, queryParams, 's.year', params.year);
  appendFilter(where, queryParams, 's.title', params.title);
  appendFilter(where, queryParams, 's.location', params.location);
  return {
    whereClause: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '',
    queryParams,
  };
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

function rebuildSearchIndexes(db: Database): void {
  db.run("INSERT INTO search_documents_fts(search_documents_fts) VALUES('rebuild')");
  db.exec('DELETE FROM search_terms');

  const termDocumentFrequency = new Map<string, number>();
  const rowsStatement = db.prepare('SELECT normalized_text FROM search_documents');
  try {
    while (rowsStatement.step()) {
      const row = rowsStatement.getAsObject() as { normalized_text?: string | null };
      const uniqueTerms = new Set(
        extractSearchTerms(row.normalized_text ?? '').filter((term) => term.length >= 2),
      );

      for (const term of uniqueTerms) {
        termDocumentFrequency.set(term, (termDocumentFrequency.get(term) ?? 0) + 1);
      }
    }
  } finally {
    rowsStatement.free();
  }

  db.exec('BEGIN');
  const insertStatement = db.prepare(`
    INSERT INTO search_terms(term, prefix2, length, doc_freq)
    VALUES (?, ?, ?, ?)
  `);
  try {
    for (const [term, docFrequency] of [...termDocumentFrequency.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      insertStatement.run([term, termPrefix2(term), term.length, docFrequency]);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    insertStatement.free();
  }
}

function ensureSearchIndexesReady(db: Database): boolean {
  const [{ total: documentCount }] = runQuery<{ total: number }>(
    db,
    'SELECT COUNT(*) AS total FROM search_documents',
  );
  if (Number(documentCount ?? 0) === 0) {
    return false;
  }

  const [{ total: ftsCount }] = runQuery<{ total: number }>(
    db,
    'SELECT COUNT(*) AS total FROM search_documents_fts',
  );
  const [{ total: termCount }] = runQuery<{ total: number }>(
    db,
    'SELECT COUNT(*) AS total FROM search_terms',
  );

  if (Number(ftsCount ?? 0) === 0 || Number(termCount ?? 0) === 0) {
    rebuildSearchIndexes(db);
    return true;
  }

  return false;
}

function buildCandidateWhereClause(baseWhereClause: string, condition: string): string {
  if (!baseWhereClause) {
    return `WHERE ${condition}`;
  }

  return `${baseWhereClause} AND ${condition}`;
}

function fetchStrictWholeWordCandidates(db: Database, params: SearchSermonsParams): SearchCandidateRow[] {
  const { whereClause, queryParams } = buildSearchFilters(params);
  const phraseQuery = toFtsPhraseQuery(params.query);
  const withMatchClause = buildCandidateWhereClause(whereClause, 'search_documents_fts MATCH ?');
  return runQuery<SearchCandidateRow>(
    db,
    buildSearchCandidateSelect(withMatchClause, true),
    [...queryParams, phraseQuery],
  );
}

function fetchStrictSubstringCandidates(db: Database, params: SearchSermonsParams): SearchCandidateRow[] {
  const { whereClause, queryParams } = buildSearchFilters(params);
  const withSubstringClause = buildCandidateWhereClause(whereClause, "sd.normalized_text LIKE '%' || ? || '%'");
  return runQuery<SearchCandidateRow>(
    db,
    buildSearchCandidateSelect(withSubstringClause),
    [...queryParams, normalizeSearchText(params.query)],
  );
}

function expandFuzzyTerms(db: Database, query: string): string[] {
  const expanded = new Set<string>();
  const sourceTerms = extractSearchTerms(query).filter((term) => term.length >= 3);

  for (const term of sourceTerms) {
    expanded.add(term);
    const candidateRows = runQuery<{ term: string; doc_freq: number }>(
      db,
      `
      SELECT term, doc_freq
      FROM search_terms
      WHERE prefix2 = ?
        AND length BETWEEN ? AND ?
      ORDER BY doc_freq DESC, term ASC
      LIMIT ?
      `,
      [termPrefix2(term), Math.max(2, term.length - 2), term.length + 2, SUGGESTION_TERM_EXPANSION_LIMIT],
    );

    const best = candidateRows
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

function fetchFuzzyCandidates(db: Database, params: SearchSermonsParams): SearchCandidateRow[] {
  const { whereClause, queryParams } = buildSearchFilters(params);
  const expandedTerms = expandFuzzyTerms(db, params.query);
  const fallbackTerms = extractSearchTerms(params.query);
  const ftsExpression = buildFuzzyFtsExpression(expandedTerms.length > 0 ? expandedTerms : fallbackTerms);
  if (!ftsExpression) {
    return [];
  }

  const withMatchClause = buildCandidateWhereClause(whereClause, 'search_documents_fts MATCH ?');
  return runQuery<SearchCandidateRow>(
    db,
    `${buildSearchCandidateSelect(withMatchClause, true)} LIMIT ?`,
    [...queryParams, ftsExpression, FUZZY_PREFILTER_LIMIT],
  );
}

function fetchSearchCandidates(db: Database, params: SearchSermonsParams): SearchCandidateRow[] {
  if (params.fuzzy) {
    return fetchFuzzyCandidates(db, params);
  }

  if (params.wholeWord) {
    return fetchStrictWholeWordCandidates(db, params);
  }

  return fetchStrictSubstringCandidates(db, params);
}

function buildSearchSuggestions(db: Database, params: SearchSuggestionsParams): string[] {
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

    const rows = runQuery<{ term: string; doc_freq: number }>(
      db,
      `
      SELECT term, doc_freq
      FROM search_terms
      WHERE prefix2 = ?
        AND length BETWEEN ? AND ?
      ORDER BY doc_freq DESC, term ASC
      LIMIT ?
      `,
      [termPrefix2(term), Math.max(2, term.length - 2), term.length + 2, SUGGESTION_TERM_EXPANSION_LIMIT],
    );

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

  for (let termIndex = 0; termIndex < queryTerms.length; termIndex += 1) {
    const candidates = candidateRowsByIndex[termIndex];
    if (!candidates || candidates.length === 0) {
      continue;
    }

    for (const candidate of candidates) {
      const suggestionTerms = [...queryTerms];
      suggestionTerms[termIndex] = candidate.term;
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

const handlers: Record<string, (params: any) => Promise<any>> = {
  async init() {
    await initialize();
    return { ok: true };
  },

  async getSearchMeta() {
    const db = ensureContentDb();
    const years = runQuery<{ year: number | null }>(db, 'SELECT DISTINCT year FROM sermons WHERE year IS NOT NULL ORDER BY year DESC')
      .map((row) => row.year)
      .filter((value): value is number => typeof value === 'number');
    const titles = runQuery<{ title: string | null }>(db, "SELECT DISTINCT title FROM sermons WHERE title IS NOT NULL AND title <> '' ORDER BY title ASC")
      .map((row) => row.title)
      .filter((value): value is string => typeof value === 'string');
    const locations = runQuery<{ location: string | null }>(db, "SELECT DISTINCT location FROM sermons WHERE location IS NOT NULL AND location <> '' ORDER BY location ASC")
      .map((row) => row.location)
      .filter((value): value is string => typeof value === 'string');

    return { years, titles, locations };
  },

  async listSermons(params: ListSermonsParams) {
    const db = ensureContentDb();
    const where: string[] = [];
    const countParams: unknown[] = [];
    appendFilter(where, countParams, 'year', params.year);
    appendFilter(where, countParams, 'title', params.title);
    appendFilter(where, countParams, 'location', params.location);
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const [{ total }] = runQuery<{ total: number }>(db, `SELECT COUNT(*) AS total FROM sermons ${whereClause}`, countParams);
    const { sql, queryParams } = buildListSermonsQuery(params);
    const rows = runQuery(db, sql, queryParams).map((row) => ({
      ...row,
      tags: (() => {
        try {
          return JSON.parse(String((row as any).tags_json ?? '[]'));
        } catch {
          return [];
        }
      })(),
    }));
    return { rows, total: total ?? 0 };
  },

  async searchSermonHits(params: SearchSermonsParams) {
    const db = ensureContentDb();
    const normalizedQuery = normalizeSearchText(params.query);
    if (!normalizedQuery) {
      return [];
    }

    const rows = fetchSearchCandidates(db, {
      ...params,
      query: normalizedQuery,
    });

    return rankSearchCandidates(rows, params);
  },

  async getSearchSuggestions(params: SearchSuggestionsParams) {
    const db = ensureContentDb();
    return buildSearchSuggestions(db, params);
  },

  async getSermonDetail(id: string) {
    const db = ensureContentDb();
    const sermon = runQuery<any>(db, 'SELECT * FROM sermons WHERE id = ? LIMIT 1', [id])[0];
    if (!sermon) {
      return null;
    }

    const documentRow = runQuery<{ pdf_source_path: string | null }>(
      db,
      'SELECT pdf_source_path FROM sermon_documents WHERE sermon_id = ? LIMIT 1',
      [id]
    )[0];
    const audioRow = runQuery<{ audio_url: string | null; duration_seconds: number | null }>(
      db,
      'SELECT audio_url, duration_seconds FROM sermon_audio WHERE sermon_id = ? LIMIT 1',
      [id]
    )[0];
    const paragraphs = runQuery(
      db,
      `
      SELECT paragraph_number, printed_paragraph_number, paragraph_text
      FROM sermon_paragraphs
      WHERE sermon_id = ?
      ORDER BY paragraph_number ASC
      `,
      [id]
    );

    return {
      ...sermon,
      tags: (() => {
        try {
          return JSON.parse(String(sermon.tags_json ?? '[]'));
        } catch {
          return [];
        }
      })(),
      pdf_source_path: documentRow?.pdf_source_path ?? null,
      audio_url: audioRow?.audio_url ?? null,
      duration_seconds: audioRow?.duration_seconds ?? null,
      paragraphs,
    };
  },

  async getAdjacentSermons(date: string) {
    const db = ensureContentDb();
    const prev = runQuery<{ id: string; title: string; date: string }>(
      db,
      'SELECT id, title, date FROM sermons WHERE date < ? ORDER BY date DESC LIMIT 1',
      [date]
    )[0] ?? null;
    const next = runQuery<{ id: string; title: string; date: string }>(
      db,
      'SELECT id, title, date FROM sermons WHERE date > ? ORDER BY date ASC LIMIT 1',
      [date]
    )[0] ?? null;
    return { prev, next };
  },

  async getBoundarySermons() {
    const db = ensureContentDb();
    const first = runQuery<{ id: string; title: string; date: string }>(
      db,
      'SELECT id, title, date FROM sermons ORDER BY date ASC LIMIT 1'
    )[0] ?? null;
    const last = runQuery<{ id: string; title: string; date: string }>(
      db,
      'SELECT id, title, date FROM sermons ORDER BY date DESC LIMIT 1'
    )[0] ?? null;
    return { first, last };
  },

  async getShortcutBindings() {
    const rows = runQuery<ShortcutBindingRow>(
      ensureUserDb(),
      'SELECT action, key, updated_at FROM keyboard_shortcuts ORDER BY action ASC'
    );
    return rows;
  },

  async saveShortcutBindings(rows: ShortcutBindingRow[]) {
    const db = ensureUserDb();
    db.exec('BEGIN');
    try {
      db.exec('DELETE FROM keyboard_shortcuts');
      const statement = db.prepare(
        'INSERT INTO keyboard_shortcuts(action, key, updated_at) VALUES (?, ?, ?)'
      );
      for (const row of rows) {
        statement.run([row.action, row.key, row.updated_at]);
      }
      statement.free();
      db.exec('COMMIT');
      await persistUserDb();
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  },
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const payload = event.data;

  const { id, method, params } = payload;
  const response: WorkerRpcResponse = { type: 'rpc', id, ok: false };
  try {
    const handler = handlers[method];
    if (!handler) {
      throw new Error(`Unknown worker method: ${method}`);
    }

    const result = await handler(params);
    response.ok = true;
    response.result = result;
  } catch (error) {
    response.error = error instanceof Error ? error.message : 'Unknown worker error';
  }

  self.postMessage(response);
};

export {};

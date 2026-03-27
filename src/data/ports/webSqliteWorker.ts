/// <reference lib="webworker" />

import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { openDB } from 'idb';
import type { DataPort, ListSermonsParams, SearchSermonsParams, ShortcutBindingRow } from '@/data/contracts';
import { CONTENT_SCHEMA_SQL, CONTENT_SCHEMA_VERSION, USER_SCHEMA_SQL, USER_SCHEMA_VERSION } from '@/data/sqlite/schema';
import { rankSearchCandidates, type SearchCandidateRow } from '@/data/sqlite/searchEngine';

interface RpcRequest {
  id: number;
  method: keyof DataPort | 'init';
  params: unknown;
}

interface RpcResponse {
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
}

const DB_NAME = 'the-table-search-sqlite';
const DB_STORE = 'files';
const CONTENT_KEY = 'content.sqlite';
const USER_KEY = 'user.sqlite';
const DEFAULT_MANIFEST_URL = '/data/content-manifest.json';

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
  const storedContent = await readStoredFile(CONTENT_KEY);
  if (storedContent && storedContent.length > 0) {
    if (!manifest?.sha256) {
      return new runtime.Database(storedContent);
    }

    const storedHash = await sha256Hex(storedContent);
    if (storedHash === manifest.sha256) {
      return new runtime.Database(storedContent);
    }

    const downloaded = await tryDownloadContentBytes(manifest.url);
    if (downloaded && downloaded.length > 0) {
      await writeStoredFile(CONTENT_KEY, downloaded);
      return new runtime.Database(downloaded);
    }

    return new runtime.Database(storedContent);
  }

  if (manifest) {
    const downloaded = await tryDownloadContentBytes(manifest.url);
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

async function maybeUpgradeContentDb(db: Database): Promise<void> {
  db.exec(CONTENT_SCHEMA_SQL);
  const versionRows = runQuery<{ value: string }>(db, "SELECT value FROM app_metadata WHERE key = 'content_schema_version' LIMIT 1");
  if (versionRows.length === 0 || Number.parseInt(versionRows[0].value ?? '0', 10) < CONTENT_SCHEMA_VERSION) {
    const statement = db.prepare('INSERT OR REPLACE INTO app_metadata(key, value) VALUES (?, ?)');
    statement.run(['content_schema_version', String(CONTENT_SCHEMA_VERSION)]);
    statement.free();
  }
}

async function maybeUpgradeUserDb(db: Database): Promise<void> {
  db.exec(USER_SCHEMA_SQL);
  const versionRows = runQuery<{ value: string }>(db, "SELECT value FROM app_metadata WHERE key = 'user_schema_version' LIMIT 1");
  if (versionRows.length === 0 || Number.parseInt(versionRows[0].value ?? '0', 10) < USER_SCHEMA_VERSION) {
    const statement = db.prepare('INSERT OR REPLACE INTO app_metadata(key, value) VALUES (?, ?)');
    statement.run(['user_schema_version', String(USER_SCHEMA_VERSION)]);
    statement.free();
  }
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
  await maybeUpgradeContentDb(ensureContentDb());
  await maybeUpgradeUserDb(ensureUserDb());
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
    const where: string[] = [];
    const queryParams: unknown[] = [];
    appendFilter(where, queryParams, 's.year', params.year);
    appendFilter(where, queryParams, 's.title', params.title);
    appendFilter(where, queryParams, 's.location', params.location);
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const rows = runQuery<SearchCandidateRow>(
      db,
      `
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
      `,
      queryParams
    );

    return rankSearchCandidates(rows, params);
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

self.onmessage = async (event: MessageEvent<RpcRequest>) => {
  const { id, method, params } = event.data;
  const response: RpcResponse = { id, ok: false };
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

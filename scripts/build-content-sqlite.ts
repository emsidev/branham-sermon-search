#!/usr/bin/env -S node --import tsx

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { CONTENT_SCHEMA_SQL, CONTENT_SCHEMA_VERSION } from '../src/data/sqlite/schema';
import { normalizeSearchText } from '../src/data/sqlite/searchIndex';
import { rebuildSearchIndexes } from './rebuild-search-indexes';

type SeedPayload = {
  sermons?: any[];
  sermon_documents?: any[];
  sermon_audio?: any[];
  sermon_paragraphs?: any[];
  sermon_chunks?: any[];
};

interface ParsedArgs {
  outPath: string;
  manifestOutPath: string;
  manifestUrl: string | null;
  manifestDownloadUrl: string | null;
  seedPath: string | null;
  dbVersion: string;
  schemaVersion: number;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      continue;
    }
    args.set(token, value);
    index += 1;
  }

  return {
    outPath: args.get('--out') ?? path.resolve(process.cwd(), 'public', 'data', 'content.sqlite'),
    manifestOutPath: args.get('--manifest-out') ?? path.resolve(process.cwd(), 'public', 'data', 'content-manifest.json'),
    manifestUrl: args.get('--manifest-url') ?? null,
    manifestDownloadUrl: args.get('--download-url') ?? null,
    seedPath: args.get('--seed') ?? null,
    dbVersion: args.get('--db-version') ?? new Date().toISOString().slice(0, 10),
    schemaVersion: Number.parseInt(args.get('--schema-version') ?? String(CONTENT_SCHEMA_VERSION), 10),
  };
}

function addSearchDocument(
  db: DatabaseSync,
  row: {
    hit_id: string;
    sermon_id: string;
    match_source: string;
    paragraph_number: number | null;
    printed_paragraph_number: number | null;
    chunk_index: number | null;
    chunk_total: number | null;
    searchable_text: string;
    snippet_text: string;
  }
): void {
  db.prepare(`
    INSERT OR REPLACE INTO search_documents(
      hit_id,
      sermon_id,
      match_source,
      paragraph_number,
      printed_paragraph_number,
      chunk_index,
      chunk_total,
      searchable_text,
      normalized_text,
      snippet_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    row.hit_id,
    row.sermon_id,
    row.match_source,
    row.paragraph_number,
    row.printed_paragraph_number,
    row.chunk_index,
    row.chunk_total,
    row.searchable_text,
    normalizeSearchText(row.searchable_text),
    row.snippet_text
  );
}

function createSearchDocuments(db: DatabaseSync): void {
  db.exec('DELETE FROM search_documents');

  const sermons = db.prepare(`
    SELECT id, title, scripture, location
    FROM sermons
  `).all() as Array<{ id: string; title: string | null; scripture: string | null; location: string | null }>;

  for (const sermon of sermons) {
    if (sermon.title) {
      addSearchDocument(db, {
        hit_id: `${sermon.id}:title`,
        sermon_id: sermon.id,
        match_source: 'title',
        paragraph_number: null,
        printed_paragraph_number: null,
        chunk_index: null,
        chunk_total: null,
        searchable_text: sermon.title,
        snippet_text: sermon.title,
      });
    }
    if (sermon.scripture) {
      addSearchDocument(db, {
        hit_id: `${sermon.id}:scripture`,
        sermon_id: sermon.id,
        match_source: 'scripture',
        paragraph_number: null,
        printed_paragraph_number: null,
        chunk_index: null,
        chunk_total: null,
        searchable_text: sermon.scripture,
        snippet_text: sermon.scripture,
      });
    }
    if (sermon.location) {
      addSearchDocument(db, {
        hit_id: `${sermon.id}:location`,
        sermon_id: sermon.id,
        match_source: 'location',
        paragraph_number: null,
        printed_paragraph_number: null,
        chunk_index: null,
        chunk_total: null,
        searchable_text: sermon.location,
        snippet_text: sermon.location,
      });
    }
  }

  const paragraphRows = db.prepare(`
    SELECT sermon_id, paragraph_number, printed_paragraph_number, paragraph_text
    FROM sermon_paragraphs
  `).all() as Array<{
    sermon_id: string;
    paragraph_number: number;
    printed_paragraph_number: number | null;
    paragraph_text: string;
  }>;

  for (const row of paragraphRows) {
    const chunkTotals = db.prepare(`
      SELECT COUNT(*) AS total
      FROM sermon_chunks
      WHERE sermon_id = ? AND paragraph_number = ?
    `).get(row.sermon_id, row.paragraph_number) as { total: number };

    addSearchDocument(db, {
      hit_id: `${row.sermon_id}:para:${row.paragraph_number}`,
      sermon_id: row.sermon_id,
      match_source: 'paragraph_text',
      paragraph_number: row.paragraph_number,
      printed_paragraph_number: row.printed_paragraph_number,
      chunk_index: null,
      chunk_total: chunkTotals.total || null,
      searchable_text: row.paragraph_text,
      snippet_text: row.paragraph_text.slice(0, 240),
    });
  }
}

function upsertMetadata(db: DatabaseSync, key: string, value: string): void {
  db.prepare(`
    INSERT OR REPLACE INTO app_metadata(key, value)
    VALUES (?, ?)
  `).run(key, value);
}

function loadSeed(seedPath: string | null): SeedPayload {
  if (!seedPath) {
    return {};
  }

  const resolvedSeedPath = path.resolve(seedPath);
  if (!existsSync(resolvedSeedPath)) {
    return {};
  }

  return JSON.parse(readFileSync(resolvedSeedPath, 'utf8')) as SeedPayload;
}

function getTableColumns(db: DatabaseSync, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name?: string }>;
  return new Set(
    rows
      .map((row) => row.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0)
  );
}

function normalizeSqlValue(value: unknown): unknown {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value;
}

function bulkInsert(db: DatabaseSync, table: string, rows: any[]): void {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const tableColumns = getTableColumns(db, table);
  const sourceColumns = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      sourceColumns.add(key);
    }
  }

  const columns = Array.from(sourceColumns).filter((column) => tableColumns.has(column));
  if (columns.length === 0) {
    console.warn(`Skipping ${table}: no matching SQLite columns were found in seed payload.`);
    return;
  }

  const placeholders = columns.map(() => '?').join(', ');
  const statement = db.prepare(`
    INSERT OR REPLACE INTO ${table}(${columns.join(', ')})
    VALUES (${placeholders})
  `);

  db.exec('BEGIN');
  try {
    for (const row of rows) {
      statement.run(...columns.map((column) => normalizeSqlValue(row[column]) as SQLInputValue));
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function writeManifest(
  outPath: string,
  manifestOutPath: string,
  dbVersion: string,
  schemaVersion: number,
  manifestUrl: string | null,
  manifestDownloadUrl: string | null
): void {
  const outputDir = path.dirname(manifestOutPath);
  const relativeUrl = `/${path.relative(path.resolve(process.cwd(), 'public'), outPath).replace(/\\/g, '/')}`;
  const bytes = readFileSync(outPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const size = statSync(outPath).size;
  const payload = {
    dbVersion,
    schemaVersion,
    sha256,
    size,
    url: manifestUrl ?? (relativeUrl.startsWith('/') ? relativeUrl : '/data/content.sqlite'),
    ...(manifestDownloadUrl ? { downloadUrl: manifestDownloadUrl } : {}),
  };

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(manifestOutPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function run(): void {
  const args = parseArgs(process.argv.slice(2));
  const outPath = path.resolve(args.outPath);
  const outputDir = path.dirname(outPath);
  mkdirSync(outputDir, { recursive: true });
  if (existsSync(outPath)) {
    rmSync(outPath, { force: true });
  }

  const db = new DatabaseSync(outPath);
  db.exec(CONTENT_SCHEMA_SQL);

  const seed = loadSeed(args.seedPath);
  bulkInsert(db, 'sermons', seed.sermons ?? []);
  bulkInsert(db, 'sermon_documents', seed.sermon_documents ?? []);
  bulkInsert(db, 'sermon_audio', seed.sermon_audio ?? []);
  bulkInsert(db, 'sermon_paragraphs', seed.sermon_paragraphs ?? []);
  bulkInsert(db, 'sermon_chunks', seed.sermon_chunks ?? []);

  createSearchDocuments(db);
  rebuildSearchIndexes(db);
  upsertMetadata(db, 'content_db_version', args.dbVersion);
  upsertMetadata(db, 'content_schema_version', String(args.schemaVersion));
  db.close();

  writeManifest(
    outPath,
    path.resolve(args.manifestOutPath),
    args.dbVersion,
    args.schemaVersion,
    args.manifestUrl,
    args.manifestDownloadUrl
  );
  console.log(`SQLite content DB built: ${outPath}`);
}

run();

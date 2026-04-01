import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockUserDataPath = path.join(os.tmpdir(), 'the-table-search-test-default');

vi.mock('electron', () => ({
  app: {
    getPath: () => mockUserDataPath,
  },
}));

import { DesktopDataPort, type DesktopBootstrapStatus } from './dataPort';

function createTempDir(prefix: string): string {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('DesktopDataPort.initialize', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('the-table-search-data-port-');
    mockUserDataPath = tempDir;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('emits needs-download and uses fallback when content db is missing', async () => {
    const statuses: DesktopBootstrapStatus[] = [];
    const port = await DesktopDataPort.initialize(tempDir, true, {
      onStatus: (status) => statuses.push(status),
      forceDownload: false,
      allowFallbackOnFailure: true,
    });

    expect(statuses.at(-1)).toMatchObject({
      phase: 'needs-download',
      usingFallbackData: true,
    });
    expect(existsSync(path.join(tempDir, 'content', 'content.sqlite'))).toBe(false);
    port.close();
  });

  it('emits ready when local content db exists and contains sermon rows', async () => {
    const contentDir = path.join(tempDir, 'content');
    const contentDbPath = path.join(contentDir, 'content.sqlite');
    mkdirSync(contentDir, { recursive: true });
    const seedDb = new DatabaseSync(contentDbPath);
    seedDb.exec(`
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
    `);
    seedDb.prepare(`
      INSERT INTO sermons(
        id,
        sermon_code,
        title,
        date,
        year,
        location,
        tags_json,
        text_content,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      'seed-sermon-1',
      '65-1001',
      'Seed Sermon',
      '1965-10-01',
      1965,
      'Jeffersonville',
      '[]',
      'seed text',
    );
    seedDb.close();

    const statuses: DesktopBootstrapStatus[] = [];
    const port = await DesktopDataPort.initialize(tempDir, true, {
      onStatus: (status) => statuses.push(status),
      forceDownload: false,
      allowFallbackOnFailure: true,
    });

    expect(statuses.at(-1)).toMatchObject({
      phase: 'ready',
      usingFallbackData: false,
    });
    port.close();
  });

  it('emits needs-download when local db exists but has no sermon rows', async () => {
    const contentDir = path.join(tempDir, 'content');
    const contentDbPath = path.join(contentDir, 'content.sqlite');
    mkdirSync(contentDir, { recursive: true });
    const seedDb = new DatabaseSync(contentDbPath);
    seedDb.exec('CREATE TABLE IF NOT EXISTS sermons (id TEXT PRIMARY KEY)');
    seedDb.close();

    const statuses: DesktopBootstrapStatus[] = [];
    const port = await DesktopDataPort.initialize(tempDir, true, {
      onStatus: (status) => statuses.push(status),
      forceDownload: false,
      allowFallbackOnFailure: true,
    });

    expect(statuses.at(-1)).toMatchObject({
      phase: 'needs-download',
      usingFallbackData: true,
    });
    port.close();
  });

  it('transitions downloading to ready when force download succeeds', async () => {
    const seedPath = path.join(tempDir, 'seed.sqlite');
    const seedDb = new DatabaseSync(seedPath);
    seedDb.exec('CREATE TABLE IF NOT EXISTS seed (id INTEGER PRIMARY KEY, value TEXT)');
    seedDb.prepare('INSERT INTO seed(value) VALUES (?)').run('ok');
    seedDb.close();

    const sqliteBytes = new Uint8Array(readFileSync(seedPath));
    vi.stubGlobal('fetch', vi.fn(async () => new Response(sqliteBytes, {
      status: 200,
      headers: { 'content-length': String(sqliteBytes.length) },
    })) as unknown as typeof fetch);

    const statuses: DesktopBootstrapStatus[] = [];
    const port = await DesktopDataPort.initialize(tempDir, true, {
      onStatus: (status) => statuses.push(status),
      forceDownload: true,
      allowFallbackOnFailure: false,
    });

    expect(statuses.some((status) => status.phase === 'downloading')).toBe(true);
    expect(statuses.at(-1)).toMatchObject({
      phase: 'ready',
      usingFallbackData: false,
    });
    port.close();
  });

  it('emits error fallback when download fails and fallback is allowed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('failed', { status: 503 })) as unknown as typeof fetch);

    const statuses: DesktopBootstrapStatus[] = [];
    const port = await DesktopDataPort.initialize(tempDir, true, {
      onStatus: (status) => statuses.push(status),
      forceDownload: true,
      allowFallbackOnFailure: true,
    });

    expect(statuses.some((status) => status.phase === 'downloading')).toBe(true);
    expect(statuses.at(-1)).toMatchObject({
      phase: 'error',
      usingFallbackData: true,
    });
    port.close();
  });
});

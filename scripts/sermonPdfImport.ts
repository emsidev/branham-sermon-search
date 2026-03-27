import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  buildCanonicalSermonText,
  chunkParagraphText,
  parseSermonParagraphsFromExtractedPages,
} from '../src/lib/sermonImport';
import {
  parseSermonMetadataFromFilenameStem,
  type SermonDatePrecision,
  type SermonFilenameMetadata,
} from '../src/lib/sermonFilenameMetadata';
import {
  persistSermonImport,
  type SermonChunkSeed,
  type SermonDocumentPayload,
  type SermonImportRepository,
  type SermonParagraphPayload,
  type SermonPayload,
} from '../src/lib/sermonPdfImportPersistence';
import { CONTENT_SCHEMA_SQL } from '../src/data/sqlite/schema';

const YEAR_FOLDER_PATTERN = /^\d{4}$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const DEFAULT_SQLITE_PATH = path.resolve(process.cwd(), 'public', 'data', 'content.sqlite');
export const DEFAULT_CHUNK_SIZE = 320;
export const DEFAULT_CHUNK_OVERLAP = 50;

type PdfExtractionResult = {
  page_count: number;
  texts: string[];
};

export type SingleSermonPdfImportOptions = {
  pdfPath: string;
  sqlitePath?: string;
  sermonCode?: string | null;
  title?: string | null;
  date?: string | null;
  location?: string | null;
  scripture?: string | null;
  city?: string | null;
  state?: string | null;
  chunkSize?: number;
  chunkOverlap?: number;
  dryRun?: boolean;
  sourceRootPath?: string | null;
  expectedYear?: number | null;
  importedVia?: string;
  repository?: SermonImportRepository;
};

export type ResolvedSermonPdfImportMetadata = {
  resolvedPdfPath: string;
  pdfFilename: string;
  pdfSourcePath: string;
  sourceRootPath: string | null;
  filenameDerived: SermonFilenameMetadata | null;
  sermonCode: string;
  title: string;
  date: string;
  year: number;
  datePrecision: SermonDatePrecision;
  serviceSuffix: string | null;
};

export type SingleSermonPdfImportPreview = {
  paragraph_number: number;
  printed_paragraph_number: number | null;
  paragraph_text: string;
};

export type SingleSermonPdfImportResult = {
  dryRun: boolean;
  pdfPath: string;
  pdfSourcePath: string;
  sermonCode: string;
  title: string;
  date: string;
  year: number;
  datePrecision: SermonDatePrecision;
  serviceSuffix: string | null;
  paragraphCount: number;
  chunkCount: number;
  pageCount: number;
  titleFromPdf: string | null;
  filenameDerived: SermonFilenameMetadata | null;
  preview: SingleSermonPdfImportPreview[];
};

export type DiscoveredSermonPdfFile = {
  year: string;
  pdfPath: string;
  relativePath: string;
};

export type BatchSermonPdfImportOptions = {
  rootPath: string;
  year?: string | null;
  sqlitePath?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  dryRun?: boolean;
  importedVia?: string;
  importPdf?: (options: SingleSermonPdfImportOptions) => Promise<SingleSermonPdfImportResult>;
};

export type BatchSermonPdfImportYearSummary = {
  year: string;
  total: number;
  succeeded: number;
  failed: number;
};

export type BatchSermonPdfImportFailure = {
  year: string;
  pdfPath: string;
  relativePath: string;
  message: string;
};

export type BatchSermonPdfImportResult = {
  rootPath: string;
  yearFilter: string | null;
  dryRun: boolean;
  totalFiles: number;
  succeededCount: number;
  failedCount: number;
  yearSummaries: BatchSermonPdfImportYearSummary[];
  failures: BatchSermonPdfImportFailure[];
  results: SingleSermonPdfImportResult[];
};

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }

  const fileContent = readFileSync(filePath, 'utf8');
  const lines = fileContent.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    if (!key || process.env[key] != null) {
      continue;
    }

    process.env[key] = stripWrappingQuotes(rawValue);
  }
}

export function loadProjectEnv(): void {
  loadEnvFile(path.resolve(process.cwd(), '.env'));
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function sha256OfFile(filePath: string): string {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

function parseYearFromDateString(value: string): number | null {
  const match = value.match(/^(\d{4})/);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  return Number.isFinite(year) ? year : null;
}

function inferDatePrecisionFromDate(value: string): SermonDatePrecision | null {
  const match = value.match(DATE_PATTERN);
  if (!match) {
    return null;
  }

  const [, , monthPart, dayPart] = match;
  if (monthPart === '00') {
    return 'year';
  }
  if (dayPart === '00') {
    return 'month';
  }
  return 'day';
}

function inferServiceSuffixFromSermonCode(value: string): string | null {
  const match = value.match(/^\d{2}-\d{4}([A-Z])$/i);
  return match ? match[1].toUpperCase() : null;
}

function inferYearFromParentFolder(pdfPath: string): number | null {
  const parentName = path.basename(path.dirname(pdfPath));
  if (!YEAR_FOLDER_PATTERN.test(parentName)) {
    return null;
  }

  return Number.parseInt(parentName, 10);
}

function normalizeRelativePath(value: string): string {
  return value.split(path.sep).join('/');
}

function ensureConsistentYear(
  firstLabel: string,
  firstValue: number | null,
  secondLabel: string,
  secondValue: number | null
): void {
  if (firstValue == null || secondValue == null || firstValue === secondValue) {
    return;
  }

  throw new Error(`Year mismatch: ${firstLabel} ${firstValue} does not match ${secondLabel} ${secondValue}.`);
}

function resolvePdfSourcePath(resolvedPdfPath: string, sourceRootPath: string | null): string {
  if (sourceRootPath) {
    const relativePath = path.relative(sourceRootPath, resolvedPdfPath);
    if (
      !relativePath ||
      relativePath.startsWith('..') ||
      path.isAbsolute(relativePath)
    ) {
      throw new Error(`Resolved PDF "${resolvedPdfPath}" is not inside source root "${sourceRootPath}".`);
    }

    return normalizeRelativePath(relativePath);
  }

  const parentYear = path.basename(path.dirname(resolvedPdfPath));
  if (YEAR_FOLDER_PATTERN.test(parentYear)) {
    return `${parentYear}/${path.basename(resolvedPdfPath)}`;
  }

  return path.basename(resolvedPdfPath);
}

export function resolveSermonPdfImportMetadata(
  options: Pick<
    SingleSermonPdfImportOptions,
    'pdfPath' | 'sermonCode' | 'title' | 'date' | 'sourceRootPath' | 'expectedYear'
  >
): ResolvedSermonPdfImportMetadata {
  const resolvedPdfPath = path.resolve(options.pdfPath);
  const pdfFilename = path.basename(resolvedPdfPath);
  const fileStem = path.basename(resolvedPdfPath, path.extname(resolvedPdfPath));
  const sourceRootPath = options.sourceRootPath ? path.resolve(options.sourceRootPath) : null;
  let filenameDerived: SermonFilenameMetadata | null = null;

  try {
    filenameDerived = parseSermonMetadataFromFilenameStem(fileStem);
  } catch (error) {
    const hasAllOverrides =
      options.sermonCode != null &&
      options.title != null &&
      options.date != null;

    if (!hasAllOverrides) {
      throw error;
    }
  }

  const sermonCode = options.sermonCode ?? filenameDerived?.sermonCode;
  const title = options.title ?? filenameDerived?.title;
  const date = options.date ?? filenameDerived?.date;

  if (!sermonCode || !title || !date) {
    throw new Error(
      'Could not resolve sermon metadata. Provide --sermon-code, --title, and --date or use filename format YY-MMDD[Suffix] Title [VGR], YY-MM00 Title [VGR], or YY-0000 Title [VGR].'
    );
  }

  const folderYear = options.expectedYear ?? inferYearFromParentFolder(resolvedPdfPath);
  const dateYear = parseYearFromDateString(date);

  ensureConsistentYear('folder year', folderYear, 'filename year', filenameDerived?.year ?? null);
  ensureConsistentYear('folder year', folderYear, 'resolved date year', dateYear);
  ensureConsistentYear('filename year', filenameDerived?.year ?? null, 'resolved date year', dateYear);

  const year = folderYear ?? filenameDerived?.year ?? dateYear;
  if (year == null) {
    throw new Error(`Could not resolve sermon year for "${resolvedPdfPath}".`);
  }

  return {
    resolvedPdfPath,
    pdfFilename,
    pdfSourcePath: resolvePdfSourcePath(resolvedPdfPath, sourceRootPath),
    sourceRootPath,
    filenameDerived,
    sermonCode,
    title,
    date,
    year,
    datePrecision: filenameDerived?.datePrecision ?? inferDatePrecisionFromDate(date) ?? 'day',
    serviceSuffix: filenameDerived?.serviceSuffix ?? inferServiceSuffixFromSermonCode(sermonCode),
  };
}

export function extractPdfTextWithPython(pdfPath: string): PdfExtractionResult {
  const pythonProgram = `
import json
import sys

try:
    from pypdf import PdfReader
except Exception:
    sys.stderr.write('Missing Python dependency: pypdf. Install with: pip install pypdf\\n')
    sys.exit(2)

pdf_path = sys.argv[1]
reader = PdfReader(pdf_path)
texts = []
for page in reader.pages:
    texts.append(page.extract_text() or '')

print(json.dumps({'page_count': len(reader.pages), 'texts': texts}, ensure_ascii=True))
`;

  const result = spawnSync('python', ['-c', pythonProgram, pdfPath], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || 'Python PDF extraction failed');
  }

  const output = result.stdout?.trim();
  if (!output) {
    throw new Error('PDF extraction returned empty output');
  }

  const parsed = JSON.parse(output) as PdfExtractionResult;
  if (!Array.isArray(parsed.texts)) {
    throw new Error('Unexpected PDF extraction payload');
  }

  return parsed;
}

export function createSqliteSermonImportRepository(sqlitePath: string): SermonImportRepository {
  const resolvedPath = path.resolve(sqlitePath);
  mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const db = new DatabaseSync(resolvedPath);
  db.exec(CONTENT_SCHEMA_SQL);

  function rebuildSearchDocumentsForSermon(sermonId: string): void {
    db.prepare('DELETE FROM search_documents WHERE sermon_id = ?').run(sermonId);

    const sermon = db.prepare(`
      SELECT id, title, scripture, location
      FROM sermons
      WHERE id = ?
      LIMIT 1
    `).get(sermonId) as { id: string; title: string | null; scripture: string | null; location: string | null } | undefined;

    if (!sermon) {
      return;
    }

    const insertSearch = db.prepare(`
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
    `);

    const insertSurface = (source: 'title' | 'scripture' | 'location', value: string | null) => {
      if (!value) {
        return;
      }

      insertSearch.run(
        `${sermon.id}:${source}`,
        sermon.id,
        source,
        null,
        null,
        null,
        null,
        value,
        normalizeSearchText(value),
        value
      );
    };

    insertSurface('title', sermon.title);
    insertSurface('scripture', sermon.scripture);
    insertSurface('location', sermon.location);

    const paragraphRows = db.prepare(`
      SELECT paragraph_number, printed_paragraph_number, paragraph_text
      FROM sermon_paragraphs
      WHERE sermon_id = ?
      ORDER BY paragraph_number ASC
    `).all(sermonId) as Array<{
      paragraph_number: number;
      printed_paragraph_number: number | null;
      paragraph_text: string;
    }>;

    for (const paragraph of paragraphRows) {
      const chunkTotal = db.prepare(`
        SELECT COUNT(*) AS total
        FROM sermon_chunks
        WHERE sermon_id = ? AND paragraph_number = ?
      `).get(sermonId, paragraph.paragraph_number) as { total: number };

      insertSearch.run(
        `${sermon.id}:para:${paragraph.paragraph_number}`,
        sermon.id,
        'paragraph_text',
        paragraph.paragraph_number,
        paragraph.printed_paragraph_number,
        null,
        chunkTotal.total || null,
        paragraph.paragraph_text,
        normalizeSearchText(paragraph.paragraph_text),
        paragraph.paragraph_text.slice(0, 240)
      );
    }
  }

  return {
    async findSermonByCode(sermonCode: string): Promise<{ id: string } | null> {
      const row = db.prepare('SELECT id FROM sermons WHERE sermon_code = ? LIMIT 1').get(sermonCode) as { id: string } | undefined;
      return row ? { id: row.id } : null;
    },

    async insertSermon(payload: SermonPayload): Promise<{ id: string }> {
      const id = randomUUID();
      db.prepare(`
        INSERT INTO sermons(
          id, sermon_code, title, summary, date, year, location, city, state, scripture, tags_json, text_content
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        payload.sermon_code,
        payload.title,
        null,
        payload.date,
        payload.year,
        payload.location,
        payload.city,
        payload.state,
        payload.scripture,
        JSON.stringify(payload.tags ?? []),
        payload.text_content
      );
      return { id };
    },

    async insertSermonDocument(sermonId: string, payload: SermonDocumentPayload): Promise<void> {
      db.prepare(`
        INSERT INTO sermon_documents(
          id, sermon_id, pdf_source_path, pdf_filename, pdf_sha256, page_count, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        sermonId,
        payload.pdf_source_path,
        payload.pdf_filename,
        payload.pdf_sha256,
        payload.page_count,
        JSON.stringify(payload.metadata ?? {})
      );
    },

    async insertSermonParagraphs(
      sermonId: string,
      paragraphs: SermonParagraphPayload[]
    ): Promise<Array<{ id: number; paragraph_number: number }>> {
      const insertedRows: Array<{ id: number; paragraph_number: number }> = [];
      const statement = db.prepare(`
        INSERT INTO sermon_paragraphs(
          sermon_id, paragraph_number, printed_paragraph_number, paragraph_text
        ) VALUES (?, ?, ?, ?)
      `);

      for (const paragraph of paragraphs) {
        const result = statement.run(
          sermonId,
          paragraph.paragraph_number,
          paragraph.printed_paragraph_number,
          paragraph.paragraph_text
        );

        insertedRows.push({
          id: Number(result.lastInsertRowid),
          paragraph_number: paragraph.paragraph_number,
        });
      }

      return insertedRows;
    },

    async insertSermonChunks(
      sermonId: string,
      chunks: Array<SermonChunkSeed & { paragraph_id: number }>
    ): Promise<void> {
      const statement = db.prepare(`
        INSERT INTO sermon_chunks(
          sermon_id, paragraph_id, paragraph_number, chunk_index, chunk_text, chunk_start, chunk_end
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const chunk of chunks) {
        statement.run(
          sermonId,
          chunk.paragraph_id,
          chunk.paragraph_number,
          chunk.chunk_index,
          chunk.chunk_text,
          chunk.chunk_start,
          chunk.chunk_end
        );
      }

      rebuildSearchDocumentsForSermon(sermonId);
    },
  };
}

export async function importSermonPdf(
  options: SingleSermonPdfImportOptions
): Promise<SingleSermonPdfImportResult> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
  const dryRun = options.dryRun ?? false;
  const sqlitePath = options.sqlitePath ?? DEFAULT_SQLITE_PATH;
  const metadata = resolveSermonPdfImportMetadata(options);

  const extraction = extractPdfTextWithPython(metadata.resolvedPdfPath);
  const parsed = parseSermonParagraphsFromExtractedPages(extraction.texts);
  if (parsed.paragraphs.length === 0) {
    throw new Error('No paragraphs parsed from the PDF text');
  }

  const canonicalText = buildCanonicalSermonText(parsed.paragraphs);
  const chunkSeeds: SermonChunkSeed[] = parsed.paragraphs.flatMap((paragraph) =>
    chunkParagraphText(paragraph.paragraph_text, chunkSize, chunkOverlap).map((chunk) => ({
      paragraph_number: paragraph.paragraph_number,
      chunk_index: chunk.chunk_index,
      chunk_text: chunk.chunk_text,
      chunk_start: chunk.chunk_start,
      chunk_end: chunk.chunk_end,
    }))
  );

  const preview = parsed.paragraphs.slice(0, 4).map((paragraph) => ({
    paragraph_number: paragraph.paragraph_number,
    printed_paragraph_number: paragraph.printed_paragraph_number,
    paragraph_text: paragraph.paragraph_text.slice(0, 120),
  }));

  if (dryRun) {
    return {
      dryRun: true,
      pdfPath: metadata.resolvedPdfPath,
      pdfSourcePath: metadata.pdfSourcePath,
      sermonCode: metadata.sermonCode,
      title: metadata.title,
      date: metadata.date,
      year: metadata.year,
      datePrecision: metadata.datePrecision,
      serviceSuffix: metadata.serviceSuffix,
      paragraphCount: parsed.paragraphs.length,
      chunkCount: chunkSeeds.length,
      pageCount: extraction.page_count,
      titleFromPdf: parsed.title_from_pdf,
      filenameDerived: metadata.filenameDerived,
      preview,
    };
  }

  const sermonPayload: SermonPayload = {
    sermon_code: metadata.sermonCode,
    title: metadata.title,
    date: metadata.date,
    year: metadata.year,
    location: options.location ?? null,
    scripture: options.scripture ?? null,
    city: options.city ?? null,
    state: options.state ?? null,
    text_content: canonicalText,
    tags: [],
  };

  const sermonDocumentPayload: SermonDocumentPayload = {
    pdf_source_path: metadata.pdfSourcePath,
    pdf_filename: metadata.pdfFilename,
    pdf_sha256: sha256OfFile(metadata.resolvedPdfPath),
    page_count: extraction.page_count,
    metadata: {
      local_pdf_path: metadata.resolvedPdfPath,
      source_root_path: metadata.sourceRootPath,
      title_from_pdf: parsed.title_from_pdf,
      imported_via: options.importedVia ?? 'scripts/import-sermon-pdf.ts',
      chunk_size: chunkSize,
      chunk_overlap: chunkOverlap,
      filename_derived: metadata.filenameDerived,
      date_precision: metadata.datePrecision,
      service_suffix: metadata.serviceSuffix,
    },
  };

  const paragraphPayloads: SermonParagraphPayload[] = parsed.paragraphs.map((paragraph) => ({
    paragraph_number: paragraph.paragraph_number,
    printed_paragraph_number: paragraph.printed_paragraph_number,
    paragraph_text: paragraph.paragraph_text,
  }));

  const repository = options.repository ?? createSqliteSermonImportRepository(sqlitePath);
  await persistSermonImport({
    repository,
    sermonPayload,
    sermonDocumentPayload,
    paragraphPayloads,
    chunkSeeds,
  });

  return {
    dryRun: false,
    pdfPath: metadata.resolvedPdfPath,
    pdfSourcePath: metadata.pdfSourcePath,
    sermonCode: metadata.sermonCode,
    title: metadata.title,
    date: metadata.date,
    year: metadata.year,
    datePrecision: metadata.datePrecision,
    serviceSuffix: metadata.serviceSuffix,
    paragraphCount: parsed.paragraphs.length,
    chunkCount: chunkSeeds.length,
    pageCount: extraction.page_count,
    titleFromPdf: parsed.title_from_pdf,
    filenameDerived: metadata.filenameDerived,
    preview,
  };
}

export function discoverSermonPdfFiles(rootPath: string, yearFilter?: string | null): DiscoveredSermonPdfFile[] {
  const resolvedRootPath = path.resolve(rootPath);
  if (!existsSync(resolvedRootPath)) {
    throw new Error(`Sermon root "${resolvedRootPath}" does not exist.`);
  }

  const yearFolders = yearFilter
    ? [yearFilter]
    : readdirSync(resolvedRootPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && YEAR_FOLDER_PATTERN.test(entry.name))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));

  const files: DiscoveredSermonPdfFile[] = [];

  for (const yearFolder of yearFolders) {
    if (!YEAR_FOLDER_PATTERN.test(yearFolder)) {
      throw new Error(`Invalid year folder "${yearFolder}". Expected YYYY.`);
    }

    const yearPath = path.join(resolvedRootPath, yearFolder);
    if (!existsSync(yearPath)) {
      throw new Error(`Year folder "${yearPath}" does not exist.`);
    }

    const pdfFiles = readdirSync(yearPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    for (const pdfFile of pdfFiles) {
      files.push({
        year: yearFolder,
        pdfPath: path.join(yearPath, pdfFile),
        relativePath: `${yearFolder}/${pdfFile}`,
      });
    }
  }

  return files;
}

export async function runBatchSermonPdfImport(
  options: BatchSermonPdfImportOptions
): Promise<BatchSermonPdfImportResult> {
  const rootPath = path.resolve(options.rootPath);
  const dryRun = options.dryRun ?? false;
  const files = discoverSermonPdfFiles(rootPath, options.year ?? null);
  const results: SingleSermonPdfImportResult[] = [];
  const failures: BatchSermonPdfImportFailure[] = [];
  const importPdf = options.importPdf ?? importSermonPdf;
  const yearSummaries = new Map<string, BatchSermonPdfImportYearSummary>();

  for (const file of files) {
    if (!yearSummaries.has(file.year)) {
      yearSummaries.set(file.year, {
        year: file.year,
        total: 0,
        succeeded: 0,
        failed: 0,
      });
    }

    yearSummaries.get(file.year)!.total += 1;
  }

  for (const file of files) {
    const year = Number.parseInt(file.year, 10);
    const yearSummary = yearSummaries.get(file.year);

    try {
      const result = await importPdf({
        pdfPath: file.pdfPath,
        sqlitePath: options.sqlitePath ?? DEFAULT_SQLITE_PATH,
        chunkSize: options.chunkSize ?? DEFAULT_CHUNK_SIZE,
        chunkOverlap: options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP,
        dryRun,
        sourceRootPath: rootPath,
        expectedYear: Number.isFinite(year) ? year : null,
        importedVia: options.importedVia ?? 'scripts/import-sermon-pdfs.ts',
      });

      results.push(result);
      if (yearSummary) {
        yearSummary.succeeded += 1;
      }
    } catch (error) {
      failures.push({
        year: file.year,
        pdfPath: file.pdfPath,
        relativePath: file.relativePath,
        message: error instanceof Error ? error.message : String(error),
      });

      if (yearSummary) {
        yearSummary.failed += 1;
      }
    }
  }

  return {
    rootPath,
    yearFilter: options.year ?? null,
    dryRun,
    totalFiles: files.length,
    succeededCount: results.length,
    failedCount: failures.length,
    yearSummaries: [...yearSummaries.values()].sort((left, right) => left.year.localeCompare(right.year)),
    failures,
    results,
  };
}

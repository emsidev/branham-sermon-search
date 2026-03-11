#!/usr/bin/env -S node --import tsx

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import {
  buildCanonicalSermonText,
  chunkParagraphText,
  parseSermonParagraphsFromExtractedPages,
} from '../src/lib/sermonImport';
import { parseSermonMetadataFromFilenameStem } from '../src/lib/sermonFilenameMetadata';
import {
  persistSermonImport,
  type SermonChunkSeed,
  type SermonDocumentPayload,
  type SermonImportRepository,
  type SermonParagraphPayload,
  type SermonPayload,
} from '../src/lib/sermonPdfImportPersistence';

type ParsedArgs = {
  pdfPath: string;
  sermonCode: string | null;
  title: string | null;
  date: string | null;
  location: string | null;
  scripture: string | null;
  city: string | null;
  state: string | null;
  chunkSize: number;
  chunkOverlap: number;
  dryRun: boolean;
};

type PdfExtractionResult = {
  page_count: number;
  texts: string[];
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

function loadProjectEnv(): void {
  loadEnvFile(path.resolve(process.cwd(), '.env'));
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));
}

function usage(): string {
  return [
    'Usage: npm run import:sermon-pdf -- --pdf <path> [options]',
    '',
    'Options:',
    '  --sermon-code <code>    Override filename-derived code',
    '  --title <title>         Override filename-derived title',
    '  --date <yyyy-mm-dd>     Override filename-derived date',
    '  --location <text>',
    '  --scripture <text>',
    '  --city <text>',
    '  --state <text>',
    '  --chunk-size <number>   Default: 320',
    '  --chunk-overlap <num>   Default: 50',
    '  --dry-run               Parse and preview only, no DB writes',
    '',
    'Environment:',
    '  SUPABASE_URL or VITE_SUPABASE_URL',
    '  SUPABASE_SERVICE_ROLE_KEY',
  ].join('\n');
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = new Map<string, string>();
  const flags = new Set<string>();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }

    if (token === '--dry-run' || token === '--help') {
      flags.add(token);
      continue;
    }

    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${token}`);
    }

    args.set(token, value);
    i += 1;
  }

  if (flags.has('--help')) {
    console.log(usage());
    process.exit(0);
  }

  const pdfPath = args.get('--pdf');
  if (!pdfPath) {
    throw new Error('Missing required --pdf argument');
  }

  return {
    pdfPath,
    sermonCode: args.get('--sermon-code') ?? null,
    title: args.get('--title') ?? null,
    date: args.get('--date') ?? null,
    location: args.get('--location') ?? null,
    scripture: args.get('--scripture') ?? null,
    city: args.get('--city') ?? null,
    state: args.get('--state') ?? null,
    chunkSize: Number.parseInt(args.get('--chunk-size') ?? '320', 10),
    chunkOverlap: Number.parseInt(args.get('--chunk-overlap') ?? '50', 10),
    dryRun: flags.has('--dry-run'),
  };
}

function extractPdfTextWithPython(pdfPath: string): PdfExtractionResult {
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

function sha256OfFile(filePath: string): string {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

function createSermonImportRepository(supabaseUrl: string, serviceRoleKey: string): SermonImportRepository {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return {
    async findSermonByCode(sermonCode: string): Promise<{ id: string } | null> {
      const { data, error } = await supabase
        .from('sermons')
        .select('id')
        .eq('sermon_code', sermonCode)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to check existing sermon code: ${error.message}`);
      }

      return data ? { id: data.id as string } : null;
    },

    async insertSermon(payload: SermonPayload): Promise<{ id: string }> {
      const { data, error } = await supabase
        .from('sermons')
        .insert(payload)
        .select('id')
        .single();

      if (error || !data) {
        throw new Error(`Failed to insert sermon: ${error?.message ?? 'unknown error'}`);
      }

      return { id: data.id as string };
    },

    async insertSermonDocument(sermonId: string, payload: SermonDocumentPayload): Promise<void> {
      const { error } = await supabase
        .from('sermon_documents')
        .insert({
          sermon_id: sermonId,
          ...payload,
        });

      if (error) {
        throw new Error(`Failed to insert sermon document: ${error.message}`);
      }
    },

    async insertSermonParagraphs(
      sermonId: string,
      paragraphs: SermonParagraphPayload[]
    ): Promise<Array<{ id: number; paragraph_number: number }>> {
      const { data, error } = await supabase
        .from('sermon_paragraphs')
        .insert(
          paragraphs.map((paragraph) => ({
            sermon_id: sermonId,
            paragraph_number: paragraph.paragraph_number,
            printed_paragraph_number: paragraph.printed_paragraph_number,
            paragraph_text: paragraph.paragraph_text,
          }))
        )
        .select('id,paragraph_number');

      if (error || !data) {
        throw new Error(`Failed to insert sermon paragraphs: ${error?.message ?? 'unknown error'}`);
      }

      return data as Array<{ id: number; paragraph_number: number }>;
    },

    async insertSermonChunks(
      sermonId: string,
      chunks: Array<SermonChunkSeed & { paragraph_id: number }>
    ): Promise<void> {
      const { error } = await supabase
        .from('sermon_chunks')
        .insert(
          chunks.map((chunk) => ({
            sermon_id: sermonId,
            paragraph_id: chunk.paragraph_id,
            paragraph_number: chunk.paragraph_number,
            chunk_index: chunk.chunk_index,
            chunk_text: chunk.chunk_text,
            chunk_start: chunk.chunk_start,
            chunk_end: chunk.chunk_end,
          }))
        );

      if (error) {
        throw new Error(`Failed to insert sermon chunks: ${error.message}`);
      }
    },
  };
}

export async function run(): Promise<void> {
  loadProjectEnv();
  const options = parseArgs(process.argv.slice(2));
  const resolvedPdfPath = path.resolve(options.pdfPath);
  const fileName = path.basename(resolvedPdfPath);
  const fileStem = path.basename(resolvedPdfPath, path.extname(resolvedPdfPath));
  let filenameDerived: ReturnType<typeof parseSermonMetadataFromFilenameStem> | null = null;

  try {
    filenameDerived = parseSermonMetadataFromFilenameStem(fileStem);
  } catch (error) {
    const hasAllOverrides = options.sermonCode != null && options.title != null && options.date != null;
    if (!hasAllOverrides) {
      throw error;
    }
  }

  const resolvedSermonCode = options.sermonCode ?? filenameDerived?.sermonCode;
  const resolvedTitle = options.title ?? filenameDerived?.title;
  const resolvedDate = options.date ?? filenameDerived?.date;

  if (!resolvedSermonCode || !resolvedTitle || !resolvedDate) {
    throw new Error(
      'Could not resolve sermon metadata. Provide --sermon-code, --title, and --date or use filename format YY-MMDD Title [VGR].'
    );
  }

  const extraction = extractPdfTextWithPython(resolvedPdfPath);

  const parsed = parseSermonParagraphsFromExtractedPages(extraction.texts);
  if (parsed.paragraphs.length === 0) {
    throw new Error('No paragraphs parsed from the PDF text');
  }

  const canonicalText = buildCanonicalSermonText(parsed.paragraphs);

  const chunkSeeds: SermonChunkSeed[] = parsed.paragraphs.flatMap((paragraph) =>
    chunkParagraphText(paragraph.paragraph_text, options.chunkSize, options.chunkOverlap).map((chunk) => ({
      paragraph_number: paragraph.paragraph_number,
      chunk_index: chunk.chunk_index,
      chunk_text: chunk.chunk_text,
      chunk_start: chunk.chunk_start,
      chunk_end: chunk.chunk_end,
    }))
  );

  console.log(
    `Parsed ${parsed.paragraphs.length} paragraphs and ${chunkSeeds.length} chunks from ${resolvedPdfPath}`
  );

  if (options.dryRun) {
    const preview = parsed.paragraphs.slice(0, 4).map((paragraph) => ({
      paragraph_number: paragraph.paragraph_number,
      printed_paragraph_number: paragraph.printed_paragraph_number,
      paragraph_text: paragraph.paragraph_text.slice(0, 120),
    }));

    console.log(
      JSON.stringify(
        {
          derived_from_filename: filenameDerived,
          import_values: {
            sermon_code: resolvedSermonCode,
            title: resolvedTitle,
            date: resolvedDate,
          },
          title_from_pdf: parsed.title_from_pdf,
          preview,
          chunk_size: options.chunkSize,
          chunk_overlap: options.chunkOverlap,
        },
        null,
        2
      )
    );
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const sermonPayload: SermonPayload = {
    sermon_code: resolvedSermonCode,
    title: resolvedTitle,
    date: resolvedDate,
    location: options.location,
    scripture: options.scripture,
    city: options.city,
    state: options.state,
    text_content: canonicalText,
    tags: [],
  };

  const sermonDocumentPayload: SermonDocumentPayload = {
    pdf_source_path: fileName,
    pdf_filename: fileName,
    pdf_sha256: sha256OfFile(resolvedPdfPath),
    page_count: extraction.page_count,
    metadata: {
      local_pdf_path: resolvedPdfPath,
      title_from_pdf: parsed.title_from_pdf,
      imported_via: 'scripts/import-sermon-pdf.ts',
      chunk_size: options.chunkSize,
      chunk_overlap: options.chunkOverlap,
      filename_derived: filenameDerived,
    },
  };

  const paragraphPayloads: SermonParagraphPayload[] = parsed.paragraphs.map((paragraph) => ({
    paragraph_number: paragraph.paragraph_number,
    printed_paragraph_number: paragraph.printed_paragraph_number,
    paragraph_text: paragraph.paragraph_text,
  }));

  const repository = createSermonImportRepository(supabaseUrl, serviceRoleKey);
  const result = await persistSermonImport({
    repository,
    sermonPayload,
    sermonDocumentPayload,
    paragraphPayloads,
    chunkSeeds,
  });

  console.log(
    `Imported sermon ${resolvedSermonCode}: ${result.insertedParagraphCount} paragraphs, ${result.insertedChunkCount} chunks`
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

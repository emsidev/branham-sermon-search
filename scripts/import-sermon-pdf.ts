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

type ParsedArgs = {
  pdfPath: string;
  sermonCode: string;
  title: string;
  date: string;
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

function deriveTitleFromFilename(filePath: string): string {
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  let title = baseName.trim();

  // Strip leading sermon code like "58-0105".
  title = title.replace(/^\d{2,4}-\d{2,4}(?:[\s_-]+)?/, '');
  // Strip trailing source marker like "VGR".
  title = title.replace(/(?:[\s_-]+)VGR$/i, '');

  return title.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

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
    '  --sermon-code <code>    Default: 58-0105',
    '  --title <title>         Default: Have Faith In God',
    '  --date <yyyy-mm-dd>     Default: 1958-01-05',
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
    sermonCode: args.get('--sermon-code') ?? '58-0105',
    title: args.get('--title') ?? 'Have Faith In God',
    date: args.get('--date') ?? '1958-01-05',
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

async function run(): Promise<void> {
  loadProjectEnv();
  const options = parseArgs(process.argv.slice(2));
  const resolvedPdfPath = path.resolve(options.pdfPath);
  const extraction = extractPdfTextWithPython(resolvedPdfPath);
  const titleFromFilename = deriveTitleFromFilename(resolvedPdfPath);

  const parsed = parseSermonParagraphsFromExtractedPages(extraction.texts);
  if (parsed.paragraphs.length === 0) {
    throw new Error('No paragraphs parsed from the PDF text');
  }

  const canonicalText = buildCanonicalSermonText(parsed.paragraphs);

  const chunks = parsed.paragraphs.flatMap((paragraph) =>
    chunkParagraphText(paragraph.paragraph_text, options.chunkSize, options.chunkOverlap).map((chunk) => ({
      paragraph_number: paragraph.paragraph_number,
      chunk_index: chunk.chunk_index,
      chunk_text: chunk.chunk_text,
      chunk_start: chunk.chunk_start,
      chunk_end: chunk.chunk_end,
    }))
  );

  console.log(`Parsed ${parsed.paragraphs.length} paragraphs and ${chunks.length} chunks from ${resolvedPdfPath}`);

  if (options.dryRun) {
    const preview = parsed.paragraphs.slice(0, 4).map((paragraph) => ({
      paragraph_number: paragraph.paragraph_number,
      printed_paragraph_number: paragraph.printed_paragraph_number,
      paragraph_text: paragraph.paragraph_text.slice(0, 120),
    }));

    console.log(JSON.stringify({
      sermon_code: options.sermonCode,
      title_from_pdf: parsed.title_from_pdf,
      preview,
      chunk_size: options.chunkSize,
      chunk_overlap: options.chunkOverlap,
    }, null, 2));
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const sermonPayload = {
    sermon_code: options.sermonCode,
    title: titleFromFilename || options.title,
    date: options.date,
    location: options.location,
    scripture: options.scripture,
    city: options.city,
    state: options.state,
    text_content: canonicalText,
    tags: [],
  };

  const { data: sermonRow, error: sermonError } = await supabase
    .from('sermons')
    .upsert(sermonPayload, { onConflict: 'sermon_code' })
    .select('id')
    .single();

  if (sermonError || !sermonRow) {
    throw new Error(`Failed to upsert sermon: ${sermonError?.message ?? 'unknown error'}`);
  }

  const sermonId = sermonRow.id as string;
  const fileName = path.basename(resolvedPdfPath);

  const { error: docError } = await supabase
    .from('sermon_documents')
    .upsert({
      sermon_id: sermonId,
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
      },
    }, { onConflict: 'sermon_id' });

  if (docError) {
    throw new Error(`Failed to upsert sermon document: ${docError.message}`);
  }

  const { error: deleteChunksError } = await supabase
    .from('sermon_chunks')
    .delete()
    .eq('sermon_id', sermonId);

  if (deleteChunksError) {
    throw new Error(`Failed to delete existing sermon chunks: ${deleteChunksError.message}`);
  }

  const { error: deleteParagraphsError } = await supabase
    .from('sermon_paragraphs')
    .delete()
    .eq('sermon_id', sermonId);

  if (deleteParagraphsError) {
    throw new Error(`Failed to delete existing sermon paragraphs: ${deleteParagraphsError.message}`);
  }

  const { data: paragraphRows, error: paragraphInsertError } = await supabase
    .from('sermon_paragraphs')
    .insert(parsed.paragraphs.map((paragraph) => ({
      sermon_id: sermonId,
      paragraph_number: paragraph.paragraph_number,
      printed_paragraph_number: paragraph.printed_paragraph_number,
      paragraph_text: paragraph.paragraph_text,
    })))
    .select('id,paragraph_number');

  if (paragraphInsertError || !paragraphRows) {
    throw new Error(`Failed to insert sermon paragraphs: ${paragraphInsertError?.message ?? 'unknown error'}`);
  }

  const paragraphIdByNumber = new Map<number, number>();
  for (const row of paragraphRows as Array<{ id: number; paragraph_number: number }>) {
    paragraphIdByNumber.set(row.paragraph_number, row.id);
  }

  const chunkRows = parsed.paragraphs.flatMap((paragraph) => {
    const paragraphId = paragraphIdByNumber.get(paragraph.paragraph_number);
    if (!paragraphId) {
      throw new Error(`Missing paragraph id for paragraph ${paragraph.paragraph_number}`);
    }

    return chunkParagraphText(paragraph.paragraph_text, options.chunkSize, options.chunkOverlap).map((chunk) => ({
      sermon_id: sermonId,
      paragraph_id: paragraphId,
      paragraph_number: paragraph.paragraph_number,
      chunk_index: chunk.chunk_index,
      chunk_text: chunk.chunk_text,
      chunk_start: chunk.chunk_start,
      chunk_end: chunk.chunk_end,
    }));
  });

  if (chunkRows.length > 0) {
    const { error: chunkInsertError } = await supabase
      .from('sermon_chunks')
      .insert(chunkRows);

    if (chunkInsertError) {
      throw new Error(`Failed to insert sermon chunks: ${chunkInsertError.message}`);
    }
  }

  console.log(`Imported sermon ${options.sermonCode}: ${parsed.paragraphs.length} paragraphs, ${chunkRows.length} chunks`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

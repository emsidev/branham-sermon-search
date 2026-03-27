#!/usr/bin/env -S node --import tsx

import {
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_SQLITE_PATH,
  importSermonPdf,
  loadProjectEnv,
} from './sermonPdfImport';

type ParsedArgs = {
  pdfPath: string;
  sqlitePath: string;
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

function usage(): string {
  return [
    'Usage: npm run import:sermon-pdf -- --pdf <path> [options]',
    '',
    'Options:',
    `  --sqlite <path>         SQLite file path (default: ${DEFAULT_SQLITE_PATH})`,
    '  --sermon-code <code>    Override filename-derived code',
    '  --title <title>         Override filename-derived title',
    '  --date <yyyy-mm-dd>     Override filename-derived date (partial dates like yyyy-mm-00 are allowed)',
    '  --location <text>',
    '  --scripture <text>',
    '  --city <text>',
    '  --state <text>',
    `  --chunk-size <number>   Default: ${DEFAULT_CHUNK_SIZE}`,
    `  --chunk-overlap <num>   Default: ${DEFAULT_CHUNK_OVERLAP}`,
    '  --dry-run               Parse and preview only, no DB writes',
  ].join('\n');
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    if (token === '--dry-run' || token === '--help') {
      flags.add(token);
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${token}`);
    }

    args.set(token, value);
    index += 1;
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
    sqlitePath: args.get('--sqlite') ?? DEFAULT_SQLITE_PATH,
    sermonCode: args.get('--sermon-code') ?? null,
    title: args.get('--title') ?? null,
    date: args.get('--date') ?? null,
    location: args.get('--location') ?? null,
    scripture: args.get('--scripture') ?? null,
    city: args.get('--city') ?? null,
    state: args.get('--state') ?? null,
    chunkSize: Number.parseInt(args.get('--chunk-size') ?? String(DEFAULT_CHUNK_SIZE), 10),
    chunkOverlap: Number.parseInt(args.get('--chunk-overlap') ?? String(DEFAULT_CHUNK_OVERLAP), 10),
    dryRun: flags.has('--dry-run'),
  };
}

export async function run(): Promise<void> {
  loadProjectEnv();
  const options = parseArgs(process.argv.slice(2));
  const result = await importSermonPdf({
    pdfPath: options.pdfPath,
    sqlitePath: options.sqlitePath,
    sermonCode: options.sermonCode,
    title: options.title,
    date: options.date,
    location: options.location,
    scripture: options.scripture,
    city: options.city,
    state: options.state,
    chunkSize: options.chunkSize,
    chunkOverlap: options.chunkOverlap,
    dryRun: options.dryRun,
    importedVia: 'scripts/import-sermon-pdf.ts',
  });

  console.log(`Parsed ${result.paragraphCount} paragraphs and ${result.chunkCount} chunks from ${result.pdfPath}`);

  if (result.dryRun) {
    console.log(
      JSON.stringify(
        {
          derived_from_filename: result.filenameDerived,
          import_values: {
            sermon_code: result.sermonCode,
            title: result.title,
            date: result.date,
            year: result.year,
            date_precision: result.datePrecision,
            service_suffix: result.serviceSuffix,
          },
          title_from_pdf: result.titleFromPdf,
          pdf_source_path: result.pdfSourcePath,
          preview: result.preview,
          chunk_size: options.chunkSize,
          chunk_overlap: options.chunkOverlap,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`Imported sermon ${result.sermonCode} to SQLite: ${result.paragraphCount} paragraphs, ${result.chunkCount} chunks`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

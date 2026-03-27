#!/usr/bin/env -S node --import tsx

import path from 'node:path';
import {
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_SQLITE_PATH,
  discoverSermonPdfFiles,
  importSermonPdf,
  loadProjectEnv,
  runBatchSermonPdfImport,
} from './sermonPdfImport';

type ParsedArgs = {
  rootPath: string;
  year: string | null;
  sqlitePath: string;
  chunkSize: number;
  chunkOverlap: number;
  dryRun: boolean;
};

function usage(): string {
  return [
    'Usage: npm run import:sermon-pdfs -- --root <path> [options]',
    '',
    'Options:',
    `  --sqlite <path>         SQLite file path (default: ${DEFAULT_SQLITE_PATH})`,
    '  --year <yyyy>          Limit import to one year folder',
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

  const rootPath = args.get('--root');
  if (!rootPath) {
    throw new Error('Missing required --root argument');
  }

  return {
    rootPath,
    year: args.get('--year') ?? null,
    sqlitePath: args.get('--sqlite') ?? DEFAULT_SQLITE_PATH,
    chunkSize: Number.parseInt(args.get('--chunk-size') ?? String(DEFAULT_CHUNK_SIZE), 10),
    chunkOverlap: Number.parseInt(args.get('--chunk-overlap') ?? String(DEFAULT_CHUNK_OVERLAP), 10),
    dryRun: flags.has('--dry-run'),
  };
}

export async function run(): Promise<void> {
  loadProjectEnv();
  const options = parseArgs(process.argv.slice(2));
  const discovered = discoverSermonPdfFiles(options.rootPath, options.year);
  if (discovered.length === 0) {
    throw new Error(`No PDF files found under "${path.resolve(options.rootPath)}".`);
  }

  const totalsByYear = new Map<string, number>();
  for (const file of discovered) {
    totalsByYear.set(file.year, (totalsByYear.get(file.year) ?? 0) + 1);
  }

  const relativePathByPdfPath = new Map(
    discovered.map((file) => [path.resolve(file.pdfPath), file.relativePath])
  );

  console.log(
    `Discovered ${discovered.length} PDF files under ${path.resolve(options.rootPath)}`
  );
  for (const [year, total] of [...totalsByYear.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`  - ${year}: ${total}`);
  }

  let index = 0;
  const totalFiles = discovered.length;

  const result = await runBatchSermonPdfImport({
    rootPath: options.rootPath,
    year: options.year,
    sqlitePath: options.sqlitePath,
    chunkSize: options.chunkSize,
    chunkOverlap: options.chunkOverlap,
    dryRun: options.dryRun,
    importedVia: 'scripts/import-sermon-pdfs.ts',
    importPdf: async (importOptions) => {
      index += 1;
      const resolvedPdfPath = path.resolve(importOptions.pdfPath);
      const relativePath = relativePathByPdfPath.get(resolvedPdfPath) ?? path.basename(resolvedPdfPath);
      const startedAt = Date.now();
      console.log(`[${index}/${totalFiles}] importing ${relativePath}`);

      try {
        const imported = await importSermonPdf(importOptions);
        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(
          `[${index}/${totalFiles}] ok ${relativePath} (${imported.paragraphCount} paragraphs, ${imported.chunkCount} chunks, ${seconds}s)`
        );
        return imported;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[${index}/${totalFiles}] failed ${relativePath}: ${message}`);
        throw error;
      }
    },
  });

  for (const yearSummary of result.yearSummaries) {
    console.log(
      `[${yearSummary.year}] ${yearSummary.succeeded}/${yearSummary.total} succeeded` +
        (yearSummary.failed > 0 ? `, ${yearSummary.failed} failed` : '')
    );
  }

  console.log(
    JSON.stringify(
      {
        root_path: result.rootPath,
        year_filter: result.yearFilter,
        dry_run: result.dryRun,
        total_files: result.totalFiles,
        succeeded_count: result.succeededCount,
        failed_count: result.failedCount,
        year_summaries: result.yearSummaries,
        failures: result.failures,
      },
      null,
      2
    )
  );

  if (result.failedCount > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

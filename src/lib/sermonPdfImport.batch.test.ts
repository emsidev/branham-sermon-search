import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  discoverSermonPdfFiles,
  resolveSermonPdfImportMetadata,
  runBatchSermonPdfImport,
  type SingleSermonPdfImportResult,
} from '../../scripts/sermonPdfImport';

function makeTempDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'sermon-pdf-import-'));
}

function touch(filePath: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, 'pdf');
}

describe('sermonPdfImport batch support', () => {
  const cleanupPaths: string[] = [];

  afterEach(() => {
    for (const target of cleanupPaths.splice(0)) {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it('preserves suffix codes and derives root-relative source paths', () => {
    const root = makeTempDir();
    cleanupPaths.push(root);
    const pdfPath = path.join(root, '1965', '65-0221M Marriage And Divorce VGR.pdf');

    const metadata = resolveSermonPdfImportMetadata({
      pdfPath,
      sourceRootPath: root,
      expectedYear: 1965,
    });

    expect(metadata.sermonCode).toBe('65-0221M');
    expect(metadata.title).toBe('Marriage And Divorce');
    expect(metadata.date).toBe('1965-02-21');
    expect(metadata.year).toBe(1965);
    expect(metadata.datePrecision).toBe('day');
    expect(metadata.serviceSuffix).toBe('M');
    expect(metadata.pdfSourcePath).toBe('1965/65-0221M Marriage And Divorce VGR.pdf');
  });

  it('supports partial month dates', () => {
    const root = makeTempDir();
    cleanupPaths.push(root);
    const pdfPath = path.join(root, '1954', '54-0900 Have Faith In God VGR.pdf');

    const metadata = resolveSermonPdfImportMetadata({
      pdfPath,
      sourceRootPath: root,
      expectedYear: 1954,
    });

    expect(metadata.date).toBe('1954-09-00');
    expect(metadata.year).toBe(1954);
    expect(metadata.datePrecision).toBe('month');
  });

  it('rejects year folder mismatches', () => {
    const root = makeTempDir();
    cleanupPaths.push(root);
    const pdfPath = path.join(root, '1954', '55-0109M Melchisedec The Great Prince And King VGR.pdf');

    expect(() =>
      resolveSermonPdfImportMetadata({
        pdfPath,
        sourceRootPath: root,
        expectedYear: 1954,
      })
    ).toThrow('Year mismatch');
  });

  it('discovers only PDFs inside year folders and keeps them sorted', () => {
    const root = makeTempDir();
    cleanupPaths.push(root);

    touch(path.join(root, '1947', '47-1207 Experiences VGR.pdf'));
    touch(path.join(root, '1947', '47-0412 Faith Is The Substance VGR.pdf'));
    touch(path.join(root, '1950', '50-0110 Moses VGR.pdf'));
    touch(path.join(root, 'notes', 'ignore-me.pdf'));

    const discovered = discoverSermonPdfFiles(root);

    expect(discovered.map((file) => file.relativePath)).toEqual([
      '1947/47-0412 Faith Is The Substance VGR.pdf',
      '1947/47-1207 Experiences VGR.pdf',
      '1950/50-0110 Moses VGR.pdf',
    ]);
  });

  it('supports filtering to one year folder', () => {
    const root = makeTempDir();
    cleanupPaths.push(root);

    touch(path.join(root, '1947', '47-0412 Faith Is The Substance VGR.pdf'));
    touch(path.join(root, '1950', '50-0110 Moses VGR.pdf'));

    const discovered = discoverSermonPdfFiles(root, '1950');
    expect(discovered.map((file) => file.relativePath)).toEqual(['1950/50-0110 Moses VGR.pdf']);
  });

  it('aggregates per-year success and failure totals during dry runs', async () => {
    const root = makeTempDir();
    cleanupPaths.push(root);

    const first = path.join(root, '1947', '47-0412 Faith Is The Substance VGR.pdf');
    const second = path.join(root, '1947', '47-1207 Experiences VGR.pdf');
    const third = path.join(root, '1948', '48-0302 Experiences VGR.pdf');
    touch(first);
    touch(second);
    touch(third);

    const stub = vi.fn(async (options: {
      pdfPath: string;
      dryRun?: boolean;
      expectedYear?: number | null;
      sourceRootPath?: string | null;
    }) => {
      if (options.pdfPath === second) {
        throw new Error('Simulated failure');
      }

      return {
        dryRun: Boolean(options.dryRun),
        pdfPath: options.pdfPath,
        pdfSourcePath: `${options.expectedYear}/${path.basename(options.pdfPath)}`,
        sermonCode: path.basename(options.pdfPath, '.pdf').split(' ')[0],
        title: path.basename(options.pdfPath, '.pdf'),
        date: `${options.expectedYear}-01-01`,
        year: options.expectedYear ?? 0,
        datePrecision: 'day',
        serviceSuffix: null,
        paragraphCount: 10,
        chunkCount: 12,
        pageCount: 3,
        titleFromPdf: path.basename(options.pdfPath, '.pdf'),
        filenameDerived: null,
        preview: [],
      } satisfies SingleSermonPdfImportResult;
    });

    const result = await runBatchSermonPdfImport({
      rootPath: root,
      dryRun: true,
      importPdf: stub,
    });

    expect(result.totalFiles).toBe(3);
    expect(result.succeededCount).toBe(2);
    expect(result.failedCount).toBe(1);
    expect(result.yearSummaries).toEqual([
      { year: '1947', total: 2, succeeded: 1, failed: 1 },
      { year: '1948', total: 1, succeeded: 1, failed: 0 },
    ]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        year: '1947',
        relativePath: '1947/47-1207 Experiences VGR.pdf',
        message: 'Simulated failure',
      }),
    ]);
    expect(stub).toHaveBeenCalledTimes(3);
    expect(stub).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: true,
        sourceRootPath: path.resolve(root),
      })
    );
  });
});

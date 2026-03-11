import { describe, expect, it, vi } from 'vitest';
import {
  persistSermonImport,
  type SermonImportRepository,
  type SermonPayload,
} from './sermonPdfImportPersistence';

function buildSermonPayload(overrides: Partial<SermonPayload> = {}): SermonPayload {
  return {
    sermon_code: '47-0412',
    title: 'Faith Is The Substance',
    date: '1947-04-12',
    location: null,
    scripture: null,
    city: null,
    state: null,
    text_content: 'Sample paragraph text.',
    tags: [],
    ...overrides,
  };
}

describe('persistSermonImport', () => {
  it('aborts when sermon code already exists and performs no writes', async () => {
    const repository: SermonImportRepository = {
      findSermonByCode: vi.fn().mockResolvedValue({ id: 'existing-sermon-id' }),
      insertSermon: vi.fn(),
      insertSermonDocument: vi.fn(),
      insertSermonParagraphs: vi.fn(),
      insertSermonChunks: vi.fn(),
    };

    await expect(
      persistSermonImport({
        repository,
        sermonPayload: buildSermonPayload(),
        sermonDocumentPayload: {
          pdf_source_path: '47-0412 Faith Is The Substance VGR.pdf',
          pdf_filename: '47-0412 Faith Is The Substance VGR.pdf',
          pdf_sha256: 'sha256',
          page_count: 42,
          metadata: {},
        },
        paragraphPayloads: [
          {
            paragraph_number: 1,
            printed_paragraph_number: 1,
            paragraph_text: 'First paragraph',
          },
        ],
        chunkSeeds: [
          {
            paragraph_number: 1,
            chunk_index: 1,
            chunk_text: 'First paragraph',
            chunk_start: 0,
            chunk_end: 15,
          },
        ],
      })
    ).rejects.toThrow('already exists');

    expect(repository.insertSermon).not.toHaveBeenCalled();
    expect(repository.insertSermonDocument).not.toHaveBeenCalled();
    expect(repository.insertSermonParagraphs).not.toHaveBeenCalled();
    expect(repository.insertSermonChunks).not.toHaveBeenCalled();
  });

  it('inserts sermon, document, paragraphs, and mapped chunks for a new sermon', async () => {
    const repository: SermonImportRepository = {
      findSermonByCode: vi.fn().mockResolvedValue(null),
      insertSermon: vi.fn().mockResolvedValue({ id: 'new-sermon-id' }),
      insertSermonDocument: vi.fn().mockResolvedValue(undefined),
      insertSermonParagraphs: vi.fn().mockResolvedValue([
        { id: 101, paragraph_number: 1 },
      ]),
      insertSermonChunks: vi.fn().mockResolvedValue(undefined),
    };

    const result = await persistSermonImport({
      repository,
      sermonPayload: buildSermonPayload(),
      sermonDocumentPayload: {
        pdf_source_path: '47-0412 Faith Is The Substance VGR.pdf',
        pdf_filename: '47-0412 Faith Is The Substance VGR.pdf',
        pdf_sha256: 'sha256',
        page_count: 42,
        metadata: {},
      },
      paragraphPayloads: [
        {
          paragraph_number: 1,
          printed_paragraph_number: 1,
          paragraph_text: 'First paragraph',
        },
      ],
      chunkSeeds: [
        {
          paragraph_number: 1,
          chunk_index: 1,
          chunk_text: 'First paragraph',
          chunk_start: 0,
          chunk_end: 15,
        },
      ],
    });

    expect(result).toEqual({
      sermonId: 'new-sermon-id',
      insertedParagraphCount: 1,
      insertedChunkCount: 1,
    });

    expect(repository.insertSermon).toHaveBeenCalledTimes(1);
    expect(repository.insertSermonDocument).toHaveBeenCalledWith(
      'new-sermon-id',
      expect.objectContaining({
        pdf_filename: '47-0412 Faith Is The Substance VGR.pdf',
      })
    );
    expect(repository.insertSermonParagraphs).toHaveBeenCalledWith(
      'new-sermon-id',
      expect.arrayContaining([
        expect.objectContaining({ paragraph_number: 1 }),
      ])
    );
    expect(repository.insertSermonChunks).toHaveBeenCalledWith(
      'new-sermon-id',
      expect.arrayContaining([
        expect.objectContaining({
          paragraph_id: 101,
          paragraph_number: 1,
          chunk_index: 1,
        }),
      ])
    );
  });
});

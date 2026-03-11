export type SermonPayload = {
  sermon_code: string;
  title: string;
  date: string;
  location: string | null;
  scripture: string | null;
  city: string | null;
  state: string | null;
  text_content: string;
  tags: string[];
};

export type SermonDocumentPayload = {
  pdf_source_path: string;
  pdf_filename: string;
  pdf_sha256: string;
  page_count: number;
  metadata: Record<string, unknown>;
};

export type SermonParagraphPayload = {
  paragraph_number: number;
  printed_paragraph_number: number | null;
  paragraph_text: string;
};

export type SermonChunkSeed = {
  paragraph_number: number;
  chunk_index: number;
  chunk_text: string;
  chunk_start: number;
  chunk_end: number;
};

export type SermonParagraphRow = {
  id: number;
  paragraph_number: number;
};

export interface SermonImportRepository {
  findSermonByCode(sermonCode: string): Promise<{ id: string } | null>;
  insertSermon(payload: SermonPayload): Promise<{ id: string }>;
  insertSermonDocument(sermonId: string, payload: SermonDocumentPayload): Promise<void>;
  insertSermonParagraphs(sermonId: string, paragraphs: SermonParagraphPayload[]): Promise<SermonParagraphRow[]>;
  insertSermonChunks(
    sermonId: string,
    chunks: Array<SermonChunkSeed & { paragraph_id: number }>
  ): Promise<void>;
}

export type PersistSermonImportParams = {
  repository: SermonImportRepository;
  sermonPayload: SermonPayload;
  sermonDocumentPayload: SermonDocumentPayload;
  paragraphPayloads: SermonParagraphPayload[];
  chunkSeeds: SermonChunkSeed[];
};

export type PersistSermonImportResult = {
  sermonId: string;
  insertedParagraphCount: number;
  insertedChunkCount: number;
};

export async function persistSermonImport(params: PersistSermonImportParams): Promise<PersistSermonImportResult> {
  const existingSermon = await params.repository.findSermonByCode(params.sermonPayload.sermon_code);
  if (existingSermon) {
    throw new Error(
      `Sermon with code "${params.sermonPayload.sermon_code}" already exists (id: ${existingSermon.id}). Import aborted to prevent overwrite.`
    );
  }

  const sermonRow = await params.repository.insertSermon(params.sermonPayload);
  await params.repository.insertSermonDocument(sermonRow.id, params.sermonDocumentPayload);

  const paragraphRows = await params.repository.insertSermonParagraphs(sermonRow.id, params.paragraphPayloads);
  const paragraphIdByNumber = new Map<number, number>();

  for (const row of paragraphRows) {
    paragraphIdByNumber.set(row.paragraph_number, row.id);
  }

  const chunkRows = params.chunkSeeds.map((chunk) => {
    const paragraphId = paragraphIdByNumber.get(chunk.paragraph_number);
    if (!paragraphId) {
      throw new Error(`Missing paragraph id for paragraph ${chunk.paragraph_number}`);
    }

    return {
      paragraph_id: paragraphId,
      paragraph_number: chunk.paragraph_number,
      chunk_index: chunk.chunk_index,
      chunk_text: chunk.chunk_text,
      chunk_start: chunk.chunk_start,
      chunk_end: chunk.chunk_end,
    };
  });

  if (chunkRows.length > 0) {
    await params.repository.insertSermonChunks(sermonRow.id, chunkRows);
  }

  return {
    sermonId: sermonRow.id,
    insertedParagraphCount: paragraphRows.length,
    insertedChunkCount: chunkRows.length,
  };
}

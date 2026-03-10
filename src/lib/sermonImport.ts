export interface ParsedSermonParagraph {
  paragraph_number: number;
  printed_paragraph_number: number | null;
  paragraph_text: string;
}

export interface ParsedSermonDocument {
  title_from_pdf: string | null;
  paragraphs: ParsedSermonParagraph[];
}

export interface ParagraphChunk {
  chunk_index: number;
  chunk_text: string;
  chunk_start: number;
  chunk_end: number;
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function normalizeExtractedLines(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => normalizeLine(line.replace(/\uF6E1/g, '')))
    .filter(Boolean);
}

function normalizeLooseMatch(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isLikelySermonTitle(line: string): boolean {
  const normalized = normalizeLine(line);
  if (!normalized) {
    return false;
  }

  const letterCount = (normalized.match(/[A-Za-z]/g) || []).length;
  if (letterCount < 8) {
    return false;
  }

  const upperOnly = normalized.replace(/[^A-Z]/g, '');
  return upperOnly.length >= Math.ceil(letterCount * 0.8);
}

function parseParagraphsFromLines(lines: string[]): ParsedSermonParagraph[] {
  const parsed: Array<{ printed: number | null; text: string }> = [];
  let current: { printed: number | null; text: string } | null = null;

  for (const line of lines) {
    const markerMatch = line.match(/^(\d{1,4})\s+(.*)$/);
    if (markerMatch) {
      if (current && current.text) {
        parsed.push(current);
      }

      current = {
        printed: Number.parseInt(markerMatch[1], 10),
        text: normalizeLine(markerMatch[2]),
      };
      continue;
    }

    if (!current) {
      current = { printed: null, text: line };
    } else {
      current.text = normalizeLine(`${current.text} ${line}`);
    }
  }

  if (current && current.text) {
    parsed.push(current);
  }

  return parsed.map((paragraph, index) => ({
    paragraph_number: index + 1,
    printed_paragraph_number: paragraph.printed,
    paragraph_text: paragraph.text,
  }));
}

function lineIsOnlyPageNumber(line: string, pageNumber: number): boolean {
  return normalizeLooseMatch(line) === String(pageNumber);
}

function stripPageHeaderLines(
  lines: string[],
  pageNumber: number,
  titleFromPdf: string | null
): string[] {
  if (lines.length === 0) {
    return lines;
  }

  const spokenWordToken = 'THESPOKENWORD';
  const titleToken = titleFromPdf ? normalizeLooseMatch(titleFromPdf) : '';
  const firstLine = lines[0];
  const secondLine = lines.length > 1 ? lines[1] : null;
  const firstLoose = normalizeLooseMatch(firstLine);
  const secondLoose = secondLine ? normalizeLooseMatch(secondLine) : '';
  const isEvenPage = pageNumber % 2 === 0;

  if (isEvenPage) {
    const firstHasSpokenWordAndPage =
      firstLoose.includes(spokenWordToken) && firstLoose.includes(String(pageNumber));
    const splitNumberThenSpokenWord =
      lineIsOnlyPageNumber(firstLine, pageNumber) && secondLoose.includes(spokenWordToken);
    const splitSpokenWordThenNumber =
      firstLoose.includes(spokenWordToken) &&
      secondLine != null &&
      lineIsOnlyPageNumber(secondLine, pageNumber);

    if (firstHasSpokenWordAndPage) {
      return lines.slice(1);
    }
    if (splitNumberThenSpokenWord || splitSpokenWordThenNumber) {
      return lines.slice(2);
    }
    return lines;
  }

  if (!titleToken) {
    return lines;
  }

  const firstHasTitleAndPage = firstLoose.includes(titleToken) && firstLoose.includes(String(pageNumber));
  const splitTitleThenPage =
    firstLoose.includes(titleToken) &&
    secondLine != null &&
    lineIsOnlyPageNumber(secondLine, pageNumber);
  const splitPageThenTitle =
    lineIsOnlyPageNumber(firstLine, pageNumber) && secondLoose.includes(titleToken);

  if (firstHasTitleAndPage) {
    return lines.slice(1);
  }
  if (splitTitleThenPage || splitPageThenTitle) {
    return lines.slice(2);
  }

  return lines;
}

export function parseSermonParagraphsFromExtractedPages(pageTexts: string[]): ParsedSermonDocument {
  if (pageTexts.length === 0) {
    return {
      title_from_pdf: null,
      paragraphs: [],
    };
  }

  const firstPageLines = normalizeExtractedLines(pageTexts[0]);
  const titleFromPdf = firstPageLines.length > 0 ? firstPageLines[0] : null;
  const bodyLines: string[] = [];

  for (let index = 0; index < pageTexts.length; index += 1) {
    const pageNumber = index + 1;
    let pageLines = normalizeExtractedLines(pageTexts[index]);

    if (pageNumber === 1) {
      if (titleFromPdf && pageLines[0] === titleFromPdf) {
        pageLines = pageLines.slice(1);
      }
    } else {
      pageLines = stripPageHeaderLines(pageLines, pageNumber, titleFromPdf);
    }

    bodyLines.push(...pageLines);
  }

  return {
    title_from_pdf: titleFromPdf,
    paragraphs: parseParagraphsFromLines(bodyLines),
  };
}

export function parseSermonParagraphsFromExtractedText(rawText: string): ParsedSermonDocument {
  const lines = normalizeExtractedLines(rawText);

  const titleIndex = lines.findIndex((line) => isLikelySermonTitle(line));
  const titleFromPdf = titleIndex >= 0 ? lines[titleIndex] : null;
  const bodyLines = titleIndex >= 0 ? lines.slice(titleIndex + 1) : lines;

  return {
    title_from_pdf: titleFromPdf,
    paragraphs: parseParagraphsFromLines(bodyLines),
  };
}

export function chunkParagraphText(
  paragraphText: string,
  maxChars = 320,
  overlapChars = 50
): ParagraphChunk[] {
  if (maxChars <= 0) {
    throw new Error('maxChars must be greater than 0');
  }
  if (overlapChars < 0 || overlapChars >= maxChars) {
    throw new Error('overlapChars must be >= 0 and less than maxChars');
  }

  const normalized = normalizeLine(paragraphText);
  if (!normalized) {
    return [];
  }

  const chunks: ParagraphChunk[] = [];
  let start = 0;
  let index = 1;

  while (start < normalized.length) {
    const end = Math.min(start + maxChars, normalized.length);
    const chunkText = normalized.slice(start, end);

    chunks.push({
      chunk_index: index,
      chunk_text: chunkText,
      chunk_start: start,
      chunk_end: end,
    });

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(end - overlapChars, start + 1);
    index += 1;
  }

  return chunks;
}

export function buildCanonicalSermonText(paragraphs: ParsedSermonParagraph[]): string {
  return paragraphs
    .map((paragraph) => normalizeLine(paragraph.paragraph_text))
    .filter(Boolean)
    .join('\n\n');
}

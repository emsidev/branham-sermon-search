export interface SermonHitLinkInput {
  sermonId: string;
  query?: string;
  matchSource?: string | null;
  paragraphNumber?: number | null;
  hitId?: string;
}

export interface HighlightSegment {
  text: string;
  matched: boolean;
}

const WORD_CHAR_RE = /[\p{L}\p{N}]/u;
const APOSTROPHE_RE = /['’‘`]/u;

function isWordChar(char: string): boolean {
  return WORD_CHAR_RE.test(char);
}

function isApostrophe(char: string): boolean {
  return APOSTROPHE_RE.test(char);
}

interface NormalizedSearchText {
  value: string;
  indexMap: number[];
}

function normalizeForSearchMatchingInternal(value: string): NormalizedSearchText {
  const normalizedChars: string[] = [];
  const indexMap: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const prev = index > 0 ? value[index - 1] : '';
    const next = index + 1 < value.length ? value[index + 1] : '';
    const apostropheInWord = isApostrophe(char) && isWordChar(prev) && isWordChar(next);

    if (apostropheInWord) {
      continue;
    }

    if (isWordChar(char)) {
      normalizedChars.push(char.toLowerCase());
      indexMap.push(index);
      continue;
    }

    if (normalizedChars.length === 0 || normalizedChars[normalizedChars.length - 1] === ' ') {
      continue;
    }

    normalizedChars.push(' ');
    indexMap.push(index);
  }

  if (normalizedChars.length > 0 && normalizedChars[normalizedChars.length - 1] === ' ') {
    normalizedChars.pop();
    indexMap.pop();
  }

  return {
    value: normalizedChars.join(''),
    indexMap,
  };
}

export function normalizeSearchComparableText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return normalizeForSearchMatchingInternal(value).value;
}

export function hasNormalizedBoundedMatch(
  candidateText: string | null | undefined,
  queryText: string,
): boolean {
  const normalizedQuery = normalizeSearchComparableText(queryText);
  if (!normalizedQuery) {
    return false;
  }

  const normalizedCandidate = normalizeSearchComparableText(candidateText);
  if (!normalizedCandidate) {
    return false;
  }

  return ` ${normalizedCandidate} `.includes(` ${normalizedQuery} `);
}

export function buildSermonHitHref({
  sermonId,
  query,
  matchSource,
  paragraphNumber,
  hitId,
}: SermonHitLinkInput): string {
  const params = new URLSearchParams();
  const trimmedQuery = query?.trim() ?? '';

  if (trimmedQuery) {
    params.set('q', trimmedQuery);
  }
  if (matchSource) {
    params.set('source', matchSource);
  }
  if (paragraphNumber != null && Number.isFinite(paragraphNumber) && paragraphNumber > 0) {
    params.set('paragraph', String(paragraphNumber));
  }
  if (hitId) {
    params.set('hit', hitId);
  }

  const queryString = params.toString();
  return queryString ? `/sermons/${sermonId}?${queryString}` : `/sermons/${sermonId}`;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractQueryTerms(query: string, maxTerms = 8): string[] {
  const normalizedQuery = query.trim().replace(/\s+/g, ' ');
  if (!normalizedQuery) {
    return [];
  }

  let fullQuery = normalizedQuery;
  if (
    (fullQuery.startsWith('"') && fullQuery.endsWith('"')) ||
    (fullQuery.startsWith("'") && fullQuery.endsWith("'"))
  ) {
    fullQuery = fullQuery.slice(1, -1).trim().replace(/\s+/g, ' ');
  }
  if (!fullQuery) {
    return [];
  }

  const rawTokens = fullQuery.split(' ').filter(Boolean);
  const multiWordQuery = rawTokens.length > 1;
  const seen = new Set<string>();
  const result: string[] = [];

  const pushTerm = (value: string) => {
    if (result.length >= maxTerms) {
      return;
    }

    const term = value.trim();
    if (!term) {
      return;
    }

    const lower = term.toLowerCase();
    if (seen.has(lower)) {
      return;
    }

    seen.add(lower);
    result.push(term);
  };

  if (multiWordQuery) {
    pushTerm(fullQuery);
  }

  for (const rawToken of rawTokens) {
    if (multiWordQuery && rawToken.length === 1) {
      continue;
    }

    pushTerm(rawToken);
    if (result.length >= maxTerms) {
      break;
    }
  }

  return result;
}

export function splitTextByTerms(text: string, terms: string[]): HighlightSegment[] {
  if (!text) {
    return [];
  }
  if (!terms.length) {
    return [{ text, matched: false }];
  }

  const normalizedText = normalizeForSearchMatchingInternal(text);
  const normalizedTerms = Array.from(
    new Set(
      terms
        .map((term) => normalizeSearchComparableText(term))
        .filter(Boolean)
    )
  ).sort((a, b) => b.length - a.length);

  if (!normalizedText.value || !normalizedTerms.length) {
    return [{ text, matched: false }];
  }

  const ranges: Array<{ start: number; end: number }> = [];

  for (const term of normalizedTerms) {
    let searchFrom = 0;

    while (searchFrom <= normalizedText.value.length - term.length) {
      const matchIndex = normalizedText.value.indexOf(term, searchFrom);
      if (matchIndex === -1) {
        break;
      }

      const start = normalizedText.indexMap[matchIndex];
      const end = normalizedText.indexMap[matchIndex + term.length - 1];
      if (start != null && end != null && end >= start) {
        ranges.push({ start, end });
      }

      searchFrom = matchIndex + 1;
    }
  }

  if (!ranges.length) {
    return [{ text, matched: false }];
  }

  ranges.sort((a, b) => a.start - b.start || a.end - b.end);

  const mergedRanges: Array<{ start: number; end: number }> = [];
  for (const range of ranges) {
    const prev = mergedRanges[mergedRanges.length - 1];
    if (!prev || range.start > prev.end) {
      mergedRanges.push({ ...range });
      continue;
    }

    prev.end = Math.max(prev.end, range.end);
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const range of mergedRanges) {
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start), matched: false });
    }

    segments.push({ text: text.slice(range.start, range.end + 1), matched: true });
    cursor = range.end + 1;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false });
  }

  return segments.length > 0 ? segments : [{ text, matched: false }];
}

export function resolveHighlightTermsForText(text: string, terms: string[]): string[] {
  if (!terms.length || !text) {
    return terms;
  }

  const phraseTerms = terms.filter((term) => /\s/.test(term.trim()));
  if (!phraseTerms.length) {
    return terms;
  }

  const normalizedText = normalizeSearchComparableText(text);
  const matchedPhrases = phraseTerms
    .filter((term) => {
      const normalizedTerm = normalizeSearchComparableText(term);
      return normalizedTerm !== '' && normalizedText.includes(normalizedTerm);
    })
    .sort((a, b) => b.length - a.length);

  if (matchedPhrases.length > 0) {
    return matchedPhrases;
  }

  const fallbackTerms = terms.filter((term) => !/\s/.test(term.trim()));
  return fallbackTerms.length > 0 ? fallbackTerms : terms;
}

export function sanitizeSearchSnippet(snippet: string): string {
  if (!snippet) {
    return '';
  }

  return snippet
    .replace(/,?StartSel=/gi, '')
    .replace(/,?StopSel=/gi, '')
    .replace(/<\/?b>/gi, '')
    .replace(/<\/?mark>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractHitChunkIndex(hitId: string | null | undefined): number | null {
  if (!hitId) {
    return null;
  }

  const match = hitId.match(/:chunk:(\d+)$/);
  if (!match) {
    return null;
  }

  const index = Number.parseInt(match[1], 10);
  return Number.isFinite(index) && index > 0 ? index : null;
}

export function formatMatchSourceLabel(
  source: string | null | undefined,
  paragraphNumber: number | null | undefined,
  printedParagraphNumber?: number | null,
): string {
  if (source === 'paragraph_text') {
    const paragraphLabel = paragraphNumber ? `Paragraph ${paragraphNumber}` : 'Paragraph';
    const printedSuffix = (
      printedParagraphNumber != null &&
      paragraphNumber != null &&
      printedParagraphNumber !== paragraphNumber
    )
      ? ` [PDF ${printedParagraphNumber}]`
      : '';

    return `${paragraphLabel}${printedSuffix}`;
  }
  if (source === 'title') {
    return 'Title';
  }
  if (source === 'scripture') {
    return 'Scripture';
  }
  if (source === 'location') {
    return 'Location';
  }

  return source || '-';
}

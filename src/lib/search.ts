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

  const pattern = new RegExp(
    `(${terms
      .map((term) => term.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join('|')})`,
    'gi'
  );

  const parts = text.split(pattern).filter((part) => part.length > 0);
  if (!parts.length) {
    return [{ text, matched: false }];
  }

  const normalizedTerms = terms.map((term) => term.toLowerCase());
  return parts.map((part) => ({
    text: part,
    matched: normalizedTerms.includes(part.toLowerCase()),
  }));
}

export function resolveHighlightTermsForText(text: string, terms: string[]): string[] {
  if (!terms.length || !text) {
    return terms;
  }

  const phraseTerms = terms.filter((term) => /\s/.test(term.trim()));
  if (!phraseTerms.length) {
    return terms;
  }

  const lowerText = text.toLowerCase();
  const matchedPhrases = phraseTerms
    .filter((term) => lowerText.includes(term.toLowerCase()))
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
  chunkIndex?: number | null,
  chunkTotal?: number | null
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

    if (
      chunkIndex != null &&
      chunkTotal != null &&
      chunkIndex > 0 &&
      chunkTotal > 1
    ) {
      return `${paragraphLabel}${printedSuffix} (${chunkIndex}/${chunkTotal})`;
    }
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

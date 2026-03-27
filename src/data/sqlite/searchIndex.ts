const TOKEN_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeSearchText(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

export function normalizeSearchQuery(value: string, matchCase: boolean): string {
  const normalized = normalizeWhitespace(value);
  return matchCase ? normalized : normalized.toLowerCase();
}

export function extractSearchTerms(value: string): string[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) {
    return [];
  }

  const matches = normalized.match(TOKEN_PATTERN);
  if (!matches) {
    return [];
  }

  return matches
    .map((term) => term.replace(/^['’]+|['’]+$/g, ''))
    .filter((term) => term.length > 0);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hasWholeWordMatch(haystack: string, needle: string): boolean {
  const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(needle)}([^\\p{L}\\p{N}]|$)`, 'u');
  return regex.test(haystack);
}

export function trigrams(value: string): Set<string> {
  const normalized = `  ${value}  `;
  const out = new Set<string>();
  for (let index = 0; index <= normalized.length - 3; index += 1) {
    out.add(normalized.slice(index, index + 3));
  }
  return out;
}

export function trigramSimilarity(a: string, b: string): number {
  if (!a || !b) {
    return 0;
  }

  const aSet = trigrams(a);
  const bSet = trigrams(b);
  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) {
      intersection += 1;
    }
  }
  return (2 * intersection) / (aSet.size + bSet.size);
}

export function toFtsPhraseQuery(value: string): string {
  const phrase = normalizeWhitespace(value);
  return `"${phrase.replace(/"/g, '""')}"`;
}

function sanitizeFtsTerm(term: string): string {
  return term
    .replace(/"/g, '')
    .replace(/[^\p{L}\p{N}'’]/gu, '')
    .trim();
}

export function buildFuzzyFtsExpression(candidateTerms: string[]): string | null {
  const uniqueTerms = [...new Set(candidateTerms.map((term) => sanitizeFtsTerm(term)).filter((term) => term.length >= 2))];
  if (uniqueTerms.length === 0) {
    return null;
  }

  return uniqueTerms.map((term) => `${term}*`).join(' OR ');
}

export function termPrefix2(term: string): string {
  return term.slice(0, 2);
}

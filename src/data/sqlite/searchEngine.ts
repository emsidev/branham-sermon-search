import type { SearchHitRecord, SearchSermonsParams } from '@/data/contracts';

export interface SearchCandidateRow {
  hit_id: string;
  sermon_id: string;
  sermon_code: string;
  title: string;
  summary: string | null;
  date: string;
  location: string | null;
  tags_json: string | null;
  paragraph_number: number | null;
  printed_paragraph_number: number | null;
  chunk_index: number | null;
  chunk_total: number | null;
  match_source: string;
  searchable_text: string;
  normalized_text: string;
  snippet_text: string;
}

function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(tagsJson) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(value: string, matchCase: boolean): string {
  return (matchCase ? value : value.toLowerCase()).replace(/\s+/g, ' ').trim();
}

function hasWholeWordMatch(haystack: string, needle: string): boolean {
  const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(needle)}([^\\p{L}\\p{N}]|$)`, 'u');
  return regex.test(haystack);
}

function trigrams(value: string): Set<string> {
  const normalized = `  ${value}  `;
  const out = new Set<string>();
  for (let index = 0; index <= normalized.length - 3; index += 1) {
    out.add(normalized.slice(index, index + 3));
  }
  return out;
}

function trigramSimilarity(a: string, b: string): number {
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

function computeRelevance(text: string, query: string, wholeWord: boolean, fuzzy: boolean): number {
  const normalizedText = normalizeText(text, false);
  const normalizedQuery = normalizeText(query, false);

  if (!normalizedText || !normalizedQuery) {
    return 0;
  }

  if (normalizedText === normalizedQuery) {
    return 1.0;
  }

  if (wholeWord && hasWholeWordMatch(normalizedText, normalizedQuery)) {
    return 0.92;
  }

  if (normalizedText.includes(normalizedQuery)) {
    const density = Math.min(1, normalizedQuery.length / Math.max(normalizedText.length, 1));
    return 0.72 + density * 0.2;
  }

  if (fuzzy) {
    return trigramSimilarity(normalizedText, normalizedQuery) * 0.7;
  }

  return 0;
}

function isMatch(row: SearchCandidateRow, params: SearchSermonsParams): { matched: boolean; exact: boolean; score: number } {
  const text = params.matchCase ? row.searchable_text : row.normalized_text;
  const normalizedQuery = normalizeText(params.query, params.matchCase);
  if (!normalizedQuery) {
    return { matched: false, exact: false, score: 0 };
  }

  if (params.fuzzy) {
    const similarity = trigramSimilarity(normalizeText(row.searchable_text, false), normalizeText(params.query, false));
    const contains = normalizeText(row.searchable_text, false).includes(normalizeText(params.query, false));
    const matched = contains || similarity >= 0.28;
    return {
      matched,
      exact: contains,
      score: Math.max(computeRelevance(row.searchable_text, params.query, false, true), similarity),
    };
  }

  const matched = params.wholeWord ? hasWholeWordMatch(text, normalizedQuery) : text.includes(normalizedQuery);
  if (!matched) {
    return { matched: false, exact: false, score: 0 };
  }

  const exact = normalizeText(row.searchable_text, params.matchCase) === normalizedQuery;
  const score = computeRelevance(row.searchable_text, params.query, params.wholeWord, false);
  return { matched: true, exact, score };
}

function sortByParams(a: SearchHitRecord, b: SearchHitRecord, sort: SearchSermonsParams['sort']): number {
  if (sort === 'date-asc') {
    return a.date.localeCompare(b.date);
  }
  if (sort === 'date-desc') {
    return b.date.localeCompare(a.date);
  }
  if (sort === 'title-asc') {
    return a.title.localeCompare(b.title);
  }
  if (sort === 'title-desc') {
    return b.title.localeCompare(a.title);
  }

  if (b.relevance !== a.relevance) {
    return b.relevance - a.relevance;
  }
  if (Number(b.is_exact_match) !== Number(a.is_exact_match)) {
    return Number(b.is_exact_match) - Number(a.is_exact_match);
  }
  return b.date.localeCompare(a.date);
}

export function rankSearchCandidates(candidates: SearchCandidateRow[], params: SearchSermonsParams): SearchHitRecord[] {
  const matches: SearchHitRecord[] = [];

  for (const row of candidates) {
    const { matched, exact, score } = isMatch(row, params);
    if (!matched) {
      continue;
    }

    matches.push({
      hit_id: row.hit_id,
      sermon_id: row.sermon_id,
      sermon_code: row.sermon_code,
      title: row.title,
      summary: row.summary,
      date: row.date,
      location: row.location,
      tags: parseTags(row.tags_json),
      paragraph_number: row.paragraph_number,
      printed_paragraph_number: row.printed_paragraph_number,
      chunk_index: row.chunk_index,
      chunk_total: row.chunk_total,
      match_source: row.match_source,
      is_exact_match: exact,
      snippet: row.snippet_text || row.searchable_text,
      relevance: score,
      total_count: 0,
    });
  }

  matches.sort((left, right) => sortByParams(left, right, params.sort));
  const total = matches.length;
  const sliced = matches.slice(params.offset, params.offset + params.limit);
  return sliced.map((row) => ({ ...row, total_count: total }));
}


import type { SearchHitRecord, SearchSermonsParams } from '@/data/contracts';
import {
  hasWholeWordMatch,
  normalizeSearchQuery,
  normalizeSearchText,
  trigramSimilarity,
} from '@/data/sqlite/searchIndex';

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

function computeRelevance(text: string, query: string, wholeWord: boolean, fuzzy: boolean): number {
  const normalizedText = normalizeSearchText(text);
  const normalizedQuery = normalizeSearchText(query);

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

export interface SearchCandidateMatchEvaluation {
  matched: boolean;
  exact: boolean;
  score: number;
}

export function evaluateSearchCandidate(row: SearchCandidateRow, params: SearchSermonsParams): SearchCandidateMatchEvaluation {
  const text = params.matchCase ? row.searchable_text : row.normalized_text;
  const normalizedQuery = normalizeSearchQuery(params.query, params.matchCase);
  if (!normalizedQuery) {
    return { matched: false, exact: false, score: 0 };
  }

  if (params.fuzzy) {
    const similarity = trigramSimilarity(normalizeSearchText(row.searchable_text), normalizeSearchText(params.query));
    const contains = normalizeSearchText(row.searchable_text).includes(normalizeSearchText(params.query));
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

  const exact = normalizeSearchQuery(row.searchable_text, params.matchCase) === normalizedQuery;
  const score = computeRelevance(row.searchable_text, params.query, params.wholeWord, false);
  return { matched: true, exact, score };
}

export function compareSearchHitsBySort(a: SearchHitRecord, b: SearchHitRecord, sort: SearchSermonsParams['sort']): number {
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

export function buildSearchHitRecord(
  row: SearchCandidateRow,
  evaluation: SearchCandidateMatchEvaluation,
): SearchHitRecord {
  return {
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
    is_exact_match: evaluation.exact,
    snippet: row.snippet_text || row.searchable_text,
    relevance: evaluation.score,
    total_count: 0,
  };
}

export function rankSearchCandidates(candidates: SearchCandidateRow[], params: SearchSermonsParams): SearchHitRecord[] {
  const matches: SearchHitRecord[] = [];

  for (const row of candidates) {
    const evaluation = evaluateSearchCandidate(row, params);
    if (!evaluation.matched) {
      continue;
    }

    matches.push(buildSearchHitRecord(row, evaluation));
  }

  matches.sort((left, right) => compareSearchHitsBySort(left, right, params.sort));
  const total = matches.length;
  const sliced = matches.slice(params.offset, params.offset + params.limit);
  return sliced.map((row) => ({ ...row, total_count: total }));
}

import type { ReaderHighlightMode } from './readerWordNavigation';

export const READER_HIGHLIGHT_MODE_QUERY_PARAM = 'highlightMode';
export const DEFAULT_READER_HIGHLIGHT_MODE: ReaderHighlightMode = 'word';

const READER_HIGHLIGHT_MODES = new Set<ReaderHighlightMode>([
  'word',
  'sentence',
  'paragraph',
]);

function createSearchParams(search: string): URLSearchParams {
  const normalizedSearch = search.startsWith('?')
    ? search.slice(1)
    : search;
  return new URLSearchParams(normalizedSearch);
}

export function isReaderHighlightMode(value: string | null): value is ReaderHighlightMode {
  if (value == null) {
    return false;
  }

  return READER_HIGHLIGHT_MODES.has(value as ReaderHighlightMode);
}

export function resolveReaderHighlightMode(rawValue: string | null): ReaderHighlightMode {
  if (!isReaderHighlightMode(rawValue)) {
    return DEFAULT_READER_HIGHLIGHT_MODE;
  }

  return rawValue;
}

export function getReaderHighlightModeFromSearchParams(searchParams: URLSearchParams): ReaderHighlightMode {
  return resolveReaderHighlightMode(searchParams.get(READER_HIGHLIGHT_MODE_QUERY_PARAM));
}

export function withReaderHighlightModeSearchParams(
  searchParams: URLSearchParams,
  mode: ReaderHighlightMode,
): URLSearchParams {
  const nextSearchParams = new URLSearchParams(searchParams.toString());
  nextSearchParams.set(READER_HIGHLIGHT_MODE_QUERY_PARAM, mode);
  return nextSearchParams;
}

export function buildReaderHighlightModeSearch(search: string, mode: ReaderHighlightMode): string {
  const searchParams = createSearchParams(search);
  const nextSearchParams = withReaderHighlightModeSearchParams(searchParams, mode);
  const serialized = nextSearchParams.toString();
  return serialized ? `?${serialized}` : '';
}

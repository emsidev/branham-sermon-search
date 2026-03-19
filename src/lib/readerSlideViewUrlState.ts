export const READER_SLIDE_VIEW_QUERY_PARAM = 'slide';
export const READER_SLIDE_START_QUERY_PARAM = 'slideStart';
export const READER_SLIDE_END_QUERY_PARAM = 'slideEnd';
export const READER_SLIDE_PAGE_QUERY_PARAM = 'slidePage';
const READER_SLIDE_VIEW_ENABLED_VALUE = '1';
const DEFAULT_READER_SLIDE_PAGE = 1;

export interface ReaderSlideSelection {
  startIndex: number;
  endIndex: number;
}

function createSearchParams(search: string): URLSearchParams {
  const normalizedSearch = search.startsWith('?')
    ? search.slice(1)
    : search;
  return new URLSearchParams(normalizedSearch);
}

export function isReaderSlideViewEnabledFromSearchParams(searchParams: URLSearchParams): boolean {
  return searchParams.get(READER_SLIDE_VIEW_QUERY_PARAM) === READER_SLIDE_VIEW_ENABLED_VALUE;
}

function parseNonNegativeInteger(rawValue: string | null): number | null {
  if (rawValue == null) {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function normalizeSlidePage(rawValue: number | null): number {
  if (rawValue == null || !Number.isFinite(rawValue)) {
    return DEFAULT_READER_SLIDE_PAGE;
  }

  return Math.max(DEFAULT_READER_SLIDE_PAGE, Math.floor(rawValue));
}

export function getReaderSlideSelectionFromSearchParams(
  searchParams: URLSearchParams,
): ReaderSlideSelection | null {
  const parsedStart = parseNonNegativeInteger(searchParams.get(READER_SLIDE_START_QUERY_PARAM));
  const parsedEnd = parseNonNegativeInteger(searchParams.get(READER_SLIDE_END_QUERY_PARAM));
  if (parsedStart == null || parsedEnd == null) {
    return null;
  }

  return {
    startIndex: Math.min(parsedStart, parsedEnd),
    endIndex: Math.max(parsedStart, parsedEnd),
  };
}

export function getReaderSlidePageFromSearchParams(searchParams: URLSearchParams): number {
  const rawValue = parseNonNegativeInteger(searchParams.get(READER_SLIDE_PAGE_QUERY_PARAM));
  if (rawValue == null) {
    return DEFAULT_READER_SLIDE_PAGE;
  }

  return normalizeSlidePage(rawValue);
}

export function withReaderSlideViewSearchParams(
  searchParams: URLSearchParams,
  enabled: boolean,
): URLSearchParams {
  const nextSearchParams = new URLSearchParams(searchParams.toString());

  if (enabled) {
    nextSearchParams.set(READER_SLIDE_VIEW_QUERY_PARAM, READER_SLIDE_VIEW_ENABLED_VALUE);
    return nextSearchParams;
  }

  nextSearchParams.delete(READER_SLIDE_VIEW_QUERY_PARAM);
  nextSearchParams.delete(READER_SLIDE_START_QUERY_PARAM);
  nextSearchParams.delete(READER_SLIDE_END_QUERY_PARAM);
  nextSearchParams.delete(READER_SLIDE_PAGE_QUERY_PARAM);
  return nextSearchParams;
}

export function withReaderSlideSelectionSearchParams(
  searchParams: URLSearchParams,
  selectionStart: number,
  selectionEnd: number,
): URLSearchParams {
  const nextSearchParams = withReaderSlideViewSearchParams(searchParams, true);
  nextSearchParams.delete(READER_SLIDE_PAGE_QUERY_PARAM);

  const parsedStart = parseNonNegativeInteger(String(selectionStart));
  const parsedEnd = parseNonNegativeInteger(String(selectionEnd));
  if (parsedStart == null || parsedEnd == null) {
    nextSearchParams.delete(READER_SLIDE_START_QUERY_PARAM);
    nextSearchParams.delete(READER_SLIDE_END_QUERY_PARAM);
    return nextSearchParams;
  }

  const startIndex = Math.min(parsedStart, parsedEnd);
  const endIndex = Math.max(parsedStart, parsedEnd);
  nextSearchParams.set(READER_SLIDE_START_QUERY_PARAM, String(startIndex));
  nextSearchParams.set(READER_SLIDE_END_QUERY_PARAM, String(endIndex));
  return nextSearchParams;
}

export function withReaderSlidePageSearchParams(
  searchParams: URLSearchParams,
  page: number,
): URLSearchParams {
  const nextSearchParams = withReaderSlideViewSearchParams(searchParams, true);
  nextSearchParams.set(READER_SLIDE_PAGE_QUERY_PARAM, String(normalizeSlidePage(page)));
  return nextSearchParams;
}

interface BuildReaderSlideViewSearchOptions {
  selectionStart?: number | null;
  selectionEnd?: number | null;
}

export function buildReaderSlideViewSearch(
  search: string,
  enabled: boolean,
  options: BuildReaderSlideViewSearchOptions = {},
): string {
  const searchParams = createSearchParams(search);
  let nextSearchParams = withReaderSlideViewSearchParams(searchParams, enabled);
  if (enabled) {
    if (options.selectionStart != null && options.selectionEnd != null) {
      nextSearchParams = withReaderSlideSelectionSearchParams(
        nextSearchParams,
        options.selectionStart,
        options.selectionEnd,
      );
    }
  }

  const serialized = nextSearchParams.toString();
  return serialized ? `?${serialized}` : '';
}

export const READING_MODE_QUERY_PARAM = 'reading';
const READING_MODE_ENABLED_VALUE = '1';

function createSearchParams(search: string): URLSearchParams {
  const normalizedSearch = search.startsWith('?')
    ? search.slice(1)
    : search;
  return new URLSearchParams(normalizedSearch);
}

export function isReadingModeEnabledFromSearchParams(searchParams: URLSearchParams): boolean {
  return searchParams.get(READING_MODE_QUERY_PARAM) === READING_MODE_ENABLED_VALUE;
}

export function withReadingModeSearchParams(
  searchParams: URLSearchParams,
  enabled: boolean,
): URLSearchParams {
  const nextSearchParams = new URLSearchParams(searchParams.toString());

  if (enabled) {
    nextSearchParams.set(READING_MODE_QUERY_PARAM, READING_MODE_ENABLED_VALUE);
    return nextSearchParams;
  }

  nextSearchParams.delete(READING_MODE_QUERY_PARAM);
  return nextSearchParams;
}

export function buildReadingModeSearch(search: string, enabled: boolean): string {
  const params = createSearchParams(search);
  const nextParams = withReadingModeSearchParams(params, enabled);
  const serialized = nextParams.toString();
  return serialized ? `?${serialized}` : '';
}

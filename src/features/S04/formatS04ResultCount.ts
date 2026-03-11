export function formatS04ResultCount(activeResultIndex: number, totalResults: number): string {
  const safeTotal = Number.isFinite(totalResults) ? Math.max(0, Math.floor(totalResults)) : 0;
  if (safeTotal === 0) {
    return '0 of 0';
  }

  const safeIndex = Number.isFinite(activeResultIndex) ? Math.floor(activeResultIndex) : 0;
  const oneBasedIndex = Math.min(Math.max(safeIndex + 1, 1), safeTotal);

  return `${oneBasedIndex.toLocaleString()} of ${safeTotal.toLocaleString()}`;
}

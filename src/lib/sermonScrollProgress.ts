export interface SermonScrollProgressInput {
  scrollY: number;
  viewportHeight: number;
  targetTop: number;
  targetHeight: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateSermonScrollProgressPercent({
  scrollY,
  viewportHeight,
  targetTop,
  targetHeight,
}: SermonScrollProgressInput): number {
  if (viewportHeight <= 0 || targetHeight <= 0) {
    return 0;
  }

  const safeTargetHeight = Math.max(targetHeight, 0);
  const targetBottom = targetTop + safeTargetHeight;
  const viewportTop = scrollY;
  const viewportBottom = viewportTop + viewportHeight;

  if (viewportBottom <= targetTop) {
    return 0;
  }

  if (viewportTop >= targetBottom) {
    return 100;
  }

  const scrollableRange = Math.max(safeTargetHeight - viewportHeight, 0);
  if (scrollableRange === 0) {
    return 100;
  }

  const rawRatio = (viewportTop - targetTop) / scrollableRange;
  return Math.round(clamp(rawRatio, 0, 1) * 100);
}

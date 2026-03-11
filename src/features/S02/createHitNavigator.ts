const NO_ACTIVE_INDEX = -1;

function coerceTotalHits(totalHits: number): number {
  if (!Number.isFinite(totalHits) || totalHits <= 0) {
    return 0;
  }

  return Math.floor(totalHits);
}

function coerceIndex(index: number): number {
  if (!Number.isFinite(index)) {
    return NO_ACTIVE_INDEX;
  }

  return Math.floor(index);
}

export interface S02HitNavigator {
  totalHits: number;
  normalizeIndex: (index: number) => number;
  getNextIndex: (currentIndex: number) => number;
  getPrevIndex: (currentIndex: number) => number;
}

export function createHitNavigator(totalHits: number): S02HitNavigator {
  const safeTotalHits = coerceTotalHits(totalHits);

  const normalizeIndex = (index: number): number => {
    if (safeTotalHits === 0) {
      return NO_ACTIVE_INDEX;
    }

    const safeIndex = coerceIndex(index);
    if (safeIndex < 0) {
      return NO_ACTIVE_INDEX;
    }

    return Math.min(safeIndex, safeTotalHits - 1);
  };

  const getNextIndex = (currentIndex: number): number => {
    if (safeTotalHits === 0) {
      return NO_ACTIVE_INDEX;
    }

    const normalizedIndex = normalizeIndex(currentIndex);
    if (normalizedIndex === NO_ACTIVE_INDEX) {
      return 0;
    }

    return (normalizedIndex + 1) % safeTotalHits;
  };

  const getPrevIndex = (currentIndex: number): number => {
    if (safeTotalHits === 0) {
      return NO_ACTIVE_INDEX;
    }

    const normalizedIndex = normalizeIndex(currentIndex);
    if (normalizedIndex === NO_ACTIVE_INDEX) {
      return safeTotalHits - 1;
    }

    return (normalizedIndex - 1 + safeTotalHits) % safeTotalHits;
  };

  return {
    totalHits: safeTotalHits,
    normalizeIndex,
    getNextIndex,
    getPrevIndex,
  };
}

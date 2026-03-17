import { normalizeShortcutKey } from '@/lib/keyboardShortcuts';

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

export interface HitNavigator {
  totalHits: number;
  normalizeIndex: (index: number) => number;
  getNextIndex: (currentIndex: number) => number;
  getPrevIndex: (currentIndex: number) => number;
}

export type HitNavigationCommand = 'next' | 'prev' | 'next_sermon' | 'prev_sermon' | null;

export interface HitNavigationKeyContext {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  target: EventTarget | null;
}

export interface CreateHitNavigationKeyHandlerOptions {
  hitCycleKey?: string;
  sermonCycleKey?: string;
}

export function resolveJumpToHitIndex(rawInput: string, totalHits: number): number | null {
  const safeTotalHits = coerceTotalHits(totalHits);
  if (safeTotalHits === 0) {
    return null;
  }

  const trimmedInput = rawInput.trim();
  if (!trimmedInput) {
    return null;
  }

  const parsedInput = Number(trimmedInput);
  if (!Number.isFinite(parsedInput)) {
    return null;
  }

  const requestedOneBased = Math.floor(parsedInput);
  if (requestedOneBased <= 1) {
    return 0;
  }

  if (requestedOneBased >= safeTotalHits) {
    return safeTotalHits - 1;
  }

  return requestedOneBased - 1;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.isContentEditable;
}

export function createHitNavigator(totalHits: number): HitNavigator {
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

export function createHitNavigationKeyHandler(
  context: HitNavigationKeyContext,
  options: CreateHitNavigationKeyHandlerOptions = {},
): HitNavigationCommand {
  if (context.altKey || context.ctrlKey || context.metaKey) {
    return null;
  }

  if (isTypingTarget(context.target)) {
    return null;
  }

  const normalizedKey = normalizeShortcutKey(context.key);
  if (!normalizedKey) {
    return null;
  }

  const normalizedHitCycleKey = normalizeShortcutKey(options.hitCycleKey ?? 'n');
  const normalizedSermonCycleKey = normalizeShortcutKey(options.sermonCycleKey ?? 'm');

  if (normalizedHitCycleKey && normalizedKey === normalizedHitCycleKey) {
    return context.shiftKey ? 'prev' : 'next';
  }

  if (normalizedSermonCycleKey && normalizedKey === normalizedSermonCycleKey) {
    return context.shiftKey ? 'prev_sermon' : 'next_sermon';
  }

  return null;
}

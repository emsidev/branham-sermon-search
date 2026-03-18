export interface ReaderTextToken {
  text: string;
  isWord: boolean;
}

export interface ReaderWordSelectionRange {
  anchorIndex: number;
  cursorIndex: number;
}

export interface ReaderWordRegion {
  key: string;
  text: string;
}

export interface ReaderWordRegionMap {
  totalWords: number;
  offsetsByRegion: Record<string, number>;
}

export type ReaderWordNavigationTypingTargetGuard = (target: EventTarget | null) => boolean;
export type ReaderWordNavigationShortcutCaptureTargetGuard = (target: EventTarget | null) => boolean;

export interface ResolveReaderWordNavigationCommandOptions {
  isTypingTarget?: ReaderWordNavigationTypingTargetGuard;
  isShortcutCaptureTarget?: ReaderWordNavigationShortcutCaptureTargetGuard;
}

export type ReaderWordNavigationKeyboardEventLike = Pick<
  KeyboardEvent,
  'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'defaultPrevented' | 'target'
>;

export type ReaderWordNavigationCommand = 'extend' | 'shrink' | null;

const WORD_PATTERN = /[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu;

function createWordPattern(): RegExp {
  return new RegExp(WORD_PATTERN.source, WORD_PATTERN.flags);
}

function coerceTotalWords(totalWords: number): number {
  if (!Number.isFinite(totalWords) || totalWords <= 0) {
    return 0;
  }

  return Math.floor(totalWords);
}

export function tokenizeReaderText(text: string): ReaderTextToken[] {
  if (!text) {
    return [];
  }

  const tokens: ReaderTextToken[] = [];
  const matcher = createWordPattern();
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(text)) != null) {
    const start = match.index;
    const end = start + match[0].length;

    if (start > cursor) {
      tokens.push({
        text: text.slice(cursor, start),
        isWord: false,
      });
    }

    tokens.push({
      text: match[0],
      isWord: true,
    });
    cursor = end;
  }

  if (cursor < text.length) {
    tokens.push({
      text: text.slice(cursor),
      isWord: false,
    });
  }

  return tokens;
}

export function countReaderWords(text: string): number {
  if (!text) {
    return 0;
  }

  const matcher = createWordPattern();
  let count = 0;
  while (matcher.exec(text) != null) {
    count += 1;
  }

  return count;
}

export function buildReaderWordRegionMap(regions: ReaderWordRegion[]): ReaderWordRegionMap {
  const offsetsByRegion: Record<string, number> = {};
  let totalWords = 0;

  for (const region of regions) {
    offsetsByRegion[region.key] = totalWords;
    totalWords += countReaderWords(region.text);
  }

  return {
    totalWords,
    offsetsByRegion,
  };
}

export function defaultReaderWordNavigationTypingTargetGuard(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const contentEditableAttr = target.getAttribute('contenteditable');
  const isContentEditable = Boolean(target.isContentEditable)
    || contentEditableAttr === ''
    || contentEditableAttr === 'true';

  return target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || isContentEditable;
}

export function defaultReaderWordNavigationShortcutCaptureTargetGuard(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest('[data-shortcut-capture="true"]'));
}

export function resolveReaderWordNavigationCommand(
  event: ReaderWordNavigationKeyboardEventLike,
  options: ResolveReaderWordNavigationCommandOptions = {},
): ReaderWordNavigationCommand {
  if (event.defaultPrevented) {
    return null;
  }

  if (event.altKey || event.ctrlKey || event.metaKey) {
    return null;
  }

  const isShortcutCaptureTarget = options.isShortcutCaptureTarget ?? defaultReaderWordNavigationShortcutCaptureTargetGuard;
  if (isShortcutCaptureTarget(event.target)) {
    return null;
  }

  const isTypingTarget = options.isTypingTarget ?? defaultReaderWordNavigationTypingTargetGuard;
  if (isTypingTarget(event.target)) {
    return null;
  }

  const isSpaceKey = event.key === ' ' || event.key === 'Spacebar' || event.key === 'Space';
  if ((event.key === 'ArrowRight' || event.key === 'Right' || isSpaceKey) && !event.shiftKey) {
    return 'extend';
  }

  if ((event.key === 'ArrowLeft' || event.key === 'Left') && !event.shiftKey) {
    return 'shrink';
  }

  if (isSpaceKey && event.shiftKey) {
    return 'shrink';
  }

  return null;
}

function clampReaderWordIndex(index: number, totalWords: number): number {
  if (!Number.isFinite(index)) {
    return 0;
  }

  const safeIndex = Math.floor(index);
  if (safeIndex < 0) {
    return 0;
  }

  return Math.min(safeIndex, totalWords - 1);
}

function normalizeReaderWordSelectionRange(
  range: ReaderWordSelectionRange | null,
  totalWords: number,
): ReaderWordSelectionRange | null {
  if (!range) {
    return null;
  }

  const safeTotalWords = coerceTotalWords(totalWords);
  if (safeTotalWords === 0) {
    return null;
  }

  const anchorIndex = clampReaderWordIndex(range.anchorIndex, safeTotalWords);
  const cursorIndex = Math.max(anchorIndex, clampReaderWordIndex(range.cursorIndex, safeTotalWords));

  if (anchorIndex === range.anchorIndex && cursorIndex === range.cursorIndex) {
    return range;
  }

  return {
    anchorIndex,
    cursorIndex,
  };
}

export function createReaderWordSelectionRange(
  index: number,
  totalWords: number,
): ReaderWordSelectionRange | null {
  const safeTotalWords = coerceTotalWords(totalWords);
  if (safeTotalWords === 0) {
    return null;
  }

  const safeIndex = clampReaderWordIndex(index, safeTotalWords);
  return {
    anchorIndex: safeIndex,
    cursorIndex: safeIndex,
  };
}

export function getReaderWordSelectionBounds(
  range: ReaderWordSelectionRange | null,
): { startIndex: number; endIndex: number } | null {
  if (!range) {
    return null;
  }

  return {
    startIndex: Math.min(range.anchorIndex, range.cursorIndex),
    endIndex: Math.max(range.anchorIndex, range.cursorIndex),
  };
}

export function isReaderWordSelected(
  wordIndex: number,
  range: ReaderWordSelectionRange | null,
): boolean {
  if (!Number.isFinite(wordIndex)) {
    return false;
  }

  const bounds = getReaderWordSelectionBounds(range);
  if (!bounds) {
    return false;
  }

  const safeWordIndex = Math.floor(wordIndex);
  return safeWordIndex >= bounds.startIndex && safeWordIndex <= bounds.endIndex;
}

export function extendReaderWordSelection(
  range: ReaderWordSelectionRange | null,
  totalWords: number,
): ReaderWordSelectionRange | null {
  const normalizedRange = normalizeReaderWordSelectionRange(range, totalWords);
  if (!normalizedRange) {
    return null;
  }

  const safeTotalWords = coerceTotalWords(totalWords);
  const nextCursorIndex = Math.min(normalizedRange.cursorIndex + 1, safeTotalWords - 1);
  if (nextCursorIndex === normalizedRange.cursorIndex) {
    return normalizedRange;
  }

  return {
    anchorIndex: normalizedRange.anchorIndex,
    cursorIndex: nextCursorIndex,
  };
}

export function shrinkReaderWordSelection(
  range: ReaderWordSelectionRange | null,
  totalWords: number,
): ReaderWordSelectionRange | null {
  const normalizedRange = normalizeReaderWordSelectionRange(range, totalWords);
  if (!normalizedRange) {
    return null;
  }

  if (normalizedRange.cursorIndex === normalizedRange.anchorIndex) {
    return null;
  }

  const nextCursorIndex = Math.max(normalizedRange.anchorIndex, normalizedRange.cursorIndex - 1);
  if (nextCursorIndex === normalizedRange.cursorIndex) {
    return normalizedRange;
  }

  return {
    anchorIndex: normalizedRange.anchorIndex,
    cursorIndex: nextCursorIndex,
  };
}

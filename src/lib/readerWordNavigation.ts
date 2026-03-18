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

export type ReaderHighlightMode = 'word' | 'sentence' | 'paragraph';

export interface ReaderSelectionUnitRange {
  startIndex: number;
  endIndex: number;
}

export interface ReaderSelectionUnitMap {
  mode: ReaderHighlightMode;
  totalWords: number;
  units: ReaderSelectionUnitRange[];
  unitIndexByWordIndex: number[];
}

export type ReaderWordNavigationTypingTargetGuard = (target: EventTarget | null) => boolean;
export type ReaderWordNavigationShortcutCaptureTargetGuard = (target: EventTarget | null) => boolean;

export interface ResolveReaderWordNavigationCommandOptions {
  isTypingTarget?: ReaderWordNavigationTypingTargetGuard;
  isShortcutCaptureTarget?: ReaderWordNavigationShortcutCaptureTargetGuard;
  extendShortcutKey?: string;
  shrinkShortcutKey?: string;
}

export type ReaderWordNavigationKeyboardEventLike = Pick<
  KeyboardEvent,
  'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'defaultPrevented' | 'target'
>;

export type ReaderWordNavigationCommand = 'extend' | 'shrink' | null;

const WORD_PATTERN = /[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu;
const SENTENCE_TERMINATOR_PATTERN = /[.!?]/;

function normalizeReaderNavigationKey(rawKey: string): string | null {
  if (rawKey === ' ') {
    return 'space';
  }

  const key = rawKey.trim();
  if (!key) {
    return null;
  }

  if (key === ' ' || key === 'Spacebar' || key === 'Space') {
    return 'space';
  }

  if (key === 'ArrowRight' || key === 'Right') {
    return 'arrowright';
  }

  if (key === 'ArrowLeft' || key === 'Left') {
    return 'arrowleft';
  }

  if (key.length === 1) {
    if (/\s/.test(key)) {
      return null;
    }

    return key.toLowerCase();
  }

  return key.toLowerCase();
}

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

function buildWordSelectionUnitsForRegion(
  startIndex: number,
  wordCount: number,
): ReaderSelectionUnitRange[] {
  const units: ReaderSelectionUnitRange[] = [];
  for (let index = 0; index < wordCount; index += 1) {
    const wordIndex = startIndex + index;
    units.push({
      startIndex: wordIndex,
      endIndex: wordIndex,
    });
  }
  return units;
}

function buildSentenceSelectionUnitsForRegion(
  text: string,
  startIndex: number,
): ReaderSelectionUnitRange[] {
  const tokens = tokenizeReaderText(text);
  const units: ReaderSelectionUnitRange[] = [];
  let sentenceStartIndex: number | null = null;
  let sentenceEndIndex: number | null = null;
  let wordOffset = 0;

  const commitSentence = () => {
    if (sentenceStartIndex == null || sentenceEndIndex == null) {
      return;
    }

    units.push({
      startIndex: sentenceStartIndex,
      endIndex: sentenceEndIndex,
    });
    sentenceStartIndex = null;
    sentenceEndIndex = null;
  };

  for (const token of tokens) {
    if (token.isWord) {
      const wordIndex = startIndex + wordOffset;
      if (sentenceStartIndex == null) {
        sentenceStartIndex = wordIndex;
      }
      sentenceEndIndex = wordIndex;
      wordOffset += 1;
      continue;
    }

    if (SENTENCE_TERMINATOR_PATTERN.test(token.text)) {
      commitSentence();
    }
  }

  commitSentence();
  return units;
}

function buildParagraphSelectionUnitsForRegion(
  startIndex: number,
  wordCount: number,
): ReaderSelectionUnitRange[] {
  if (wordCount <= 0) {
    return [];
  }

  return [{
    startIndex,
    endIndex: startIndex + wordCount - 1,
  }];
}

function buildSelectionUnitsForRegion(
  mode: ReaderHighlightMode,
  text: string,
  startIndex: number,
  wordCount: number,
): ReaderSelectionUnitRange[] {
  if (wordCount <= 0) {
    return [];
  }

  if (mode === 'sentence') {
    return buildSentenceSelectionUnitsForRegion(text, startIndex);
  }

  if (mode === 'paragraph') {
    return buildParagraphSelectionUnitsForRegion(startIndex, wordCount);
  }

  return buildWordSelectionUnitsForRegion(startIndex, wordCount);
}

function getUnitIndexForWordIndex(
  wordIndex: number,
  map: ReaderSelectionUnitMap,
): number | null {
  if (map.totalWords <= 0 || map.units.length === 0) {
    return null;
  }

  const safeWordIndex = clampReaderWordIndex(wordIndex, map.totalWords);
  const mappedIndex = map.unitIndexByWordIndex[safeWordIndex];
  if (Number.isInteger(mappedIndex) && mappedIndex >= 0 && mappedIndex < map.units.length) {
    return mappedIndex;
  }

  return map.units.findIndex(
    (unit) => safeWordIndex >= unit.startIndex && safeWordIndex <= unit.endIndex,
  );
}

function normalizeSelectionUnitRange(
  unit: ReaderSelectionUnitRange,
  totalWords: number,
): ReaderSelectionUnitRange {
  const startIndex = clampReaderWordIndex(unit.startIndex, totalWords);
  const endIndex = Math.max(startIndex, clampReaderWordIndex(unit.endIndex, totalWords));
  return {
    startIndex,
    endIndex,
  };
}

function normalizeSelectionUnitMap(map: ReaderSelectionUnitMap): ReaderSelectionUnitMap {
  if (map.totalWords <= 0 || map.units.length === 0) {
    return {
      ...map,
      unitIndexByWordIndex: [],
      units: [],
      totalWords: 0,
    };
  }

  const totalWords = coerceTotalWords(map.totalWords);
  const units = map.units
    .map((unit) => normalizeSelectionUnitRange(unit, totalWords))
    .filter((unit) => unit.endIndex >= unit.startIndex);

  const unitIndexByWordIndex = Array.from<number>({ length: totalWords }).fill(-1);
  units.forEach((unit, unitIndex) => {
    for (let wordIndex = unit.startIndex; wordIndex <= unit.endIndex; wordIndex += 1) {
      unitIndexByWordIndex[wordIndex] = unitIndex;
    }
  });

  let lastKnownUnitIndex = 0;
  for (let wordIndex = 0; wordIndex < unitIndexByWordIndex.length; wordIndex += 1) {
    if (unitIndexByWordIndex[wordIndex] === -1) {
      unitIndexByWordIndex[wordIndex] = lastKnownUnitIndex;
    } else {
      lastKnownUnitIndex = unitIndexByWordIndex[wordIndex];
    }
  }

  return {
    mode: map.mode,
    totalWords,
    units,
    unitIndexByWordIndex,
  };
}

export function buildReaderSelectionUnitMap(
  regions: ReaderWordRegion[],
  mode: ReaderHighlightMode,
): ReaderSelectionUnitMap {
  const regionMap = buildReaderWordRegionMap(regions);
  const units: ReaderSelectionUnitRange[] = [];

  for (const region of regions) {
    const startIndex = regionMap.offsetsByRegion[region.key] ?? 0;
    const wordCount = countReaderWords(region.text);
    units.push(...buildSelectionUnitsForRegion(mode, region.text, startIndex, wordCount));
  }

  if (units.length === 0 && regionMap.totalWords > 0) {
    units.push(...buildWordSelectionUnitsForRegion(0, regionMap.totalWords));
  }

  return normalizeSelectionUnitMap({
    mode,
    totalWords: regionMap.totalWords,
    units,
    unitIndexByWordIndex: [],
  });
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

  const normalizedEventKey = normalizeReaderNavigationKey(event.key);
  if (!normalizedEventKey) {
    return null;
  }

  const normalizedExtendShortcutKey = options.extendShortcutKey
    ? normalizeReaderNavigationKey(options.extendShortcutKey)
    : null;
  if (!event.shiftKey && normalizedExtendShortcutKey && normalizedEventKey === normalizedExtendShortcutKey) {
    return 'extend';
  }

  const normalizedShrinkShortcutKey = options.shrinkShortcutKey
    ? normalizeReaderNavigationKey(options.shrinkShortcutKey)
    : null;
  if (!event.shiftKey && normalizedShrinkShortcutKey && normalizedEventKey === normalizedShrinkShortcutKey) {
    return 'shrink';
  }

  if (!event.shiftKey && (normalizedEventKey === 'arrowright' || normalizedEventKey === 'space')) {
    return 'extend';
  }

  if (!event.shiftKey && normalizedEventKey === 'arrowleft') {
    return 'shrink';
  }

  if (normalizedEventKey === 'space' && event.shiftKey) {
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

export function createReaderWordSelectionRangeFromUnitMap(
  wordIndex: number,
  unitMap: ReaderSelectionUnitMap,
): ReaderWordSelectionRange | null {
  const safeMap = normalizeSelectionUnitMap(unitMap);
  const unitIndex = getUnitIndexForWordIndex(wordIndex, safeMap);
  if (unitIndex == null || unitIndex < 0 || unitIndex >= safeMap.units.length) {
    return null;
  }

  const unit = safeMap.units[unitIndex];
  return {
    anchorIndex: unit.startIndex,
    cursorIndex: unit.endIndex,
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

export function extendReaderWordSelectionByUnit(
  range: ReaderWordSelectionRange | null,
  unitMap: ReaderSelectionUnitMap,
): ReaderWordSelectionRange | null {
  const safeMap = normalizeSelectionUnitMap(unitMap);
  const normalizedRange = normalizeReaderWordSelectionRange(range, safeMap.totalWords);
  if (!normalizedRange || safeMap.units.length === 0) {
    return null;
  }

  const bounds = getReaderWordSelectionBounds(normalizedRange);
  if (!bounds) {
    return null;
  }

  const startUnitIndex = getUnitIndexForWordIndex(bounds.startIndex, safeMap);
  const endUnitIndex = getUnitIndexForWordIndex(bounds.endIndex, safeMap);
  if (startUnitIndex == null || endUnitIndex == null || startUnitIndex < 0 || endUnitIndex < 0) {
    return normalizedRange;
  }

  const nextEndUnitIndex = Math.min(endUnitIndex + 1, safeMap.units.length - 1);
  if (nextEndUnitIndex === endUnitIndex) {
    return normalizedRange;
  }

  return {
    anchorIndex: safeMap.units[startUnitIndex].startIndex,
    cursorIndex: safeMap.units[nextEndUnitIndex].endIndex,
  };
}

export function shrinkReaderWordSelectionByUnit(
  range: ReaderWordSelectionRange | null,
  unitMap: ReaderSelectionUnitMap,
): ReaderWordSelectionRange | null {
  const safeMap = normalizeSelectionUnitMap(unitMap);
  const normalizedRange = normalizeReaderWordSelectionRange(range, safeMap.totalWords);
  if (!normalizedRange || safeMap.units.length === 0) {
    return null;
  }

  const bounds = getReaderWordSelectionBounds(normalizedRange);
  if (!bounds) {
    return null;
  }

  const startUnitIndex = getUnitIndexForWordIndex(bounds.startIndex, safeMap);
  const endUnitIndex = getUnitIndexForWordIndex(bounds.endIndex, safeMap);
  if (startUnitIndex == null || endUnitIndex == null || startUnitIndex < 0 || endUnitIndex < 0) {
    return normalizedRange;
  }

  if (endUnitIndex <= startUnitIndex) {
    return null;
  }

  return {
    anchorIndex: safeMap.units[startUnitIndex].startIndex,
    cursorIndex: safeMap.units[endUnitIndex - 1].endIndex,
  };
}

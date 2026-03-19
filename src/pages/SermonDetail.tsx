import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Share2, Check, FileText, Search as SearchIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fetchSermonById, fetchAdjacentSermons, fetchBoundarySermons, type SermonDetail as Sermon } from '@/hooks/useSermons';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSermonScrollProgress } from '@/hooks/useSermonScrollProgress';
import ReadingModeToggleButton from '@/components/reader/ReadingModeToggleButton';
import SermonProgressBar from '@/components/reader/SermonProgressBar';
import SermonBreadcrumb from '@/components/SermonBreadcrumb';
import SharedSearchExperience from '@/components/search/SharedSearchExperience';
import SermonDetailFixedChevrons from '@/components/search/SermonDetailFixedChevrons';
import { useHitNavigation } from '@/hooks/useHitNavigation';
import { renderActiveHitHighlights } from '@/components/search/activeHitHighlighting';
import { SearchPopup } from '@/components/search/SearchPopup';
import { useSearchPopupController } from '@/hooks/useSearchPopupController';
import {
  extractHitChunkIndex,
  extractQueryTerms,
  formatMatchSourceLabel,
  resolveHighlightTermsForText,
  splitTextByTerms,
  type SearchMatchOptions,
} from '@/lib/search';
import { buildSearchHrefFromQuery, readSearchReturnTo } from '@/lib/searchNavigation';
import {
  buildAdjacentSermonHitTarget,
  createAdjacentSermonHitNavigationHandlers,
  scrollSermonDetailToTop,
  type AdjacentHitNavigationTarget,
} from '@/lib/sermonDetailHitNavigation';
import { shouldTriggerReadingModeShortcut } from '@/lib/readingModeShortcuts';
import { buildReadingModeSearch, isReadingModeEnabledFromSearchParams } from '@/lib/readingModeUrlState';
import { getEffectiveHitScrollBehavior } from '@/lib/preferences';
import { formatShortcutKey } from '@/lib/keyboardShortcuts';
import {
  buildReaderWordRegionMap,
  buildReaderSelectionUnitMap,
  createReaderWordSelectionRangeFromUnitMap,
  extendReaderWordSelectionByUnit,
  getReaderWordSelectionBounds,
  isReaderWordSelected,
  resolveReaderWordNavigationCommand,
  shrinkReaderWordSelectionByUnit,
  tokenizeReaderText,
  type ReaderHighlightMode,
  type ReaderSelectionUnitMap,
  type ReaderSelectionUnitRange,
  type ReaderWordRegion,
  type ReaderWordSelectionRange,
} from '@/lib/readerWordNavigation';
import {
  buildReaderHighlightModeSearch,
  getReaderHighlightModeFromSearchParams,
} from '@/lib/readerHighlightModeUrlState';
import {
  READER_SLIDE_PAGE_QUERY_PARAM,
  buildReaderSlideViewSearch,
  getReaderSlideSelectionFromSearchParams,
  isReaderSlideViewEnabledFromSearchParams,
  withReaderSlideSelectionSearchParams,
} from '@/lib/readerSlideViewUrlState';

interface AdjacentSermon {
  id: string;
  title: string;
  date: string;
}

type SearchMatchOrigin = 'title' | 'paragraph' | 'content';

interface FindResult {
  id: string;
  absoluteIndex: number;
  origin: SearchMatchOrigin;
  paragraphNumber: number | null;
  localMatchIndex: number;
  contextLabel: string;
  matchText: string;
  preview: string;
}

interface RegionMatchMeta {
  origin: SearchMatchOrigin;
  paragraphNumber: number | null;
  offset: number;
  totalMatches: number;
}

interface SermonFindModel {
  totalMatches: number;
  results: FindResult[];
  regionMetaByKey: Record<string, RegionMatchMeta>;
}

const TITLE_REGION_KEY = 'title';
const CONTENT_REGION_KEY = 'content';
const SNIPPET_BEFORE_CHARS = 44;
const SNIPPET_AFTER_CHARS = 70;
const SELECTED_READER_SEGMENT_CLASS = 'bg-emerald-200/60 text-foreground';
const READER_TEXT_OPTIONS_POPUP_EDGE_MARGIN_PX = 12;
const READER_TEXT_OPTIONS_POPUP_ANCHOR_GAP_PX = 10;
const READER_TEXT_OPTIONS_POPUP_DEFAULT_TOP_OFFSET_PX = 16;
const READER_TEXT_OPTIONS_POPUP_FALLBACK_WIDTH_PX = 248;
const READER_TEXT_OPTIONS_POPUP_FALLBACK_HEIGHT_PX = 124;
const READER_SELECTION_VISIBILITY_TOP_MARGIN_PX = 96;
const READER_SELECTION_VISIBILITY_BOTTOM_MARGIN_PX = 112;
const READER_SELECTION_VISIBILITY_MIN_DISTANCE_PX = 0.5;
const READER_SLIDE_VIEW_HINT_TIMEOUT_MS = 1400;
const READER_SLIDE_DEFAULT_PAGE = 1;
const READER_SLIDE_DEFAULT_VIEWPORT_WIDTH = 1920;
const READER_SLIDE_DEFAULT_VIEWPORT_HEIGHT = 1080;
const READER_SLIDE_QUOTE_ATTRIBUTION = 'William Branham';
const READER_HIGHLIGHT_MODE_OPTIONS: Array<{ mode: ReaderHighlightMode; label: string; shortLabel: string }> = [
  { mode: 'word', label: 'Word', shortLabel: 'W' },
  { mode: 'sentence', label: 'Sentence', shortLabel: 'S' },
  { mode: 'paragraph', label: 'Paragraph', shortLabel: 'P' },
];

interface ReaderHighlightModeHudPosition {
  top: number;
  left: number;
  side: 'left' | 'inside-left';
  anchorWordIndex: number | null;
}

interface ReadingModeToggleAnchorSnapshot {
  targetReadingMode: boolean;
  selectedWordIndex: number | null;
  paragraphNumber: number | null;
}

interface ReaderSlideViewportSnapshot {
  width: number;
  height: number;
}

interface ReaderSlideFitMetrics {
  maxLinesPerSlide: number;
  maxCharsPerLine: number;
}

interface ReaderSlideQueueEntry {
  startIndex: number;
  endIndex: number;
  modeAtCapture: ReaderHighlightMode;
}

interface ReaderSlidePage {
  text: string;
  sourceIndex: number;
  sourceTotal: number;
  modeAtCapture: ReaderHighlightMode;
  continuationIndex: number;
  continuationTotal: number;
}

function getNextReaderHighlightMode(mode: ReaderHighlightMode): ReaderHighlightMode {
  if (mode === 'word') {
    return 'sentence';
  }

  if (mode === 'sentence') {
    return 'paragraph';
  }

  return 'word';
}

function getParagraphRegionKey(paragraphNumber: number): string {
  return `paragraph-${paragraphNumber}`;
}

function calculateReaderSelectionVisibilityDistance(targetRect: DOMRect, viewportHeight: number): number {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    return 0;
  }

  const topBoundary = Math.min(
    READER_SELECTION_VISIBILITY_TOP_MARGIN_PX,
    Math.max(0, viewportHeight - 1),
  );
  const bottomBoundary = Math.max(
    topBoundary + 1,
    viewportHeight - READER_SELECTION_VISIBILITY_BOTTOM_MARGIN_PX,
  );

  if (targetRect.top < topBoundary) {
    return targetRect.top - topBoundary;
  }

  if (targetRect.bottom > bottomBoundary) {
    return targetRect.bottom - bottomBoundary;
  }

  return 0;
}

function buildMatchPreview(text: string, start: number, end: number): string {
  const startBound = Math.max(0, start - SNIPPET_BEFORE_CHARS);
  const endBound = Math.min(text.length, end + SNIPPET_AFTER_CHARS);

  let snippet = text.slice(startBound, endBound).replace(/\s+/g, ' ').trim();
  if (!snippet) {
    return '';
  }

  if (startBound > 0) {
    snippet = `...${snippet}`;
  }
  if (endBound < text.length) {
    snippet = `${snippet}...`;
  }

  return snippet;
}

function buildSermonFindModel(
  sermon: Sermon | null,
  terms: string[],
  matchOptions: SearchMatchOptions,
): SermonFindModel {
  if (!sermon || terms.length === 0) {
    return {
      totalMatches: 0,
      results: [],
      regionMetaByKey: {},
    };
  }

  const results: FindResult[] = [];
  const regionMetaByKey: Record<string, RegionMatchMeta> = {};
  let absoluteIndex = 0;

  const appendRegion = (
    regionKey: string,
    origin: SearchMatchOrigin,
    text: string,
    paragraphNumber: number | null,
  ) => {
    const effectiveTerms = resolveHighlightTermsForText(text, terms, matchOptions);
    const parts = splitTextByTerms(text, effectiveTerms, matchOptions);
    const regionOffset = absoluteIndex;
    let localMatchIndex = 0;
    let cursor = 0;

    for (const part of parts) {
      const partStart = cursor;
      const partEnd = cursor + part.text.length;

      if (part.matched && part.text.length > 0) {
        const contextLabel = origin === 'title'
          ? 'Title'
          : origin === 'paragraph'
            ? `Paragraph ${paragraphNumber ?? '-'}`
            : 'Content';

        results.push({
          id: `${regionKey}:${localMatchIndex}`,
          absoluteIndex,
          origin,
          paragraphNumber,
          localMatchIndex,
          contextLabel,
          matchText: part.text,
          preview: buildMatchPreview(text, partStart, partEnd),
        });
        localMatchIndex += 1;
        absoluteIndex += 1;
      }

      cursor = partEnd;
    }

    regionMetaByKey[regionKey] = {
      origin,
      paragraphNumber,
      offset: regionOffset,
      totalMatches: localMatchIndex,
    };
  };

  appendRegion(TITLE_REGION_KEY, 'title', sermon.title, null);

  if (sermon.paragraphs.length > 0) {
    for (const paragraph of sermon.paragraphs) {
      appendRegion(
        getParagraphRegionKey(paragraph.paragraph_number),
        'paragraph',
        paragraph.paragraph_text,
        paragraph.paragraph_number,
      );
    }
  } else {
    appendRegion(CONTENT_REGION_KEY, 'content', sermon.text_content, null);
  }

  return {
    totalMatches: results.length,
    results,
    regionMetaByKey,
  };
}

function resolveRouteTargetMatchIndex(
  results: FindResult[],
  source: string | null,
  paragraphNumber: number | null,
  chunkIndex: number | null,
): number {
  if (results.length === 0) {
    return -1;
  }

  if (source === 'paragraph_text' && paragraphNumber != null) {
    const paragraphMatches = results.filter(
      (result) => result.origin === 'paragraph' && result.paragraphNumber === paragraphNumber,
    );
    if (paragraphMatches.length > 0) {
      const localTargetIndex = chunkIndex && chunkIndex > 0 ? chunkIndex - 1 : 0;
      const safeIndex = Math.min(localTargetIndex, paragraphMatches.length - 1);
      return paragraphMatches[safeIndex].absoluteIndex;
    }
  }

  if (source === 'title') {
    const titleMatch = results.find((result) => result.origin === 'title');
    if (titleMatch) {
      return titleMatch.absoluteIndex;
    }
  }

  return results[0].absoluteIndex;
}

interface ReaderWordNodeRenderResult {
  content: React.ReactNode;
  nextWordIndex: number;
}

function renderReaderWordsFromText(
  text: string,
  startWordIndex: number,
  selectedWordRange: ReaderWordSelectionRange | null,
  onWordSelect: (wordIndex: number) => void,
): ReaderWordNodeRenderResult {
  const tokens = tokenizeReaderText(text);
  if (tokens.length === 0) {
    return {
      content: text,
      nextWordIndex: startWordIndex,
    };
  }

  let nextWordIndex = startWordIndex;
  const selectedBounds = getReaderWordSelectionBounds(selectedWordRange);
  const content = tokens.map((token, tokenIndex) => {
    if (!token.isWord) {
      const previousWordIndex = nextWordIndex - 1;
      const nextWordCandidateIndex = nextWordIndex;
      const isSelectedSeparator = Boolean(
        selectedBounds
        && previousWordIndex >= selectedBounds.startIndex
        && nextWordCandidateIndex <= selectedBounds.endIndex
      );

      if (!isSelectedSeparator) {
        return token.text;
      }

      return (
        <span
          key={`separator:${startWordIndex}:${tokenIndex}`}
          data-reader-word-separator-selected="true"
          className={SELECTED_READER_SEGMENT_CLASS}
        >
          {token.text}
        </span>
      );
    }

    const wordIndex = nextWordIndex;
    const isSelectedWord = isReaderWordSelected(wordIndex, selectedWordRange);
    nextWordIndex += 1;

    return (
      <span
        key={`${wordIndex}:${tokenIndex}`}
        data-reader-word="true"
        data-reader-word-index={String(wordIndex)}
        data-reader-word-selected={isSelectedWord ? 'true' : 'false'}
        className={isSelectedWord ? SELECTED_READER_SEGMENT_CLASS : undefined}
        onClick={() => onWordSelect(wordIndex)}
      >
        {token.text}
      </span>
    );
  });

  return {
    content,
    nextWordIndex,
  };
}

function renderReaderWordsFromNode(
  node: React.ReactNode,
  startWordIndex: number,
  selectedWordRange: ReaderWordSelectionRange | null,
  onWordSelect: (wordIndex: number) => void,
): ReaderWordNodeRenderResult {
  if (node == null || typeof node === 'boolean') {
    return {
      content: node,
      nextWordIndex: startWordIndex,
    };
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return renderReaderWordsFromText(String(node), startWordIndex, selectedWordRange, onWordSelect);
  }

  if (Array.isArray(node)) {
    let nextWordIndex = startWordIndex;
    const content = node.map((child, childIndex) => {
      const childResult = renderReaderWordsFromNode(child, nextWordIndex, selectedWordRange, onWordSelect);
      nextWordIndex = childResult.nextWordIndex;
      return <React.Fragment key={childIndex}>{childResult.content}</React.Fragment>;
    });

    return {
      content,
      nextWordIndex,
    };
  }

  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.props.children == null) {
      return {
        content: element,
        nextWordIndex: startWordIndex,
      };
    }

    const childResult = renderReaderWordsFromNode(
      element.props.children,
      startWordIndex,
      selectedWordRange,
      onWordSelect,
    );

    return {
      content: React.cloneElement(element, undefined, childResult.content),
      nextWordIndex: childResult.nextWordIndex,
    };
  }

  return {
    content: node,
    nextWordIndex: startWordIndex,
  };
}

function renderReaderWordHighlights(
  node: React.ReactNode,
  startWordIndex: number,
  selectedWordRange: ReaderWordSelectionRange | null,
  onWordSelect: (wordIndex: number) => void,
): React.ReactNode {
  return renderReaderWordsFromNode(node, startWordIndex, selectedWordRange, onWordSelect).content;
}

function normalizeReaderSelectionBounds(
  startIndex: number,
  endIndex: number,
): { startIndex: number; endIndex: number } {
  return {
    startIndex: Math.min(startIndex, endIndex),
    endIndex: Math.max(startIndex, endIndex),
  };
}

function extractSlideTextFromBounds(
  regions: ReaderWordRegion[],
  bounds: { startIndex: number; endIndex: number },
): string {
  const normalizedBounds = normalizeReaderSelectionBounds(bounds.startIndex, bounds.endIndex);

  let globalWordIndex = 0;
  const segments: string[] = [];

  for (const region of regions) {
    const tokens = tokenizeReaderText(region.text);
    const regionWordCount = tokens.reduce((count, token) => count + (token.isWord ? 1 : 0), 0);
    if (regionWordCount === 0) {
      continue;
    }

    const regionStartWordIndex = globalWordIndex;
    const regionEndWordIndex = regionStartWordIndex + regionWordCount - 1;
    globalWordIndex += regionWordCount;

    if (normalizedBounds.endIndex < regionStartWordIndex || normalizedBounds.startIndex > regionEndWordIndex) {
      continue;
    }

    const targetStartWordInRegion = Math.max(normalizedBounds.startIndex, regionStartWordIndex) - regionStartWordIndex;
    const targetEndWordInRegion = Math.min(normalizedBounds.endIndex, regionEndWordIndex) - regionStartWordIndex;

    let cursor = 0;
    let regionWordIndex = 0;
    let selectionStartOffset: number | null = null;
    let selectionEndOffset: number | null = null;

    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
      const token = tokens[tokenIndex];
      const tokenStart = cursor;
      const tokenEnd = tokenStart + token.text.length;
      cursor = tokenEnd;

      if (!token.isWord) {
        continue;
      }

      if (selectionStartOffset == null && regionWordIndex === targetStartWordInRegion) {
        selectionStartOffset = tokenStart;
      }

      if (regionWordIndex === targetEndWordInRegion) {
        selectionEndOffset = tokenEnd;
        for (let trailingIndex = tokenIndex + 1; trailingIndex < tokens.length; trailingIndex += 1) {
          const trailingToken = tokens[trailingIndex];
          if (trailingToken.isWord) {
            break;
          }
          selectionEndOffset += trailingToken.text.length;
        }
        break;
      }

      regionWordIndex += 1;
    }

    if (selectionStartOffset == null || selectionEndOffset == null) {
      continue;
    }

    const segment = region.text.slice(selectionStartOffset, selectionEndOffset).trim();
    if (segment) {
      segments.push(segment);
    }
  }

  return segments.join('\n\n');
}

function extractParagraphTextsFromBounds(
  regions: ReaderWordRegion[],
  bounds: { startIndex: number; endIndex: number },
): { paragraphs: string[]; snappedBounds: { startIndex: number; endIndex: number } } | null {
  const normalizedBounds = normalizeReaderSelectionBounds(bounds.startIndex, bounds.endIndex);
  let globalWordIndex = 0;
  const matchedParagraphs: Array<{
    text: string;
    startIndex: number;
    endIndex: number;
  }> = [];

  for (const region of regions) {
    const tokens = tokenizeReaderText(region.text);
    const regionWordCount = tokens.reduce((count, token) => count + (token.isWord ? 1 : 0), 0);
    if (regionWordCount === 0) {
      continue;
    }

    const regionStartWordIndex = globalWordIndex;
    const regionEndWordIndex = regionStartWordIndex + regionWordCount - 1;
    globalWordIndex += regionWordCount;

    if (normalizedBounds.endIndex < regionStartWordIndex || normalizedBounds.startIndex > regionEndWordIndex) {
      continue;
    }

    const paragraphText = region.text.replace(/\s+/g, ' ').trim();
    if (!paragraphText) {
      continue;
    }

    matchedParagraphs.push({
      text: paragraphText,
      startIndex: regionStartWordIndex,
      endIndex: regionEndWordIndex,
    });
  }

  if (matchedParagraphs.length === 0) {
    return null;
  }

  return {
    paragraphs: matchedParagraphs.map((paragraph) => paragraph.text),
    snappedBounds: {
      startIndex: matchedParagraphs[0].startIndex,
      endIndex: matchedParagraphs[matchedParagraphs.length - 1].endIndex,
    },
  };
}

function createReaderSlideQueueEntryFromRange(
  regions: ReaderWordRegion[],
  range: ReaderWordSelectionRange | null,
  modeAtCapture: ReaderHighlightMode,
): ReaderSlideQueueEntry | null {
  const bounds = getReaderWordSelectionBounds(range);
  if (!bounds) {
    return null;
  }

  if (modeAtCapture === 'paragraph') {
    const paragraphSelection = extractParagraphTextsFromBounds(regions, bounds);
    if (!paragraphSelection) {
      return null;
    }

    return {
      startIndex: paragraphSelection.snappedBounds.startIndex,
      endIndex: paragraphSelection.snappedBounds.endIndex,
      modeAtCapture,
    };
  }

  const normalizedBounds = normalizeReaderSelectionBounds(bounds.startIndex, bounds.endIndex);
  return {
    startIndex: normalizedBounds.startIndex,
    endIndex: normalizedBounds.endIndex,
    modeAtCapture,
  };
}

function buildReaderSlideTextForQueueEntry(
  regions: ReaderWordRegion[],
  queueEntry: ReaderSlideQueueEntry,
): string {
  const selectionBounds = {
    startIndex: queueEntry.startIndex,
    endIndex: queueEntry.endIndex,
  };

  if (queueEntry.modeAtCapture === 'paragraph') {
    const paragraphSelection = extractParagraphTextsFromBounds(regions, selectionBounds);
    if (!paragraphSelection) {
      return '';
    }
    return paragraphSelection.paragraphs.join('\n\n');
  }

  return extractSlideTextFromBounds(regions, selectionBounds);
}

function isSameReaderSlideQueueEntry(
  a: ReaderSlideQueueEntry,
  b: ReaderSlideQueueEntry,
): boolean {
  return a.startIndex === b.startIndex
    && a.endIndex === b.endIndex
    && a.modeAtCapture === b.modeAtCapture;
}

function getReaderSlideSourceLabel(mode: ReaderHighlightMode): string {
  if (mode === 'paragraph') {
    return 'Paragraph';
  }

  if (mode === 'sentence') {
    return 'Sentence';
  }

  return 'Selection';
}

function createReaderSlideQueueEntryFromSearchParams(
  selection: { startIndex: number; endIndex: number } | null,
): ReaderSlideQueueEntry | null {
  if (!selection) {
    return null;
  }

  const normalizedBounds = normalizeReaderSelectionBounds(selection.startIndex, selection.endIndex);
  return {
    startIndex: normalizedBounds.startIndex,
    endIndex: normalizedBounds.endIndex,
    modeAtCapture: 'paragraph',
  };
}

function getSafeReaderSlideViewportSnapshot(): ReaderSlideViewportSnapshot {
  if (typeof window === 'undefined') {
    return {
      width: READER_SLIDE_DEFAULT_VIEWPORT_WIDTH,
      height: READER_SLIDE_DEFAULT_VIEWPORT_HEIGHT,
    };
  }

  return {
    width: Math.max(320, Math.floor(window.innerWidth || READER_SLIDE_DEFAULT_VIEWPORT_WIDTH)),
    height: Math.max(320, Math.floor(window.innerHeight || READER_SLIDE_DEFAULT_VIEWPORT_HEIGHT)),
  };
}

function splitSlideTextIntoSentences(text: string): string[] {
  const normalized = text
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) {
    return [];
  }

  const candidates = normalized.match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g) ?? [];
  return candidates
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function splitOversizedSlideUnit(unit: string, maxCharsPerPage: number): string[] {
  const normalizedMaxChars = Math.max(36, Math.floor(maxCharsPerPage));
  if (unit.length <= normalizedMaxChars) {
    return [unit];
  }

  const words = unit.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return [unit];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  for (const word of words) {
    const nextChunk = currentChunk ? `${currentChunk} ${word}` : word;
    if (nextChunk.length <= normalizedMaxChars || !currentChunk) {
      currentChunk = nextChunk;
      continue;
    }

    chunks.push(currentChunk);
    currentChunk = word;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function resolveReaderSlideFitMetrics(viewport: ReaderSlideViewportSnapshot): ReaderSlideFitMetrics {
  const width = Math.max(320, viewport.width);
  const height = Math.max(320, viewport.height);

  const quoteAreaWidth = Math.floor(width * 0.55);
  const textColumnWidth = Math.max(340, quoteAreaWidth - 180);
  const slideFontSize = Math.max(18, Math.min(34, Math.floor(width * 0.018)));
  const lineHeight = Math.floor(slideFontSize * 1.14);
  const availableTextHeight = Math.max(280, Math.floor(height * 0.6));
  const maxLinesPerSlide = Math.max(6, Math.floor(availableTextHeight / Math.max(lineHeight, 1)));
  const approxCharWidth = Math.max(9, Math.floor(slideFontSize * 0.46));
  const maxCharsPerLine = Math.max(28, Math.floor(textColumnWidth / approxCharWidth));

  return {
    maxLinesPerSlide,
    maxCharsPerLine,
  };
}

function estimateSlideUnitLineCount(unit: string, maxCharsPerLine: number): number {
  const safeCharsPerLine = Math.max(20, maxCharsPerLine);
  if (!unit.trim()) {
    return 1;
  }

  const logicalLines = unit
    .split('\n')
    .map((line) => Math.max(1, Math.ceil(line.length / safeCharsPerLine)));

  return logicalLines.reduce((sum, lineCount) => sum + lineCount, 0);
}

function paginateReaderSlideUnits(
  units: string[],
  metrics: ReaderSlideFitMetrics,
): string[] {
  if (units.length === 0) {
    return [];
  }

  const pages: string[] = [];
  let currentUnits: string[] = [];
  let currentLineCount = 0;

  for (const unit of units) {
    const unitLineCount = estimateSlideUnitLineCount(unit, metrics.maxCharsPerLine);
    const nextLineCount = currentLineCount + unitLineCount;
    const exceedsLineBudget = nextLineCount > metrics.maxLinesPerSlide;
    if (currentUnits.length > 0 && exceedsLineBudget) {
      pages.push(currentUnits.join(' ').trim());
      currentUnits = [];
      currentLineCount = 0;
    }

    currentUnits.push(unit);
    currentLineCount += unitLineCount;
  }

  if (currentUnits.length > 0) {
    pages.push(currentUnits.join(' ').trim());
  }

  return pages.filter((page) => page.length > 0);
}

function splitSlidePassageIntoParts(
  passage: string,
  metrics: ReaderSlideFitMetrics,
): string[] {
  const normalizedPassage = passage.replace(/\s+/g, ' ').trim();
  if (!normalizedPassage) {
    return [];
  }

  const maxCharsPerPage = Math.max(140, metrics.maxCharsPerLine * metrics.maxLinesPerSlide);
  const lineCount = estimateSlideUnitLineCount(normalizedPassage, metrics.maxCharsPerLine);
  if (lineCount <= metrics.maxLinesPerSlide) {
    return [normalizedPassage];
  }

  const sentences = splitSlideTextIntoSentences(normalizedPassage);
  if (sentences.length <= 1) {
    const chunkedUnits = splitOversizedSlideUnit(normalizedPassage, maxCharsPerPage);
    return paginateReaderSlideUnits(chunkedUnits, metrics);
  }

  const sentenceUnits = sentences.flatMap((sentence) => splitOversizedSlideUnit(sentence, maxCharsPerPage));
  return paginateReaderSlideUnits(sentenceUnits, metrics);
}

function buildReaderSlidePages(
  regions: ReaderWordRegion[],
  queue: ReaderSlideQueueEntry[],
  viewport: ReaderSlideViewportSnapshot,
): ReaderSlidePage[] {
  if (queue.length === 0) {
    return [];
  }

  const metrics = resolveReaderSlideFitMetrics(viewport);
  const pages: ReaderSlidePage[] = [];

  queue.forEach((queueEntry, queueIndex) => {
    const text = buildReaderSlideTextForQueueEntry(regions, queueEntry);
    const parts = splitSlidePassageIntoParts(text, metrics);
    if (parts.length === 0) {
      return;
    }

    parts.forEach((partText, partIndex) => {
      pages.push({
        text: partText,
        sourceIndex: queueIndex + 1,
        sourceTotal: queue.length,
        modeAtCapture: queueEntry.modeAtCapture,
        continuationIndex: partIndex + 1,
        continuationTotal: parts.length,
      });
    });
  });

  return pages;
}

function createReaderWordSelectionRangeFromBounds(
  startIndex: number,
  endIndex: number,
  totalWords: number,
): ReaderWordSelectionRange | null {
  if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex)) {
    return null;
  }

  const safeTotalWords = Math.floor(totalWords);
  if (!Number.isFinite(safeTotalWords) || safeTotalWords <= 0) {
    return null;
  }

  const safeStart = Math.min(
    safeTotalWords - 1,
    Math.max(0, Math.floor(Math.min(startIndex, endIndex))),
  );
  const safeEnd = Math.min(
    safeTotalWords - 1,
    Math.max(safeStart, Math.floor(Math.max(startIndex, endIndex))),
  );

  return {
    anchorIndex: safeStart,
    cursorIndex: safeEnd,
  };
}

function getNextReaderSelectionUnitAfterQueueTail(
  queueTail: ReaderSlideQueueEntry | null,
  unitMap: ReaderSelectionUnitMap,
): ReaderSelectionUnitRange | null {
  if (!queueTail) {
    return null;
  }

  const safeTotalWords = Math.floor(unitMap.totalWords);
  if (!Number.isFinite(safeTotalWords) || safeTotalWords <= 0 || unitMap.units.length === 0) {
    return null;
  }

  const safeTailEndIndex = Math.min(
    safeTotalWords - 1,
    Math.max(0, Math.floor(queueTail.endIndex)),
  );

  let unitIndex = unitMap.unitIndexByWordIndex[safeTailEndIndex] ?? -1;
  if (!Number.isInteger(unitIndex) || unitIndex < 0 || unitIndex >= unitMap.units.length) {
    unitIndex = unitMap.units.findIndex(
      (unit) => safeTailEndIndex >= unit.startIndex && safeTailEndIndex <= unit.endIndex,
    );
  }

  if (unitIndex < 0 || unitIndex >= unitMap.units.length - 1) {
    return null;
  }

  const nextUnit = unitMap.units[unitIndex + 1];
  return {
    startIndex: nextUnit.startIndex,
    endIndex: nextUnit.endIndex,
  };
}

export default function SermonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [adjacent, setAdjacent] = useState<{ prev: AdjacentSermon | null; next: AdjacentSermon | null }>({ prev: null, next: null });
  const [boundarySermons, setBoundarySermons] = useState<{ first: AdjacentSermon | null; last: AdjacentSermon | null }>({
    first: null,
    last: null,
  });
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState(false);
  const [selectedWordRange, setSelectedWordRange] = useState<ReaderWordSelectionRange | null>(null);
  const [readerTextOptionsPopupPosition, setReaderTextOptionsPopupPosition] = useState<ReaderHighlightModeHudPosition | null>(null);
  const [isSlideShortcutHintVisible, setIsSlideShortcutHintVisible] = useState(false);
  const [slideShortcutHintText, setSlideShortcutHintText] = useState('');
  const [readerSlideViewport, setReaderSlideViewport] = useState<ReaderSlideViewportSnapshot>(() => (
    getSafeReaderSlideViewportSnapshot()
  ));
  const [isReaderSlideVisualImageVisible, setIsReaderSlideVisualImageVisible] = useState(true);
  const [presentationHighlightQueue, setPresentationHighlightQueue] = useState<ReaderSlideQueueEntry[]>([]);
  const [readerSlidePage, setReaderSlidePage] = useState(READER_SLIDE_DEFAULT_PAGE);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const readerTextOptionsPopupRef = useRef<HTMLDivElement | null>(null);
  const selectedWordRangeRef = useRef<ReaderWordSelectionRange | null>(null);
  const slideShortcutHintTimeoutRef = useRef<number | null>(null);
  const readingModeToggleAnchorRef = useRef<ReadingModeToggleAnchorSnapshot | null>(null);
  const presentationHighlightQueueRef = useRef<ReaderSlideQueueEntry[]>([]);
  const { play, url: activeAudioUrl } = useAudioPlayer();
  const { bindings } = useKeyboardShortcuts();

  const searchQuery = searchParams.get('q')?.trim() ?? '';
  const matchSource = searchParams.get('source');
  const paragraphParam = searchParams.get('paragraph');
  const hitId = searchParams.get('hit');
  const fuzzy = searchParams.get('fuzzy') === '1';
  const matchCase = searchParams.get('matchCase') === '1';
  const wholeWordParam = searchParams.get('wholeWord');
  const wholeWord = wholeWordParam == null ? true : wholeWordParam === '1';
  const isReadingModeEnabled = useMemo(
    () => isReadingModeEnabledFromSearchParams(searchParams),
    [searchParams],
  );
  const readerHighlightMode = useMemo(
    () => getReaderHighlightModeFromSearchParams(searchParams),
    [searchParams],
  );
  const isReaderSlideViewEnabled = useMemo(
    () => isReaderSlideViewEnabledFromSearchParams(searchParams),
    [searchParams],
  );
  const readerSlideSelectionFromSearchParams = useMemo(
    () => getReaderSlideSelectionFromSearchParams(searchParams),
    [searchParams],
  );
  const effectiveMatchCase = fuzzy ? false : matchCase;
  const effectiveWholeWord = fuzzy ? false : wholeWord;
  const searchShortcutKey = 'f';

  const {
    isOpen: isSearchPopupOpen,
    shouldFocusInput: shouldFocusSearchInput,
    openFromToolbar: openSearchPopupFromToolbar,
    close: closeSearchPopup,
    consumeInputFocusRequest: consumeSearchPopupFocusRequest,
    handleGlobalKeyDown: handleSearchPopupShortcutKeyDown,
  } = useSearchPopupController({
    shortcutKey: searchShortcutKey,
  });

  const highlightTerms = useMemo(() => extractQueryTerms(searchQuery, 12), [searchQuery]);
  const targetChunkIndex = useMemo(() => extractHitChunkIndex(hitId), [hitId]);
  const targetParagraphNumber = useMemo(() => {
    const parsedParagraph = paragraphParam ? Number.parseInt(paragraphParam, 10) : null;
    return Number.isFinite(parsedParagraph ?? NaN) ? parsedParagraph : null;
  }, [paragraphParam]);
  const highlightMatchOptions = useMemo<SearchMatchOptions>(() => ({
    matchCase: effectiveMatchCase,
    wholeWord: effectiveWholeWord,
    fuzzy,
  }), [effectiveMatchCase, effectiveWholeWord, fuzzy]);
  const isRouteSearchContext = searchQuery.length > 0;
  const searchReturnTo = useMemo(() => readSearchReturnTo(location.state), [location.state]);
  const breadcrumbRootHref = useMemo(() => {
    if (searchReturnTo) {
      return searchReturnTo;
    }

    if (searchQuery) {
      return buildSearchHrefFromQuery(searchQuery, highlightMatchOptions);
    }

    return buildSearchHrefFromQuery('', highlightMatchOptions);
  }, [highlightMatchOptions, searchQuery, searchReturnTo]);
  const findModel = useMemo(
    () => buildSermonFindModel(sermon, highlightTerms, highlightMatchOptions),
    [highlightMatchOptions, highlightTerms, sermon],
  );
  const bodyWordRegions = useMemo<ReaderWordRegion[]>(() => {
    if (!sermon) {
      return [];
    }

    if (sermon.paragraphs.length > 0) {
      return sermon.paragraphs.map((paragraph) => ({
        key: getParagraphRegionKey(paragraph.paragraph_number),
        text: paragraph.paragraph_text,
      }));
    }

    return [{
      key: CONTENT_REGION_KEY,
      text: sermon.text_content,
    }];
  }, [sermon]);
  const bodyWordRegionMap = useMemo(() => {
    return buildReaderWordRegionMap(bodyWordRegions);
  }, [bodyWordRegions]);
  const readerSelectionUnitMap = useMemo(
    () => buildReaderSelectionUnitMap(bodyWordRegions, readerHighlightMode),
    [bodyWordRegions, readerHighlightMode],
  );
  const readerSlideSelectionSeedFromSearch = useMemo(
    () => createReaderSlideQueueEntryFromSearchParams(readerSlideSelectionFromSearchParams),
    [readerSlideSelectionFromSearchParams],
  );
  const activePresentationHighlightQueue = useMemo(() => {
    if (presentationHighlightQueue.length > 0) {
      return presentationHighlightQueue;
    }

    if (isReaderSlideViewEnabled && readerSlideSelectionSeedFromSearch) {
      return [readerSlideSelectionSeedFromSearch];
    }

    return [];
  }, [isReaderSlideViewEnabled, presentationHighlightQueue, readerSlideSelectionSeedFromSearch]);
  const presentationQueueCount = activePresentationHighlightQueue.length;
  const readerSlidePages = useMemo(
    () => buildReaderSlidePages(bodyWordRegions, activePresentationHighlightQueue, readerSlideViewport),
    [activePresentationHighlightQueue, bodyWordRegions, readerSlideViewport],
  );
  const readerSlideSelectionSignature = useMemo(() => {
    if (activePresentationHighlightQueue.length === 0) {
      return 'none';
    }

    return activePresentationHighlightQueue
      .map((entry) => `${entry.startIndex}:${entry.endIndex}:${entry.modeAtCapture}`)
      .join('|');
  }, [activePresentationHighlightQueue]);
  const activeReaderSlidePageIndex = useMemo(() => {
    if (readerSlidePages.length === 0) {
      return 0;
    }

    return Math.min(
      Math.max(readerSlidePage - 1, 0),
      readerSlidePages.length - 1,
    );
  }, [readerSlidePage, readerSlidePages.length]);
  const activeReaderSlidePage = readerSlidePages[activeReaderSlidePageIndex] ?? null;
  const activeReaderSlidePageText = activeReaderSlidePage?.text ?? '';
  const readerSlideTotalPages = readerSlidePages.length;

  const sermonHitNavigationContext = useMemo(() => ({
    searchQuery,
    fuzzy,
    matchCase,
    wholeWord,
    searchReturnTo,
  }), [fuzzy, matchCase, searchQuery, searchReturnTo, wholeWord]);

  const navigateToAdjacentTarget = useCallback((target: AdjacentHitNavigationTarget) => {
    if (target.state) {
      navigate(target.href, { state: target.state });
      return;
    }

    navigate(target.href);
  }, [navigate]);

  const navigateToAdjacentSermon = useCallback((targetSermon: AdjacentSermon | null) => {
    const target = buildAdjacentSermonHitTarget(targetSermon, sermonHitNavigationContext);
    if (!target) {
      return;
    }

    navigateToAdjacentTarget(target);
  }, [navigateToAdjacentTarget, sermonHitNavigationContext]);

  const fixedChevronNavigation = useMemo(() => createAdjacentSermonHitNavigationHandlers({
    prev: adjacent.prev,
    next: adjacent.next,
    context: sermonHitNavigationContext,
    navigate: navigateToAdjacentTarget,
  }), [adjacent.next, adjacent.prev, navigateToAdjacentTarget, sermonHitNavigationContext]);

  const handleJumpToTop = useCallback(() => {
    scrollSermonDetailToTop();
  }, []);

  const setReadingModeEnabled = useCallback((enabled: boolean) => {
    navigate(
      {
        pathname: location.pathname,
        search: buildReadingModeSearch(location.search, enabled),
        hash: location.hash,
      },
      {
        state: location.state,
      },
    );
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  const setReaderHighlightMode = useCallback((mode: ReaderHighlightMode) => {
    if (mode === readerHighlightMode) {
      return;
    }

    navigate(
      {
        pathname: location.pathname,
        search: buildReaderHighlightModeSearch(location.search, mode),
        hash: location.hash,
      },
      {
        state: location.state,
      },
    );
  }, [location.hash, location.pathname, location.search, location.state, navigate, readerHighlightMode]);

  const navigateWithSearch = useCallback((nextSearch: string, replace = false) => {
    if (nextSearch === location.search) {
      return;
    }

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch,
        hash: location.hash,
      },
      {
        state: location.state,
        replace,
      },
    );
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  const setReaderSlideViewEnabled = useCallback((
    enabled: boolean,
    options: {
      selectionBounds?: { startIndex: number; endIndex: number };
      replace?: boolean;
    } = {},
  ) => {
    if (!enabled) {
      if (!isReaderSlideViewEnabled && !location.search.includes('slide=')) {
        return;
      }

      navigateWithSearch(buildReaderSlideViewSearch(location.search, false), options.replace);
      return;
    }

    const nextSearch = buildReaderSlideViewSearch(location.search, true, {
      selectionStart: options.selectionBounds?.startIndex,
      selectionEnd: options.selectionBounds?.endIndex,
    });
    navigateWithSearch(nextSearch, options.replace);
  }, [isReaderSlideViewEnabled, location.search, navigateWithSearch]);

  const syncReaderSlideSelectionInUrl = useCallback((selectionBounds: { startIndex: number; endIndex: number }) => {
    if (!isReaderSlideViewEnabled) {
      return;
    }

    const normalizedSearchParams = new URLSearchParams(
      location.search.startsWith('?') ? location.search.slice(1) : location.search,
    );
    const nextSearchParams = withReaderSlideSelectionSearchParams(
      normalizedSearchParams,
      selectionBounds.startIndex,
      selectionBounds.endIndex,
    );
    const serialized = nextSearchParams.toString();
    navigateWithSearch(serialized ? `?${serialized}` : '', true);
  }, [isReaderSlideViewEnabled, location.search, navigateWithSearch]);

  const scrollReaderBy = useCallback((deltaY: number) => {
    if (!Number.isFinite(deltaY) || Math.abs(deltaY) < READER_SELECTION_VISIBILITY_MIN_DISTANCE_PX) {
      return;
    }

    if (typeof window.scrollBy === 'function') {
      try {
        window.scrollBy({ top: deltaY, left: 0, behavior: 'auto' });
        return;
      } catch {
        try {
          window.scrollBy(0, deltaY);
          return;
        } catch {
          // Fall through to scrollTo fallback.
        }
      }
    }

    if (typeof window.scrollTo === 'function') {
      const nextTop = (window.scrollY ?? window.pageYOffset ?? 0) + deltaY;
      try {
        window.scrollTo({ top: nextTop, left: 0, behavior: 'auto' });
        return;
      } catch {
        try {
          window.scrollTo(0, nextTop);
        } catch {
          // Ignore unsupported browser APIs.
        }
      }
    }
  }, []);

  const getReaderWordElementByIndex = useCallback((wordIndex: number) => {
    return document.querySelector<HTMLElement>(
      `[data-reader-word="true"][data-reader-word-index="${wordIndex}"]`,
    );
  }, []);

  const scrollElementIntoView = useCallback((element: HTMLElement) => {
    try {
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
      return;
    } catch {
      try {
        element.scrollIntoView();
      } catch {
        // Ignore unsupported browser APIs.
      }
    }
  }, []);

  const findNearestVisibleParagraphNumber = useCallback(() => {
    const paragraphElements = Array.from(document.querySelectorAll<HTMLElement>('[data-paragraph-number]'));
    if (paragraphElements.length === 0) {
      return null;
    }

    const viewportHeight = window.innerHeight ?? 0;
    const viewportCenterY = viewportHeight > 0 ? viewportHeight / 2 : 0;
    let nearestVisible: { paragraphNumber: number; distance: number } | null = null;
    let nearestOverall: { paragraphNumber: number; distance: number } | null = null;

    for (const paragraphElement of paragraphElements) {
      const paragraphNumberRaw = paragraphElement.getAttribute('data-paragraph-number');
      const paragraphNumber = paragraphNumberRaw == null ? Number.NaN : Number.parseInt(paragraphNumberRaw, 10);
      if (!Number.isFinite(paragraphNumber)) {
        continue;
      }

      const rect = paragraphElement.getBoundingClientRect();
      const centerY = rect.top + (rect.height / 2);
      const distance = Math.abs(centerY - viewportCenterY);

      if (!nearestOverall || distance < nearestOverall.distance) {
        nearestOverall = {
          paragraphNumber,
          distance,
        };
      }

      const isVisible = rect.bottom > 0 && rect.top < viewportHeight;
      if (!isVisible) {
        continue;
      }

      if (!nearestVisible || distance < nearestVisible.distance) {
        nearestVisible = {
          paragraphNumber,
          distance,
        };
      }
    }

    return nearestVisible?.paragraphNumber ?? nearestOverall?.paragraphNumber ?? null;
  }, []);

  const updateReaderTextOptionsPopupPosition = useCallback(
    (range: ReaderWordSelectionRange | null = selectedWordRangeRef.current) => {
      const bounds = getReaderWordSelectionBounds(range);
      const anchorElement = bounds
        ? document.querySelector<HTMLElement>(
          `[data-reader-word="true"][data-reader-word-index="${bounds.endIndex}"]`,
        )
        : null;
      const anchorRect = anchorElement?.getBoundingClientRect() ?? null;
      const contentRect = contentRef.current?.getBoundingClientRect() ?? null;
      const popupWidth = readerTextOptionsPopupRef.current?.offsetWidth ?? READER_TEXT_OPTIONS_POPUP_FALLBACK_WIDTH_PX;
      const popupHeight = readerTextOptionsPopupRef.current?.offsetHeight ?? READER_TEXT_OPTIONS_POPUP_FALLBACK_HEIGHT_PX;
      const maxLeft = window.innerWidth - popupWidth - READER_TEXT_OPTIONS_POPUP_EDGE_MARGIN_PX;
      let side: ReaderHighlightModeHudPosition['side'] = 'left';
      let left = READER_TEXT_OPTIONS_POPUP_EDGE_MARGIN_PX;

      if (contentRect) {
        const gutterLeftCandidate = contentRect.left - popupWidth - READER_TEXT_OPTIONS_POPUP_ANCHOR_GAP_PX;
        if (gutterLeftCandidate >= READER_TEXT_OPTIONS_POPUP_EDGE_MARGIN_PX) {
          left = gutterLeftCandidate;
        } else {
          side = 'inside-left';
          left = contentRect.left + READER_TEXT_OPTIONS_POPUP_ANCHOR_GAP_PX;
        }
      }

      left = Math.max(READER_TEXT_OPTIONS_POPUP_EDGE_MARGIN_PX, Math.min(left, maxLeft));
      const centerY = anchorRect
        ? anchorRect.top + (anchorRect.height / 2)
        : (contentRect ? contentRect.top + READER_TEXT_OPTIONS_POPUP_DEFAULT_TOP_OFFSET_PX : READER_TEXT_OPTIONS_POPUP_EDGE_MARGIN_PX);
      const maxTop = window.innerHeight - popupHeight - READER_TEXT_OPTIONS_POPUP_EDGE_MARGIN_PX;
      const top = Math.max(
        READER_TEXT_OPTIONS_POPUP_EDGE_MARGIN_PX,
        Math.min(centerY - (popupHeight / 2), maxTop),
      );

      setReaderTextOptionsPopupPosition({
        top,
        left,
        side,
        anchorWordIndex: bounds?.endIndex ?? null,
      });
    },
    [],
  );

  const handleReaderHighlightModeSelect = useCallback((mode: ReaderHighlightMode) => {
    if (mode !== readerHighlightMode) {
      setReaderHighlightMode(mode);
    }
  }, [readerHighlightMode, setReaderHighlightMode]);

  const cycleReaderHighlightMode = useCallback(() => {
    const nextMode = getNextReaderHighlightMode(readerHighlightMode);
    setReaderHighlightMode(nextMode);
  }, [readerHighlightMode, setReaderHighlightMode]);

  const showSlideShortcutHint = useCallback((message: string) => {
    setSlideShortcutHintText(message);
    setIsSlideShortcutHintVisible(true);

    if (slideShortcutHintTimeoutRef.current != null) {
      window.clearTimeout(slideShortcutHintTimeoutRef.current);
    }

    slideShortcutHintTimeoutRef.current = window.setTimeout(() => {
      setIsSlideShortcutHintVisible(false);
      slideShortcutHintTimeoutRef.current = null;
    }, READER_SLIDE_VIEW_HINT_TIMEOUT_MS);
  }, []);

  const openReaderSlideViewFromQueueEntry = useCallback((
    queueEntry: ReaderSlideQueueEntry,
    replace = false,
  ) => {
    setReaderSlidePage(READER_SLIDE_DEFAULT_PAGE);
    setIsReaderSlideVisualImageVisible(true);
    setReaderSlideViewEnabled(true, {
      selectionBounds: {
        startIndex: queueEntry.startIndex,
        endIndex: queueEntry.endIndex,
      },
      replace,
    });
  }, [setReaderSlideViewEnabled]);

  const closeReaderSlideView = useCallback((replace = false, resetQueue = false) => {
    if (resetQueue) {
      setPresentationHighlightQueue([]);
    }
    setReaderSlideViewEnabled(false, { replace });
  }, [setReaderSlideViewEnabled]);

  const openReaderSlideViewFromSelection = useCallback((
    range: ReaderWordSelectionRange | null,
    replace = false,
  ) => {
    const queueEntry = createReaderSlideQueueEntryFromRange(
      bodyWordRegions,
      range,
      readerHighlightMode,
    );
    if (!queueEntry) {
      showSlideShortcutHint('Highlight text first to start presentation.');
      return;
    }

    if (presentationHighlightQueueRef.current.length === 0) {
      setPresentationHighlightQueue([queueEntry]);
      openReaderSlideViewFromQueueEntry(queueEntry, replace);
      return;
    }

    openReaderSlideViewFromQueueEntry(presentationHighlightQueueRef.current[0], replace);
  }, [bodyWordRegions, openReaderSlideViewFromQueueEntry, readerHighlightMode, showSlideShortcutHint]);

  const addSelectedHighlightToPresentationQueue = useCallback(() => {
    const queueEntry = createReaderSlideQueueEntryFromRange(
      bodyWordRegions,
      selectedWordRangeRef.current,
      readerHighlightMode,
    );
    if (!queueEntry) {
      showSlideShortcutHint('Highlight text first to add to presentation queue.');
      return;
    }

    const currentQueue = activePresentationHighlightQueue;
    const alreadyQueued = currentQueue.some((entry) => isSameReaderSlideQueueEntry(entry, queueEntry));
    if (!alreadyQueued) {
      setPresentationHighlightQueue((currentValue) => [...currentValue, queueEntry]);
      showSlideShortcutHint('Added highlight to presentation queue.');
    } else {
      showSlideShortcutHint('Highlight already in presentation queue.');
    }

    if (!isReaderSlideViewEnabled) {
      const openFromEntry = currentQueue[0] ?? queueEntry;
      openReaderSlideViewFromQueueEntry(openFromEntry);
    }
  }, [
    activePresentationHighlightQueue,
    bodyWordRegions,
    isReaderSlideViewEnabled,
    openReaderSlideViewFromQueueEntry,
    readerHighlightMode,
    showSlideShortcutHint,
  ]);

  const goToPreviousReaderSlidePage = useCallback(() => {
    if (!isReaderSlideViewEnabled || readerSlidePages.length === 0) {
      return;
    }

    setReaderSlidePage((currentPage) => Math.max(READER_SLIDE_DEFAULT_PAGE, currentPage - 1));
  }, [isReaderSlideViewEnabled, readerSlidePages.length]);

  const goToNextReaderSlidePage = useCallback(() => {
    if (!isReaderSlideViewEnabled || readerSlidePages.length === 0) {
      return;
    }

    const maxPage = Math.max(READER_SLIDE_DEFAULT_PAGE, readerSlidePages.length);
    if (readerSlidePage < maxPage) {
      setReaderSlidePage((currentPage) => Math.min(maxPage, currentPage + 1));
      return;
    }

    const queueTail = activePresentationHighlightQueue[activePresentationHighlightQueue.length - 1] ?? null;
    const nextUnit = getNextReaderSelectionUnitAfterQueueTail(queueTail, readerSelectionUnitMap);
    if (!nextUnit) {
      showSlideShortcutHint('Reached end of sermon.');
      return;
    }

    const nextRange = createReaderWordSelectionRangeFromBounds(
      nextUnit.startIndex,
      nextUnit.endIndex,
      bodyWordRegionMap.totalWords,
    );
    if (!nextRange) {
      showSlideShortcutHint('Reached end of sermon.');
      return;
    }

    const nextQueueEntry = createReaderSlideQueueEntryFromRange(
      bodyWordRegions,
      nextRange,
      readerHighlightMode,
    );
    if (!nextQueueEntry) {
      showSlideShortcutHint('Reached end of sermon.');
      return;
    }

    const currentQueue = activePresentationHighlightQueue;
    const alreadyQueued = currentQueue.some((entry) => isSameReaderSlideQueueEntry(entry, nextQueueEntry));
    if (alreadyQueued) {
      showSlideShortcutHint('Reached end of sermon.');
      return;
    }

    selectedWordRangeRef.current = nextRange;
    setSelectedWordRange(nextRange);
    setPresentationHighlightQueue(
      currentQueue.length > 0
        ? [...currentQueue, nextQueueEntry]
        : [nextQueueEntry],
    );
    setReaderSlidePage(readerSlidePages.length + 1);
  }, [
    activePresentationHighlightQueue,
    bodyWordRegionMap.totalWords,
    bodyWordRegions,
    isReaderSlideViewEnabled,
    readerHighlightMode,
    readerSelectionUnitMap,
    readerSlidePage,
    readerSlidePages.length,
    showSlideShortcutHint,
  ]);

  const toggleReaderSlideView = useCallback(() => {
    if (isReaderSlideViewEnabled) {
      closeReaderSlideView();
      return;
    }

    if (presentationHighlightQueueRef.current.length > 0) {
      openReaderSlideViewFromQueueEntry(presentationHighlightQueueRef.current[0]);
      return;
    }

    openReaderSlideViewFromSelection(selectedWordRangeRef.current);
  }, [closeReaderSlideView, isReaderSlideViewEnabled, openReaderSlideViewFromQueueEntry, openReaderSlideViewFromSelection]);

  const toggleReadingMode = useCallback(() => {
    const currentBounds = getReaderWordSelectionBounds(selectedWordRangeRef.current);
    readingModeToggleAnchorRef.current = {
      targetReadingMode: !isReadingModeEnabled,
      selectedWordIndex: currentBounds?.endIndex ?? null,
      paragraphNumber: currentBounds ? null : findNearestVisibleParagraphNumber(),
    };
    setReadingModeEnabled(!isReadingModeEnabled);
  }, [findNearestVisibleParagraphNumber, isReadingModeEnabled, setReadingModeEnabled]);

  const initialMatchIndex = useMemo(() => {
    if (findModel.totalMatches === 0) {
      return -1;
    }

    if (!isRouteSearchContext) {
      return 0;
    }

    return resolveRouteTargetMatchIndex(
      findModel.results,
      matchSource,
      targetParagraphNumber,
      targetChunkIndex,
    );
  }, [
    findModel.results,
    findModel.totalMatches,
    isRouteSearchContext,
    matchSource,
    targetChunkIndex,
    targetParagraphNumber,
  ]);

  const matchContext = useMemo(() => {
    if (!matchSource && targetParagraphNumber == null) {
      return '';
    }

    return formatMatchSourceLabel(matchSource, targetParagraphNumber);
  }, [matchSource, targetParagraphNumber]);

  useEffect(() => {
    setSelectedWordRange(null);
    selectedWordRangeRef.current = null;
    setReaderTextOptionsPopupPosition(null);
    setPresentationHighlightQueue([]);
  }, [bodyWordRegionMap.totalWords, id]);

  useEffect(() => {
    const currentRange = selectedWordRangeRef.current;
    if (!currentRange) {
      return;
    }

    const bounds = getReaderWordSelectionBounds(currentRange);
    if (!bounds) {
      return;
    }

    const remappedRange = createReaderWordSelectionRangeFromUnitMap(
      bounds.endIndex,
      readerSelectionUnitMap,
    );
    if (!remappedRange) {
      return;
    }

    if (
      remappedRange.anchorIndex === currentRange.anchorIndex
      && remappedRange.cursorIndex === currentRange.cursorIndex
    ) {
      return;
    }

    selectedWordRangeRef.current = remappedRange;
    setSelectedWordRange(remappedRange);
  }, [readerHighlightMode, readerSelectionUnitMap]);

  useEffect(() => {
    selectedWordRangeRef.current = selectedWordRange;
  }, [selectedWordRange]);

  useEffect(() => {
    presentationHighlightQueueRef.current = presentationHighlightQueue;
  }, [presentationHighlightQueue]);

  useEffect(() => {
    const refreshViewport = () => {
      setReaderSlideViewport(getSafeReaderSlideViewportSnapshot());
    };

    window.addEventListener('resize', refreshViewport);
    return () => window.removeEventListener('resize', refreshViewport);
  }, []);

  useEffect(() => {
    if (!isReaderSlideViewEnabled || !readerSlideSelectionFromSearchParams) {
      return;
    }

    if (bodyWordRegionMap.totalWords === 0) {
      return;
    }

    const hydratedRange = createReaderWordSelectionRangeFromBounds(
      readerSlideSelectionFromSearchParams.startIndex,
      readerSlideSelectionFromSearchParams.endIndex,
      bodyWordRegionMap.totalWords,
    );
    if (!hydratedRange) {
      closeReaderSlideView(true, true);
      return;
    }

    const currentRange = selectedWordRangeRef.current;
    if (
      currentRange
      && currentRange.anchorIndex === hydratedRange.anchorIndex
      && currentRange.cursorIndex === hydratedRange.cursorIndex
    ) {
      return;
    }

    selectedWordRangeRef.current = hydratedRange;
    setSelectedWordRange(hydratedRange);
  }, [
    bodyWordRegionMap.totalWords,
    closeReaderSlideView,
    isReaderSlideViewEnabled,
    readerSlideSelectionFromSearchParams,
  ]);

  useEffect(() => {
    if (!isReaderSlideViewEnabled) {
      return;
    }

    const primaryQueueEntry = activePresentationHighlightQueue[0]
      ?? createReaderSlideQueueEntryFromRange(bodyWordRegions, selectedWordRange, readerHighlightMode);
    if (!primaryQueueEntry) {
      if (!readerSlideSelectionFromSearchParams && activePresentationHighlightQueue.length === 0) {
        closeReaderSlideView(true, true);
      }
      return;
    }

    const currentBounds = {
      startIndex: primaryQueueEntry.startIndex,
      endIndex: primaryQueueEntry.endIndex,
    };
    const hasLegacySlidePageParam = searchParams.has(READER_SLIDE_PAGE_QUERY_PARAM);

    if (
      readerSlideSelectionFromSearchParams
      && readerSlideSelectionFromSearchParams.startIndex === currentBounds.startIndex
      && readerSlideSelectionFromSearchParams.endIndex === currentBounds.endIndex
      && !hasLegacySlidePageParam
    ) {
      return;
    }

    syncReaderSlideSelectionInUrl(currentBounds);
  }, [
    activePresentationHighlightQueue,
    bodyWordRegions,
    closeReaderSlideView,
    isReaderSlideViewEnabled,
    readerHighlightMode,
    readerSlideSelectionFromSearchParams,
    searchParams,
    selectedWordRange,
    syncReaderSlideSelectionInUrl,
  ]);

  useEffect(() => {
    if (!isReaderSlideViewEnabled) {
      return;
    }

    setReaderSlidePage(READER_SLIDE_DEFAULT_PAGE);
  }, [isReaderSlideViewEnabled]);

  useEffect(() => {
    if (!isReaderSlideViewEnabled || readerSlidePages.length === 0) {
      return;
    }

    setReaderSlidePage((currentPage) => Math.min(
      Math.max(currentPage, READER_SLIDE_DEFAULT_PAGE),
      readerSlidePages.length,
    ));
  }, [
    isReaderSlideViewEnabled,
    readerSlidePages.length,
  ]);

  useEffect(() => {
    if (!isReaderSlideViewEnabled) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isReaderSlideViewEnabled]);

  useEffect(() => {
    if (isReaderSlideViewEnabled) {
      return;
    }

    const bounds = getReaderWordSelectionBounds(selectedWordRange);
    if (!bounds) {
      return;
    }

    const targetWord = getReaderWordElementByIndex(bounds.endIndex);
    if (!targetWord) {
      return;
    }

    const targetRect = targetWord.getBoundingClientRect();
    if (targetRect.width <= 0 && targetRect.height <= 0) {
      return;
    }

    const visibilityDistance = calculateReaderSelectionVisibilityDistance(
      targetRect,
      window.innerHeight ?? 0,
    );
    if (Math.abs(visibilityDistance) < READER_SELECTION_VISIBILITY_MIN_DISTANCE_PX) {
      return;
    }

    scrollReaderBy(visibilityDistance);
  }, [getReaderWordElementByIndex, isReaderSlideViewEnabled, scrollReaderBy, selectedWordRange]);

  useEffect(() => {
    const anchor = readingModeToggleAnchorRef.current;
    if (!anchor || anchor.targetReadingMode !== isReadingModeEnabled) {
      return;
    }

    if (loading || !sermon) {
      return;
    }

    let firstFrameId: number | null = null;
    let secondFrameId: number | null = null;
    firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        const selectedWordElement = anchor.selectedWordIndex == null
          ? null
          : getReaderWordElementByIndex(anchor.selectedWordIndex);

        if (selectedWordElement) {
          scrollElementIntoView(selectedWordElement);
          readingModeToggleAnchorRef.current = null;
          return;
        }

        const paragraphElement = anchor.paragraphNumber == null
          ? null
          : document.querySelector<HTMLElement>(`[data-paragraph-number="${anchor.paragraphNumber}"]`);
        if (paragraphElement) {
          scrollElementIntoView(paragraphElement);
        }

        readingModeToggleAnchorRef.current = null;
      });
    });

    return () => {
      if (firstFrameId != null) {
        window.cancelAnimationFrame(firstFrameId);
      }
      if (secondFrameId != null) {
        window.cancelAnimationFrame(secondFrameId);
      }
    };
  }, [getReaderWordElementByIndex, isReadingModeEnabled, loading, scrollElementIntoView, sermon]);

  useEffect(() => {
    if (!selectedWordRange || isReaderSlideViewEnabled) {
      return;
    }

    const refreshPosition = () => {
      updateReaderTextOptionsPopupPosition();
    };

    refreshPosition();
    window.addEventListener('resize', refreshPosition);
    window.addEventListener('scroll', refreshPosition, true);
    return () => {
      window.removeEventListener('resize', refreshPosition);
      window.removeEventListener('scroll', refreshPosition, true);
    };
  }, [isReaderSlideViewEnabled, selectedWordRange, updateReaderTextOptionsPopupPosition]);

  const handleReaderWordSelect = useCallback((wordIndex: number) => {
    const nextRange = createReaderWordSelectionRangeFromUnitMap(wordIndex, readerSelectionUnitMap);
    selectedWordRangeRef.current = nextRange;
    setSelectedWordRange(nextRange);
  }, [readerSelectionUnitMap]);

  const {
    activeIndex: activeMatchIndex,
    handleKeyDown: handleHitNavigationKeyDown,
  } = useHitNavigation({
    containerRef: contentRef,
    enabled: highlightTerms.length > 0,
    initialIndex: initialMatchIndex,
    scrollBehavior: getEffectiveHitScrollBehavior(),
    resetKey: `${id ?? 'unknown'}:${searchQuery}:${initialMatchIndex}:${sermon ? 'ready' : 'loading'}`,
    hitCycleKey: bindings.result_next,
    sermonCycleKey: bindings.result_prev,
    onNextSermon: (adjacent.next ?? boundarySermons.first)
      ? () => navigateToAdjacentSermon(adjacent.next ?? boundarySermons.first)
      : undefined,
    onPrevSermon: (adjacent.prev ?? boundarySermons.last)
      ? () => navigateToAdjacentSermon(adjacent.prev ?? boundarySermons.last)
      : undefined,
  });

  const { progressPercent } = useSermonScrollProgress({
    targetRef: contentRef,
    enabled: !loading && Boolean(sermon) && !isReaderSlideViewEnabled,
  });

  const shouldHideProgressBar = Boolean(activeAudioUrl);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchSermonById(id).then(data => {
      setSermon(data);
      setLoading(false);
      if (data?.date) {
        Promise.all([
          fetchAdjacentSermons(data.date),
          fetchBoundarySermons(),
        ]).then(([adjacentSermons, sermonBoundaries]) => {
          setAdjacent(adjacentSermons);
          setBoundarySermons(sermonBoundaries);
        });
      } else {
        setAdjacent({ prev: null, next: null });
        setBoundarySermons({ first: null, last: null });
      }
    });
  }, [id]);

  useEffect(() => {
    window.addEventListener('keydown', handleSearchPopupShortcutKeyDown);
    return () => window.removeEventListener('keydown', handleSearchPopupShortcutKeyDown);
  }, [handleSearchPopupShortcutKeyDown]);

  useEffect(() => {
    if (!highlightTerms.length) {
      return;
    }

    window.addEventListener('keydown', handleHitNavigationKeyDown);
    return () => window.removeEventListener('keydown', handleHitNavigationKeyDown);
  }, [handleHitNavigationKeyDown, highlightTerms.length]);

  useEffect(() => {
    if (bodyWordRegionMap.totalWords === 0) {
      return;
    }

    const handleReaderWordNavigationKeyDown = (event: KeyboardEvent) => {
      if (isReaderSlideViewEnabled) {
        return;
      }

      const command = resolveReaderWordNavigationCommand(event, {
        extendShortcutKey: bindings.reader_extend_selection,
        shrinkShortcutKey: bindings.reader_shrink_selection,
      });
      if (!command) {
        return;
      }

      const currentRange = selectedWordRangeRef.current;
      const nextRange = command === 'extend'
        ? extendReaderWordSelectionByUnit(currentRange, readerSelectionUnitMap)
        : shrinkReaderWordSelectionByUnit(currentRange, readerSelectionUnitMap);
      if (nextRange === currentRange) {
        if (currentRange) {
          event.preventDefault();
        }
        return;
      }

      event.preventDefault();
      selectedWordRangeRef.current = nextRange;
      setSelectedWordRange(nextRange);
    };

    window.addEventListener('keydown', handleReaderWordNavigationKeyDown);
    return () => window.removeEventListener('keydown', handleReaderWordNavigationKeyDown);
  }, [
    bindings.reader_extend_selection,
    bindings.reader_shrink_selection,
    bodyWordRegionMap.totalWords,
    isReaderSlideViewEnabled,
    readerSelectionUnitMap,
  ]);

  useEffect(() => {
    const handleCycleHighlightModeShortcutKeyDown = (event: KeyboardEvent) => {
      if (!shouldTriggerReadingModeShortcut(event, bindings.cycle_highlight_mode)) {
        return;
      }

      event.preventDefault();
      cycleReaderHighlightMode();
    };

    window.addEventListener('keydown', handleCycleHighlightModeShortcutKeyDown);
    return () => window.removeEventListener('keydown', handleCycleHighlightModeShortcutKeyDown);
  }, [bindings.cycle_highlight_mode, cycleReaderHighlightMode]);

  useEffect(() => {
    return () => {
      if (slideShortcutHintTimeoutRef.current != null) {
        window.clearTimeout(slideShortcutHintTimeoutRef.current);
        slideShortcutHintTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleAddSlideHighlightShortcutKeyDown = (event: KeyboardEvent) => {
      if (!shouldTriggerReadingModeShortcut(event, bindings.add_slide_highlight)) {
        return;
      }

      event.preventDefault();
      addSelectedHighlightToPresentationQueue();
    };

    window.addEventListener('keydown', handleAddSlideHighlightShortcutKeyDown);
    return () => window.removeEventListener('keydown', handleAddSlideHighlightShortcutKeyDown);
  }, [addSelectedHighlightToPresentationQueue, bindings.add_slide_highlight]);

  useEffect(() => {
    const handleSlideViewShortcutKeyDown = (event: KeyboardEvent) => {
      if (!shouldTriggerReadingModeShortcut(event, bindings.toggle_slide_view)) {
        return;
      }

      event.preventDefault();
      toggleReaderSlideView();
    };

    window.addEventListener('keydown', handleSlideViewShortcutKeyDown);
    return () => window.removeEventListener('keydown', handleSlideViewShortcutKeyDown);
  }, [bindings.toggle_slide_view, toggleReaderSlideView]);

  useEffect(() => {
    if (!isReaderSlideViewEnabled) {
      return;
    }

    const handleReaderSlidePaginationKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeReaderSlideView();
        return;
      }

      const command = resolveReaderWordNavigationCommand(event, {
        extendShortcutKey: bindings.reader_extend_selection,
        shrinkShortcutKey: bindings.reader_shrink_selection,
      });
      if (command === 'extend') {
        event.preventDefault();
        goToNextReaderSlidePage();
        return;
      }

      if (command === 'shrink') {
        event.preventDefault();
        goToPreviousReaderSlidePage();
      }
    };

    window.addEventListener('keydown', handleReaderSlidePaginationKeyDown);
    return () => window.removeEventListener('keydown', handleReaderSlidePaginationKeyDown);
  }, [
    bindings.reader_extend_selection,
    bindings.reader_shrink_selection,
    closeReaderSlideView,
    goToNextReaderSlidePage,
    goToPreviousReaderSlidePage,
    isReaderSlideViewEnabled,
  ]);

  useEffect(() => {
    const handleReadingModeShortcutKeyDown = (event: KeyboardEvent) => {
      if (!shouldTriggerReadingModeShortcut(event, bindings.toggle_reading_mode)) {
        return;
      }

      event.preventDefault();
      toggleReadingMode();
    };

    window.addEventListener('keydown', handleReadingModeShortcutKeyDown);
    return () => window.removeEventListener('keydown', handleReadingModeShortcutKeyDown);
  }, [bindings.toggle_reading_mode, toggleReadingMode]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const renderRegionHighlightedText = useCallback((regionKey: string, text: string): React.ReactNode => {
    if (!highlightTerms.length) {
      return text;
    }

    const regionMeta = findModel.regionMetaByKey[regionKey];
    if (!regionMeta || regionMeta.totalMatches === 0) {
      return text;
    }

    const relativeActiveIndex = activeMatchIndex - regionMeta.offset;
    return renderActiveHitHighlights(text, highlightTerms, relativeActiveIndex, {
      fallbackToFirstMatch: false,
      matchOptions: highlightMatchOptions,
      getMatchAttributes: (localMatchIndex) => ({
        'data-search-match-origin': regionMeta.origin,
        'data-search-match-local-index': String(localMatchIndex),
        'data-search-match-global-index': String(regionMeta.offset + localMatchIndex),
        ...(regionMeta.paragraphNumber != null
          ? { 'data-search-match-paragraph': String(regionMeta.paragraphNumber) }
          : {}),
      }),
    }).content;
  }, [activeMatchIndex, findModel.regionMetaByKey, highlightMatchOptions, highlightTerms]);
  const renderBodyRegionText = useCallback((regionKey: string, text: string): React.ReactNode => {
    const regionWordOffset = bodyWordRegionMap.offsetsByRegion[regionKey] ?? 0;
    const highlightedContent = renderRegionHighlightedText(regionKey, text);
    return renderReaderWordHighlights(highlightedContent, regionWordOffset, selectedWordRange, handleReaderWordSelect);
  }, [bodyWordRegionMap.offsetsByRegion, handleReaderWordSelect, renderRegionHighlightedText, selectedWordRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[860px] mx-auto px-6 lg:px-0 py-8 space-y-6">
          <div className="skeleton-shimmer h-4 w-48 rounded" />
          <div className="skeleton-shimmer h-8 w-3/4 rounded" />
          <div className="skeleton-shimmer h-32 w-full rounded" />
          <div className="skeleton-shimmer h-64 w-full rounded" />
        </div>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-mono">Sermon not found.</p>
          <Link to="/" className="mt-2 inline-block text-sm font-mono text-link hover:underline">
            {'<- Back to browse'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${isReadingModeEnabled ? (shouldHideProgressBar ? 'pb-10' : 'pb-20') : 'pb-24'}`}>
      <SearchPopup
        isOpen={isSearchPopupOpen}
        onClose={closeSearchPopup}
      >
        <SharedSearchExperience
          surface="modal"
          shouldFocusInput={shouldFocusSearchInput}
          onInputFocusHandled={consumeSearchPopupFocusRequest}
          onHitNavigate={closeSearchPopup}
        />
      </SearchPopup>
      {isReaderSlideViewEnabled && (
        <section
          className="fixed inset-0 z-[70] flex min-h-screen"
          aria-label="Fullscreen sermon presentation"
          data-testid="reader-fullscreen-slide-view"
        >
          <div className="relative flex min-h-screen flex-1 overflow-hidden bg-[#040609] text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.11),transparent_45%),linear-gradient(160deg,#020205_0%,#04090f_55%,#0f131a_100%)]" />
            <div className="absolute inset-y-0 right-0 hidden w-[42%] overflow-hidden lg:block">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,#11161f_0%,#070a10_78%)]" />
              {isReaderSlideVisualImageVisible && (
                <img
                  src="/image.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center opacity-45"
                  loading="lazy"
                  decoding="async"
                  onError={() => setIsReaderSlideVisualImageVisible(false)}
                />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,6,9,0.97)_0%,rgba(4,6,9,0.62)_40%,rgba(4,6,9,0.24)_100%)]" />
            </div>
            <div className="relative z-10 flex w-full flex-col justify-between px-7 py-7 sm:px-10 sm:py-8 lg:w-[58%] lg:px-14 lg:py-10 xl:px-20 xl:py-14">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/60" data-testid="reader-fullscreen-slide-header">
                  Highlighted Text Presentation
                </p>
                <button
                  type="button"
                  onClick={() => closeReaderSlideView()}
                  className="rounded border border-white/30 bg-black/20 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide text-white/85 transition-colors hover:bg-white/10"
                  data-testid="reader-fullscreen-slide-close"
                >
                  Exit ({formatShortcutKey(bindings.toggle_slide_view)} / Esc)
                </button>
              </div>
              <div className="mt-8 grid min-h-0 flex-1 grid-cols-[clamp(2.6rem,5vw,4.4rem)_minmax(0,1fr)] gap-x-4 sm:gap-x-6 lg:gap-x-7">
                <p className="pt-1 text-[clamp(3.6rem,7vw,6.4rem)] leading-[0.78] text-white/80">&ldquo;</p>
                <p
                  className="max-w-[36ch] self-center whitespace-pre-wrap font-serif text-[clamp(1.1rem,1.9vw,2.2rem)] font-semibold leading-[1.12] tracking-[0.004em] text-white"
                  data-testid="reader-fullscreen-slide-text"
                >
                  {activeReaderSlidePageText || 'No highlighted text selected.'}
                </p>
              </div>
              <div className="mt-8 space-y-2 border-t border-white/20 pt-5">
                <p
                  className="text-[12px] uppercase tracking-[0.2em] text-white/65"
                  data-testid="reader-fullscreen-slide-meta"
                >
                  {sermon.sermon_code} / {sermon.title}
                </p>
                <p className="font-serif text-[clamp(1.2rem,1.75vw,2rem)] text-white/92">
                  {READER_SLIDE_QUOTE_ATTRIBUTION}
                </p>
                <p
                  className="text-[11px] uppercase tracking-[0.16em] text-white/62"
                  data-testid="reader-fullscreen-slide-part-indicator"
                >
                  {getReaderSlideSourceLabel(activeReaderSlidePage?.modeAtCapture ?? 'word')} {activeReaderSlidePage?.sourceIndex ?? 1}
                  {' / '}
                  {Math.max(1, activeReaderSlidePage?.sourceTotal ?? 1)}
                  {(activeReaderSlidePage?.continuationTotal ?? 1) > 1
                    ? `  Part ${activeReaderSlidePage?.continuationIndex ?? 1}/${activeReaderSlidePage?.continuationTotal ?? 1}`
                    : ''}
                </p>
                <p
                  className="text-[11px] uppercase tracking-[0.16em] text-white/60"
                  data-testid="reader-fullscreen-slide-page-indicator"
                >
                  Slide {Math.max(READER_SLIDE_DEFAULT_PAGE, activeReaderSlidePageIndex + 1)}
                  {' / '}
                  {Math.max(READER_SLIDE_DEFAULT_PAGE, readerSlideTotalPages)}
                </p>
              </div>
            </div>
            <div className="relative z-10 hidden flex-1 items-end justify-end p-8 text-right lg:flex">
              <div className="rounded-md border border-white/20 bg-black/35 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.12em] text-white/75">
                Next: Right / Space / Previous: Left / Shift+Space
              </div>
            </div>
          </div>
        </section>
      )}
      {selectedWordRange && !isReaderSlideViewEnabled && (
        <div
          aria-label="Highlighted text options"
          className="fixed z-50 w-[248px] rounded-lg border border-border bg-background/95 px-3 py-3 font-mono text-xs shadow-md backdrop-blur"
          data-anchor-word-index={readerTextOptionsPopupPosition?.anchorWordIndex}
          data-placement={readerTextOptionsPopupPosition?.side ?? 'left'}
          ref={readerTextOptionsPopupRef}
          style={{
            left: `${readerTextOptionsPopupPosition?.left ?? READER_TEXT_OPTIONS_POPUP_EDGE_MARGIN_PX}px`,
            top: `${readerTextOptionsPopupPosition?.top ?? 96}px`,
          }}
          data-testid="reader-text-options-popup"
        >
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Highlighted Text Options</p>
          <p className="mt-2 text-foreground">Highlight mode</p>
          <div
            aria-label="Reader highlight mode"
            className="mt-2 inline-flex items-center gap-1"
            data-testid="reader-highlight-mode-toggle"
          >
            {READER_HIGHLIGHT_MODE_OPTIONS.map((option) => {
              const isActive = option.mode === readerHighlightMode;
              return (
                <button
                  key={option.mode}
                  type="button"
                  aria-label={`Highlight mode ${option.label}`}
                  aria-pressed={isActive}
                  title={`Highlight by ${option.label.toLowerCase()}`}
                  onClick={() => handleReaderHighlightModeSelect(option.mode)}
                  className={`rounded border px-1.5 py-1 text-[10px] font-mono transition-colors ${
                    isActive
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {option.shortLabel}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={toggleReaderSlideView}
            aria-pressed={isReaderSlideViewEnabled}
            className={`mt-3 inline-flex w-full items-center justify-between rounded border px-2 py-1.5 text-left text-[11px] transition-colors ${
              isReaderSlideViewEnabled
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-foreground hover:bg-hover-row'
            }`}
            data-testid="reader-slide-view-toggle"
          >
            <span>{isReaderSlideViewEnabled ? 'Exit presentation' : 'Start presentation'}</span>
            <kbd className="rounded border border-border/60 bg-background/60 px-1 text-[10px]">
              {formatShortcutKey(bindings.toggle_slide_view)}
            </kbd>
          </button>
          <p className="mt-2 text-muted-foreground">
            Cycle mode{' '}
            <kbd className="rounded border border-border bg-muted px-1 text-[11px]">
              {formatShortcutKey(bindings.cycle_highlight_mode)}
            </kbd>
          </p>
          <p
            className="mt-1 text-[11px] text-muted-foreground"
            data-testid="reader-slide-queue-hint"
          >
            Queued: {presentationQueueCount}{' '}
            - Add{' '}
            <kbd className="rounded border border-border bg-muted px-1 text-[10px]">
              {formatShortcutKey(bindings.add_slide_highlight)}
            </kbd>
          </p>
        </div>
      )}
      {isSlideShortcutHintVisible && (
        <div
          aria-live="polite"
          role="status"
          className="pointer-events-none fixed right-3 top-3 z-50 rounded-lg border border-border bg-background/95 px-3 py-2 font-mono text-xs text-foreground shadow-md"
          data-testid="reader-slide-view-hint"
        >
          {slideShortcutHintText}
        </div>
      )}
      {!isReaderSlideViewEnabled && (
        <>
          {!isReadingModeEnabled && (
            <SermonDetailFixedChevrons
              canNavigatePrev={fixedChevronNavigation.canNavigatePrev}
              canNavigateNext={fixedChevronNavigation.canNavigateNext}
              onNavigatePrev={fixedChevronNavigation.navigatePrev}
              onNavigateNext={fixedChevronNavigation.navigateNext}
              onJumpToTop={handleJumpToTop}
            />
          )}
          <SermonProgressBar progressPercent={progressPercent} hidden={shouldHideProgressBar} />

          <div
            ref={contentRef}
            data-testid="sermon-detail-content"
            className={`mx-auto max-w-[900px] px-6 lg:px-0 ${isReadingModeEnabled ? 'space-y-6 py-5' : 'space-y-8 py-8'}`}
          >
        {!isReadingModeEnabled && (
          <SermonBreadcrumb year={sermon.year} title={sermon.title} rootHref={breadcrumbRootHref} />
        )}

        <section className={`border-b border-border-subtle ${isReadingModeEnabled ? 'space-y-3 pb-4' : 'space-y-4 pb-6'}`}>
          <div className={`flex flex-wrap items-start justify-between ${isReadingModeEnabled ? 'gap-3' : 'gap-4'}`}>
            <div className={`min-w-0 flex-1 ${isReadingModeEnabled ? 'space-y-2' : 'space-y-3'}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="rounded-md border border-border bg-bg-muted px-2 py-1 text-foreground">
                  {sermon.sermon_code}
                </span>
              </div>
              <h1
                data-testid="sermon-title"
                className={`font-bold font-mono text-foreground ${isReadingModeEnabled ? 'text-lg leading-snug' : 'text-2xl leading-tight'}`}
              >
                {highlightTerms.length
                  ? renderRegionHighlightedText(TITLE_REGION_KEY, sermon.title)
                  : sermon.title}
              </h1>
              {sermon.summary ? (
                <p
                  data-testid="sermon-summary"
                  className={`${isReadingModeEnabled ? 'max-w-[78ch] text-xs leading-relaxed text-foreground/80' : 'max-w-[72ch] text-sm leading-relaxed text-foreground/85'}`}
                >
                  {sermon.summary}
                </p>
              ) : null}
            </div>

            <div className="shrink-0">
              <div className="inline-flex overflow-hidden rounded-lg border border-border bg-background text-xs font-mono">
                {sermon.audio_url && (
                <button
                  onClick={() => play(sermon.audio_url, sermon.title)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-foreground hover:bg-hover-row"
                >
                  <Play className="h-3 w-3" />
                  Play
                </button>
                )}
                {sermon.pdf_source_path && (
                  <a
                    href={sermon.pdf_source_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-foreground hover:bg-hover-row ${sermon.audio_url ? 'border-l border-border' : ''}`}
                  >
                    <FileText className="h-3 w-3" />
                    PDF
                  </a>
                )}
                <button
                  onClick={openSearchPopupFromToolbar}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-foreground hover:bg-hover-row ${sermon.audio_url || sermon.pdf_source_path ? 'border-l border-border' : ''}`}
                >
                  <SearchIcon className="h-3 w-3" />
                  Find
                  <kbd className="rounded border border-border bg-muted px-1 text-[11px]">{searchShortcutKey}</kbd>
                </button>
                <ReadingModeToggleButton
                  enabled={isReadingModeEnabled}
                  shortcutKey={bindings.toggle_reading_mode}
                  onToggle={toggleReadingMode}
                  className="inline-flex items-center gap-1.5 border-l border-border px-3 py-2 text-foreground hover:bg-hover-row"
                />
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 border-l border-border px-3 py-2 text-foreground hover:bg-hover-row"
                >
                  {shared ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                  {shared ? 'Copied!' : 'Share'}
                </button>
              </div>
            </div>
          </div>

          {highlightTerms.length > 0 && isRouteSearchContext && (
            <p className="text-xs font-mono text-muted-foreground" title={hitId || undefined}>
              Search match{matchContext ? `: ${matchContext}` : ''}
            </p>
          )}

          {!isReadingModeEnabled && (
            <div
              data-testid="sermon-meta-strip"
              className="flex flex-wrap items-start gap-x-8 gap-y-3 rounded-lg border border-border bg-card/40 px-4 py-3"
            >
              <MetaField label="Date" value={formatLongDate(sermon.date)} />
              {sermon.location ? <MetaField label="Location" value={sermon.location} /> : null}
              {sermon.scripture ? <MetaField label="Scripture" value={sermon.scripture} /> : null}
              {formatDuration(sermon.duration_seconds) ? (
                <MetaField label="Duration" value={formatDuration(sermon.duration_seconds)!} />
              ) : null}
              {sermon.tags && sermon.tags.length > 0 ? (
                <div className="min-w-[120px]">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tags</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {sermon.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-border bg-bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>

        {(sermon.paragraphs.length > 0 || sermon.text_content) && (
          <section className="">
            {sermon.paragraphs.length > 0 ? (
              <div className="space-y-6">
                {sermon.paragraphs.map((paragraph) => {
                  const printedDiff = (
                    paragraph.printed_paragraph_number != null &&
                    paragraph.printed_paragraph_number !== paragraph.paragraph_number
                  );
                  const paragraphRegionKey = getParagraphRegionKey(paragraph.paragraph_number);

                  return (
                    <section
                      key={paragraph.paragraph_number}
                      data-paragraph-number={paragraph.paragraph_number}
                      className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4 sm:grid-cols-[2.75rem_minmax(0,1fr)] sm:gap-5"
                    >
                      <p className="pt-1 text-right font-mono text-[11px] leading-4 text-muted-foreground">
                        <span className="font-bold text-2xl">{paragraph.paragraph_number}</span>
                        {printedDiff ? (
                          <span className="block text-[10px] text-muted-foreground/80">
                            PDF {paragraph.printed_paragraph_number}
                          </span>
                        ) : null}
                      </p>
                      <div
                        data-testid="sermon-paragraph-text"
                        className={`whitespace-pre-wrap ${isReadingModeEnabled ? 'text-[1.5rem] leading-10 text-foreground' : 'text-[1.02rem] leading-8 text-foreground/90'}`}
                      >
                        {renderBodyRegionText(paragraphRegionKey, paragraph.paragraph_text)}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div
                data-testid="sermon-content-text"
                className={`whitespace-pre-wrap ${isReadingModeEnabled ? 'text-[1.2rem] leading-10 text-foreground' : 'text-[1.02rem] leading-8 text-foreground/90'}`}
              >
                {renderBodyRegionText(CONTENT_REGION_KEY, sermon.text_content)}
              </div>
            )}
          </section>
        )}

        {!isReadingModeEnabled && (
          <div className="flex items-center justify-between border-t border-border pt-6">
            {adjacent.prev ? (
              <Link
                to={`/sermons/${adjacent.prev.id}`}
                className="flex items-center gap-1 text-xs font-mono text-link hover:underline"
              >
                <ChevronLeft className="h-3 w-3" />
                <span className="max-w-[200px] truncate">{adjacent.prev.title}</span>
              </Link>
            ) : <div />}
            {adjacent.next ? (
              <Link
                to={`/sermons/${adjacent.next.id}`}
                className="flex items-center gap-1 text-xs font-mono text-link hover:underline"
              >
                <span className="max-w-[200px] truncate">{adjacent.next.title}</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            ) : <div />}
          </div>
        )}
          </div>
        </>
      )}
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[120px]">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function formatLongDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function formatDuration(durationSeconds: number | null): string | null {
  if (durationSeconds == null || durationSeconds < 0) {
    return null;
  }

  const totalSeconds = Math.floor(durationSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}


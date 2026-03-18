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
  type ReaderWordRegion,
  type ReaderWordSelectionRange,
} from '@/lib/readerWordNavigation';
import {
  buildReaderHighlightModeSearch,
  getReaderHighlightModeFromSearchParams,
} from '@/lib/readerHighlightModeUrlState';

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
const READER_HIGHLIGHT_MODE_HUD_TIMEOUT_MS = 1500;
const READER_HIGHLIGHT_MODE_HUD_EDGE_MARGIN_PX = 12;
const READER_HIGHLIGHT_MODE_HUD_ANCHOR_GAP_PX = 10;
const READER_HIGHLIGHT_MODE_HUD_DEFAULT_TOP_OFFSET_PX = 16;
const READER_HIGHLIGHT_MODE_HUD_FALLBACK_WIDTH_PX = 176;
const READER_HIGHLIGHT_MODE_HUD_FALLBACK_HEIGHT_PX = 44;
const READER_SELECTION_VISIBILITY_TOP_MARGIN_PX = 96;
const READER_SELECTION_VISIBILITY_BOTTOM_MARGIN_PX = 112;
const READER_SELECTION_VISIBILITY_MIN_DISTANCE_PX = 0.5;
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
  const [isReaderHighlightModeHudVisible, setIsReaderHighlightModeHudVisible] = useState(false);
  const [readerHighlightModeHudPosition, setReaderHighlightModeHudPosition] = useState<ReaderHighlightModeHudPosition | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const readerHighlightModeHudRef = useRef<HTMLDivElement | null>(null);
  const selectedWordRangeRef = useRef<ReaderWordSelectionRange | null>(null);
  const readerHighlightModeHudTimeoutRef = useRef<number | null>(null);
  const readingModeToggleAnchorRef = useRef<ReadingModeToggleAnchorSnapshot | null>(null);
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

  const updateReaderHighlightModeHudPosition = useCallback(
    (range: ReaderWordSelectionRange | null = selectedWordRangeRef.current) => {
      const bounds = getReaderWordSelectionBounds(range);
      const anchorElement = bounds
        ? document.querySelector<HTMLElement>(
          `[data-reader-word="true"][data-reader-word-index="${bounds.endIndex}"]`,
        )
        : null;
      const anchorRect = anchorElement?.getBoundingClientRect() ?? null;
      const contentRect = contentRef.current?.getBoundingClientRect() ?? null;
      const hudWidth = readerHighlightModeHudRef.current?.offsetWidth ?? READER_HIGHLIGHT_MODE_HUD_FALLBACK_WIDTH_PX;
      const hudHeight = readerHighlightModeHudRef.current?.offsetHeight ?? READER_HIGHLIGHT_MODE_HUD_FALLBACK_HEIGHT_PX;
      const maxLeft = window.innerWidth - hudWidth - READER_HIGHLIGHT_MODE_HUD_EDGE_MARGIN_PX;
      let side: ReaderHighlightModeHudPosition['side'] = 'left';
      let left = READER_HIGHLIGHT_MODE_HUD_EDGE_MARGIN_PX;

      if (contentRect) {
        const gutterLeftCandidate = contentRect.left - hudWidth - READER_HIGHLIGHT_MODE_HUD_ANCHOR_GAP_PX;
        if (gutterLeftCandidate >= READER_HIGHLIGHT_MODE_HUD_EDGE_MARGIN_PX) {
          left = gutterLeftCandidate;
        } else {
          side = 'inside-left';
          left = contentRect.left + READER_HIGHLIGHT_MODE_HUD_ANCHOR_GAP_PX;
        }
      }

      left = Math.max(READER_HIGHLIGHT_MODE_HUD_EDGE_MARGIN_PX, Math.min(left, maxLeft));
      const centerY = anchorRect
        ? anchorRect.top + (anchorRect.height / 2)
        : (contentRect ? contentRect.top + READER_HIGHLIGHT_MODE_HUD_DEFAULT_TOP_OFFSET_PX : READER_HIGHLIGHT_MODE_HUD_EDGE_MARGIN_PX);
      const maxTop = window.innerHeight - hudHeight - READER_HIGHLIGHT_MODE_HUD_EDGE_MARGIN_PX;
      const top = Math.max(
        READER_HIGHLIGHT_MODE_HUD_EDGE_MARGIN_PX,
        Math.min(centerY - (hudHeight / 2), maxTop),
      );

      setReaderHighlightModeHudPosition({
        top,
        left,
        side,
        anchorWordIndex: bounds?.endIndex ?? null,
      });
    },
    [],
  );
  const showReaderHighlightModeHud = useCallback(() => {
    updateReaderHighlightModeHudPosition();
    setIsReaderHighlightModeHudVisible(true);

    if (readerHighlightModeHudTimeoutRef.current != null) {
      window.clearTimeout(readerHighlightModeHudTimeoutRef.current);
    }

    readerHighlightModeHudTimeoutRef.current = window.setTimeout(() => {
      setIsReaderHighlightModeHudVisible(false);
      readerHighlightModeHudTimeoutRef.current = null;
    }, READER_HIGHLIGHT_MODE_HUD_TIMEOUT_MS);
  }, [updateReaderHighlightModeHudPosition]);

  const handleReaderHighlightModeSelect = useCallback((mode: ReaderHighlightMode) => {
    if (mode !== readerHighlightMode) {
      setReaderHighlightMode(mode);
    }
    showReaderHighlightModeHud();
  }, [readerHighlightMode, setReaderHighlightMode, showReaderHighlightModeHud]);

  const cycleReaderHighlightMode = useCallback(() => {
    const nextMode = getNextReaderHighlightMode(readerHighlightMode);
    setReaderHighlightMode(nextMode);
    showReaderHighlightModeHud();
  }, [readerHighlightMode, setReaderHighlightMode, showReaderHighlightModeHud]);
  const readerHighlightModeLabel = useMemo(() => (
    READER_HIGHLIGHT_MODE_OPTIONS.find((option) => option.mode === readerHighlightMode)?.label ?? 'Word'
  ), [readerHighlightMode]);

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
    setReaderHighlightModeHudPosition(null);
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
  }, [getReaderWordElementByIndex, scrollReaderBy, selectedWordRange]);

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
    if (!isReaderHighlightModeHudVisible) {
      return;
    }

    const refreshPosition = () => {
      updateReaderHighlightModeHudPosition();
    };

    refreshPosition();
    window.addEventListener('resize', refreshPosition);
    window.addEventListener('scroll', refreshPosition, true);
    return () => {
      window.removeEventListener('resize', refreshPosition);
      window.removeEventListener('scroll', refreshPosition, true);
    };
  }, [isReaderHighlightModeHudVisible, selectedWordRange, updateReaderHighlightModeHudPosition]);

  const handleReaderWordSelect = useCallback((wordIndex: number) => {
    const nextRange = createReaderWordSelectionRangeFromUnitMap(wordIndex, readerSelectionUnitMap);
    selectedWordRangeRef.current = nextRange;
    setSelectedWordRange(nextRange);
    showReaderHighlightModeHud();
  }, [readerSelectionUnitMap, showReaderHighlightModeHud]);

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
    enabled: !loading && Boolean(sermon),
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
      const command = resolveReaderWordNavigationCommand(event, {
        extendShortcutKey: bindings.reader_extend_selection,
        shrinkShortcutKey: bindings.reader_shrink_selection,
      });
      if (!command) {
        return;
      }

      showReaderHighlightModeHud();
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
  }, [bindings.reader_extend_selection, bindings.reader_shrink_selection, bodyWordRegionMap.totalWords, readerSelectionUnitMap, showReaderHighlightModeHud]);

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
      if (readerHighlightModeHudTimeoutRef.current != null) {
        window.clearTimeout(readerHighlightModeHudTimeoutRef.current);
        readerHighlightModeHudTimeoutRef.current = null;
      }
    };
  }, []);

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
      <div
        aria-live="polite"
        className={`pointer-events-none fixed z-50 rounded-lg border border-border bg-background/95 px-3 py-2 font-mono text-xs shadow-md transition-opacity duration-200 ${
          isReaderHighlightModeHudVisible ? 'opacity-100' : 'opacity-0'
        }`}
        data-anchor-word-index={readerHighlightModeHudPosition?.anchorWordIndex}
        data-placement={readerHighlightModeHudPosition?.side ?? 'left'}
        ref={readerHighlightModeHudRef}
        style={{
          left: `${readerHighlightModeHudPosition?.left ?? READER_HIGHLIGHT_MODE_HUD_EDGE_MARGIN_PX}px`,
          top: `${readerHighlightModeHudPosition?.top ?? 96}px`,
        }}
        data-testid="reader-highlight-mode-hud"
      >
        <p className="text-foreground">Highlight: {readerHighlightModeLabel}</p>
        <p className="mt-1 text-muted-foreground">
          Cycle{' '}
          <kbd className="rounded border border-border bg-muted px-1 text-[11px]">
            {formatShortcutKey(bindings.cycle_highlight_mode)}
          </kbd>
        </p>
      </div>
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
                <div
                  aria-label="Reader highlight mode"
                  className="inline-flex items-center gap-1 border-l border-border px-3 py-2"
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


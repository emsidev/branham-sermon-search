import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Share2, Check, FileText, Search as SearchIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fetchSermonById, fetchAdjacentSermons, fetchBoundarySermons, type SermonDetail as Sermon } from '@/hooks/useSermons';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
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
import { getEffectiveHitScrollBehavior } from '@/lib/preferences';

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

function getParagraphRegionKey(paragraphNumber: number): string {
  return `paragraph-${paragraphNumber}`;
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
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { play } = useAudioPlayer();
  const { bindings } = useKeyboardShortcuts();

  const searchQuery = searchParams.get('q')?.trim() ?? '';
  const matchSource = searchParams.get('source');
  const paragraphParam = searchParams.get('paragraph');
  const hitId = searchParams.get('hit');
  const fuzzy = searchParams.get('fuzzy') === '1';
  const matchCase = searchParams.get('matchCase') === '1';
  const wholeWordParam = searchParams.get('wholeWord');
  const wholeWord = wholeWordParam == null ? true : wholeWordParam === '1';
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
    <div className="min-h-screen bg-background pb-24">
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
      <SermonDetailFixedChevrons
        canNavigatePrev={fixedChevronNavigation.canNavigatePrev}
        canNavigateNext={fixedChevronNavigation.canNavigateNext}
        onNavigatePrev={fixedChevronNavigation.navigatePrev}
        onNavigateNext={fixedChevronNavigation.navigateNext}
        onJumpToTop={handleJumpToTop}
      />

      <div ref={contentRef} className="mx-auto max-w-[900px] space-y-8 px-6 py-8 lg:px-0">
        <SermonBreadcrumb year={sermon.year} title={sermon.title} rootHref={breadcrumbRootHref} />

        <section className="space-y-4 border-b border-border-subtle pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="rounded-md border border-border bg-bg-muted px-2 py-1 text-foreground">
                  {sermon.sermon_code}
                </span>
              </div>
              <h1 className="text-2xl font-bold font-mono leading-tight text-foreground">
                {highlightTerms.length
                  ? renderRegionHighlightedText(TITLE_REGION_KEY, sermon.title)
                  : sermon.title}
              </h1>
              {sermon.summary ? (
                <p data-testid="sermon-summary" className="max-w-[72ch] text-sm leading-relaxed text-foreground/85">
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
                      <div className="whitespace-pre-wrap text-[1.02rem] leading-8 text-foreground/90">
                        {highlightTerms.length
                          ? renderRegionHighlightedText(paragraphRegionKey, paragraph.paragraph_text)
                          : paragraph.paragraph_text}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-[1.02rem] leading-8 text-foreground/90">
                {highlightTerms.length
                  ? renderRegionHighlightedText(CONTENT_REGION_KEY, sermon.text_content)
                  : sermon.text_content}
              </div>
            )}
          </section>
        )}

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


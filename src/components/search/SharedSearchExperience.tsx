import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  useKeyboardShortcuts,
  useShortcutResultListRegistration,
  useShortcutSearchInputRegistration,
  type ShortcutResultListController,
} from '@/hooks/useKeyboardShortcuts';
import { useSermons, type SearchHit } from '@/hooks/useSermons';
import SearchHitsTable from '@/components/SearchHitsTable';
import SearchHitsCards from '@/components/SearchHitsCards';
import BookMatchCard from '@/components/cards/BookMatchCard';
import SermonPagination from '@/components/SermonPagination';
import SermonSearchFilters from '@/components/search/SermonSearchFilters';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  buildSermonHitHref,
  hasNormalizedBoundedMatch,
  normalizeSearchComparableText,
  sanitizeSearchSnippet,
  type SearchMatchOptions,
} from '@/lib/search';
import { formatShortcutKey } from '@/lib/keyboardShortcuts';
import { getInstantSearchEnabled } from '@/lib/preferences';
import {
  createSearchReturnState,
  isSearchAutofocusTransitionState,
} from '@/lib/searchNavigation';
import { extractYear } from '@/lib/utils';

const SORT_OPTIONS: Array<{ value: 'relevance-desc' | 'title-asc' | 'title-desc' | 'date-desc' | 'date-asc'; label: string }> = [
  { value: 'relevance-desc', label: 'Relevance' },
  { value: 'title-asc', label: 'Book (Title A-Z)' },
  { value: 'title-desc', label: 'Book (Title Z-A)' },
  { value: 'date-desc', label: 'Date (Newest)' },
  { value: 'date-asc', label: 'Date (Oldest)' },
];

export interface SharedSearchExperienceProps {
  surface?: 'page' | 'modal';
  shouldFocusInput?: boolean;
  onInputFocusHandled?: () => void;
  onHitNavigate?: () => void;
}

function normalizeExactTitleQuery(query: string, matchCase: boolean): string {
  const collapsed = query.trim().replace(/\s+/g, ' ');
  if (!collapsed) {
    return '';
  }

  if (
    (collapsed.startsWith('"') && collapsed.endsWith('"')) ||
    (collapsed.startsWith("'") && collapsed.endsWith("'"))
  ) {
    const unwrapped = collapsed.slice(1, -1).trim().replace(/\s+/g, ' ');
    return matchCase ? unwrapped : unwrapped.toLowerCase();
  }

  return matchCase ? collapsed : collapsed.toLowerCase();
}

function normalizeExactCandidateText(value: string | null | undefined, matchCase: boolean): string {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  return matchCase ? normalized : normalized.toLowerCase();
}

function normalizePhraseExactQuery(query: string, matchOptions: SearchMatchOptions): string {
  return normalizeSearchComparableText(normalizeExactTitleQuery(query, matchOptions.matchCase ?? false), matchOptions);
}

function shouldTreatAsExact(
  hit: SearchHit,
  normalizedQuery: string,
  matchOptions: SearchMatchOptions,
): boolean {
  if (hit.is_exact_match) {
    return true;
  }

  if (!normalizedQuery) {
    return false;
  }

  const snippetText = sanitizeSearchSnippet(hit.snippet);
  if (hasNormalizedBoundedMatch(snippetText, normalizedQuery, matchOptions)) {
    return true;
  }

  if (hit.match_source === 'title') {
    return hasNormalizedBoundedMatch(hit.title, normalizedQuery, matchOptions);
  }

  return false;
}

function supportsNativeViewTransition(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === 'function';
}

export default function SharedSearchExperience({
  surface = 'page',
  shouldFocusInput = false,
  onInputFocusHandled,
  onHitNavigate,
}: SharedSearchExperienceProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    searchHits,
    isSearchMode,
    total,
    loading,
    filters,
    setFilter,
    clearFilters,
    years,
    titles,
    locations,
    pageSize,
  } = useSermons();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [draftSearch, setDraftSearch] = useState(filters.q);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedIndexRef = useRef(selectedIndex);
  const handledFocusTransitionsRef = useRef<Set<string>>(new Set());
  const { bindings } = useKeyboardShortcuts();
  const isPageSurface = surface === 'page';
  const transitionState = isPageSurface && isSearchAutofocusTransitionState(location.state) ? location.state : null;
  const shouldAnimateSearchFallback = isPageSurface && Boolean(transitionState) && !supportsNativeViewTransition();
  const matchOptions = useMemo<SearchMatchOptions>(() => ({
    matchCase: filters.matchCase,
    wholeWord: filters.wholeWord,
  }), [filters.matchCase, filters.wholeWord]);
  const searchReturnState = useMemo(
    () => createSearchReturnState(`${location.pathname}${location.search}`),
    [location.pathname, location.search],
  );

  useShortcutSearchInputRegistration(searchRef);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    setDraftSearch(filters.q);
  }, [filters.q]);

  useEffect(() => {
    if (isPageSurface) {
      if (!transitionState) {
        return;
      }

      const { requestId } = transitionState;
      if (handledFocusTransitionsRef.current.has(requestId)) {
        return;
      }

      const input = searchRef.current;
      if (!input) {
        return;
      }

      handledFocusTransitionsRef.current.add(requestId);
      const maxCaret = input.value.length;
      const rawCaret = transitionState.source === 'home'
        ? transitionState.caret ?? maxCaret
        : maxCaret;
      const numericCaret = typeof rawCaret === 'number' && Number.isFinite(rawCaret) ? Math.floor(rawCaret) : maxCaret;
      const safeCaret = Math.max(0, Math.min(numericCaret, maxCaret));

      const applyFocus = () => {
        input.focus({ preventScroll: true });
        input.setSelectionRange(safeCaret, safeCaret);
      };

      if (typeof window.requestAnimationFrame === 'function') {
        const rafId = window.requestAnimationFrame(applyFocus);
        return () => {
          window.cancelAnimationFrame(rafId);
        };
      }

      applyFocus();
      return undefined;
    }

    if (!shouldFocusInput) {
      return;
    }

    const applyFocus = () => {
      searchRef.current?.focus();
      onInputFocusHandled?.();
    };

    if (typeof window.requestAnimationFrame === 'function') {
      const rafId = window.requestAnimationFrame(applyFocus);
      return () => window.cancelAnimationFrame(rafId);
    }

    applyFocus();
    return undefined;
  }, [isPageSurface, location.key, onInputFocusHandled, shouldFocusInput, transitionState]);

  const rankedSearchHits = useMemo(() => {
    const normalizedQuery = normalizePhraseExactQuery(filters.q, matchOptions);
    const computedExactHits = searchHits.map((hit) => {
      const computedExact = shouldTreatAsExact(hit, normalizedQuery, matchOptions);
      return computedExact === hit.is_exact_match
        ? hit
        : { ...hit, is_exact_match: computedExact };
    });

    if (filters.sort !== 'relevance-desc') {
      return computedExactHits;
    }

    return [...computedExactHits].sort((a, b) => Number(b.is_exact_match) - Number(a.is_exact_match));
  }, [filters.q, filters.sort, matchOptions, searchHits]);

  const exactTitleMatches = useMemo(() => {
    const normalizedQuery = normalizeExactTitleQuery(filters.q, filters.matchCase);
    if (!normalizedQuery) {
      return [];
    }

    return rankedSearchHits.filter(
      (hit) => normalizeExactCandidateText(hit.title, filters.matchCase) === normalizedQuery
    );
  }, [filters.matchCase, filters.q, rankedSearchHits]);

  const exactTitleHit = useMemo(() => {
    if (!exactTitleMatches.length) {
      return null;
    }

    return exactTitleMatches.find((hit) => hit.match_source === 'title') ?? exactTitleMatches[0];
  }, [exactTitleMatches]);

  const visibleSearchHits = useMemo(() => {
    const exactHits = rankedSearchHits.filter((hit) => hit.is_exact_match);
    if (exactHits.length > 0) {
      return exactHits;
    }

    if (exactTitleMatches.length > 0) {
      return exactTitleMatches;
    }

    return rankedSearchHits;
  }, [exactTitleMatches, rankedSearchHits]);

  const visibleHitCount = visibleSearchHits.length;
  const selectedStructuredFilterCount = useMemo(() => {
    const activeCount = [filters.year, filters.title, filters.location]
      .filter((value) => (value ?? '').trim() !== '')
      .length;
    return Math.min(activeCount, 3);
  }, [filters.location, filters.title, filters.year]);

  const exactTitleHitHref = useMemo(() => {
    if (!exactTitleHit) {
      return '';
    }

    return buildSermonHitHref({
      sermonId: exactTitleHit.sermon_id,
      query: filters.q,
      matchSource: exactTitleHit.match_source,
      paragraphNumber: exactTitleHit.paragraph_number,
      hitId: exactTitleHit.hit_id,
      matchCase: filters.matchCase,
      wholeWord: filters.wholeWord,
    });
  }, [exactTitleHit, filters.matchCase, filters.q, filters.wholeWord]);

  const itemHrefs = useMemo(() => {
    if (!isSearchMode) {
      return [];
    }

    return visibleSearchHits.map((hit) => buildSermonHitHref({
      sermonId: hit.sermon_id,
      query: filters.q,
      matchSource: hit.match_source,
      paragraphNumber: hit.paragraph_number,
      hitId: hit.hit_id,
      matchCase: filters.matchCase,
      wholeWord: filters.wholeWord,
    }));
  }, [filters.matchCase, filters.q, filters.wholeWord, isSearchMode, visibleSearchHits]);

  const shortcutResultListController = useMemo<ShortcutResultListController | null>(() => {
    if (!isSearchMode || itemHrefs.length === 0) {
      return null;
    }

    return {
      hasItems: () => itemHrefs.length > 0,
      selectNext: () => {
        setSelectedIndex((currentIndex) => Math.min(currentIndex + 1, itemHrefs.length - 1));
      },
      selectPrevious: () => {
        setSelectedIndex((currentIndex) => Math.max(currentIndex - 1, 0));
      },
      activateSelection: () => {
        const currentIndex = selectedIndexRef.current;
        if (currentIndex < 0 || currentIndex >= itemHrefs.length) {
          return;
        }

        onHitNavigate?.();
        if (searchReturnState) {
          navigate(itemHrefs[currentIndex], { state: searchReturnState });
          return;
        }

        navigate(itemHrefs[currentIndex]);
      },
    };
  }, [isSearchMode, itemHrefs, navigate, onHitNavigate, searchReturnState]);

  useShortcutResultListRegistration(shortcutResultListController);

  const handleSearchInputChange = useCallback((value: string) => {
    setDraftSearch(value);
    if (getInstantSearchEnabled()) {
      setFilter('q', value);
    }
    setSelectedIndex(-1);
  }, [setFilter]);

  const handleSearchSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draftSearch.trim();
    if (!trimmed) {
      navigate('/');
      return;
    }

    setFilter('q', trimmed);
    setSelectedIndex(-1);
  }, [draftSearch, navigate, setFilter]);

  const handleSortChange = useCallback((value: string) => {
    setFilter('sort', value);
  }, [setFilter]);

  const handleViewChange = useCallback((view: 'card' | 'table') => {
    setFilter('view', view);
  }, [setFilter]);

  const handleStructuredFilterChange = useCallback((key: 'year' | 'title' | 'location', value: string) => {
    setFilter(key, value);
    setSelectedIndex(-1);
  }, [setFilter]);

  const handleClearStructuredFilters = useCallback(() => {
    clearFilters?.();
    setSelectedIndex(-1);
  }, [clearFilters]);

  const toggleMatchCase = useCallback(() => {
    setFilter('matchCase', !filters.matchCase);
    setSelectedIndex(-1);
  }, [filters.matchCase, setFilter]);

  const toggleWholeWord = useCallback(() => {
    setFilter('wholeWord', !filters.wholeWord);
    setSelectedIndex(-1);
  }, [filters.wholeWord, setFilter]);

  const handleSearchInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const loweredKey = event.key.toLowerCase();
    if (loweredKey === 'c') {
      event.preventDefault();
      toggleMatchCase();
      return;
    }
    if (loweredKey === 'w') {
      event.preventDefault();
      toggleWholeWord();
    }
  }, [toggleMatchCase, toggleWholeWord]);

  const inputForm = (
    <form
      onSubmit={handleSearchSubmit}
      className={isPageSurface ? 'mx-auto w-full max-w-[520px]' : 'w-full'}
    >
      <div
        className={`flex h-11 items-center rounded-lg border border-border bg-bg-muted px-3 ${shouldAnimateSearchFallback ? 'home-search-fallback-enter' : ''}`}
        style={{ viewTransitionName: isPageSurface ? 'global-search' : undefined }}
      >
        <span className="pr-3 font-mono text-base text-muted-foreground">{formatShortcutKey(bindings.focus_search)}</span>
        <input
          ref={searchRef}
          type="text"
          value={draftSearch}
          onChange={(event) => handleSearchInputChange(event.target.value)}
          onKeyDown={handleSearchInputKeyDown}
          placeholder="search sermons ..."
          className="h-full w-full bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          aria-label="Search sermons"
        />
        <div className="ml-3 flex items-center gap-1">
          <button
            type="button"
            onClick={toggleMatchCase}
            className={`rounded border px-2 py-1 text-[11px] font-mono transition-colors ${
              filters.matchCase
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Toggle match case"
            title="Match case (Alt+C)"
          >
            Aa
          </button>
          <button
            type="button"
            onClick={toggleWholeWord}
            className={`rounded border px-2 py-1 text-[11px] font-mono transition-colors ${
              filters.wholeWord
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Toggle whole word"
            title="Whole word (Alt+W)"
          >
            W
          </button>
        </div>
      </div>
    </form>
  );

  const body = (
    <>
      <section className={isPageSurface ? 'mb-8' : 'mb-6'}>
        {inputForm}
      </section>

      <h1 className="font-mono text-4xl font-medium text-foreground">search</h1>

      {!isSearchMode && (
        <div className="mt-8 rounded-lg border border-border bg-card px-6 py-8 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            Type in the search box to find sermons.
          </p>
        </div>
      )}

      {isSearchMode && (
        <>
          {exactTitleHit && (
            <section className="mt-8">
              <BookMatchCard
                to={exactTitleHitHref}
                linkState={searchReturnState ?? undefined}
                title={exactTitleHit.title}
                summary={exactTitleHit.summary}
                sermonCode={exactTitleHit.sermon_code}
                location={exactTitleHit.location}
                year={extractYear(exactTitleHit.date)}
                tags={exactTitleHit.tags}
              />
            </section>
          )}

          <section className="mt-8 flex items-center justify-between gap-3">
            <p className="font-mono text-sm text-muted-foreground">
              Found {visibleHitCount.toLocaleString()} hits
            </p>

            <div className="flex items-center gap-2">
              <select
                value={filters.sort}
                onChange={(event) => handleSortChange(event.target.value)}
                className="h-10 rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/35"
                aria-label="Sort search results"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/35"
                    aria-label="Open filters"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    {selectedStructuredFilterCount > 0 && (
                      <span
                        data-testid="filter-count-badge"
                        className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 font-mono text-[10px] leading-none text-background"
                        aria-label={`${selectedStructuredFilterCount} active filters`}
                      >
                        {selectedStructuredFilterCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[min(92vw,460px)] p-0">
                  <SermonSearchFilters
                    year={filters.year}
                    title={filters.title}
                    location={filters.location}
                    years={Array.isArray(years) ? years : []}
                    titles={Array.isArray(titles) ? titles : []}
                    locations={Array.isArray(locations) ? locations : []}
                    onFilterChange={handleStructuredFilterChange}
                    onClearFilters={handleClearStructuredFilters}
                  />
                </PopoverContent>
              </Popover>

              <div className="inline-flex items-center rounded-md border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => handleViewChange('card')}
                  className={`rounded p-2 ${filters.view === 'card' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-label="Card view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('table')}
                  className={`rounded p-2 ${filters.view === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-label="Table view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          <section className="mt-6">
            {filters.view === 'table' ? (
              <SearchHitsTable
                hits={visibleSearchHits}
                loading={loading}
                selectedIndex={selectedIndex}
                query={filters.q}
                matchOptions={matchOptions}
                linkState={searchReturnState ?? undefined}
                onHitNavigate={onHitNavigate}
              />
            ) : (
              <SearchHitsCards
                hits={visibleSearchHits}
                loading={loading}
                selectedIndex={selectedIndex}
                query={filters.q}
                matchOptions={matchOptions}
                linkState={searchReturnState ?? undefined}
                onHitNavigate={onHitNavigate}
              />
            )}
          </section>

          <div className="pt-4">
            <SermonPagination
              currentPage={filters.page}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={(page) => setFilter('page', page)}
            />
          </div>
        </>
      )}
    </>
  );

  return (
    <main className={isPageSurface ? 'mx-auto w-full max-w-[860px] px-6 pb-24 pt-10' : 'mx-auto w-full max-w-[860px] px-6 pb-10 pt-2'}>
      {body}
    </main>
  );
}

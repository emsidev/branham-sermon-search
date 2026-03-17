import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, Hash, LayoutGrid, List } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  useKeyboardShortcuts,
  useShortcutResultListRegistration,
  useShortcutSearchInputRegistration,
  type ShortcutResultListController,
} from '@/hooks/useKeyboardShortcuts';
import UnifiedSearchInput from '@/components/search/UnifiedSearchInput';
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
import { resolveJumpToHitIndex } from '@/lib/hitNavigation';
import { getInstantSearchEnabled } from '@/lib/preferences';
import {
  createSearchReturnState,
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
    setFilters,
    setFilter,
    clearFilters,
    years,
    titles,
    locations,
    pageSize,
  } = useSermons();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [draftSearch, setDraftSearch] = useState(filters.q);
  const [jumpToHitInput, setJumpToHitInput] = useState('');
  const [isJumpPopoverOpen, setIsJumpPopoverOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedIndexRef = useRef(selectedIndex);
  const { bindings } = useKeyboardShortcuts();
  const isPageSurface = surface === 'page';
  const effectiveMatchCase = !filters.fuzzy && filters.matchCase;
  const effectiveWholeWord = !filters.fuzzy && filters.wholeWord;
  const matchOptions = useMemo<SearchMatchOptions>(() => ({
    matchCase: effectiveMatchCase,
    wholeWord: effectiveWholeWord,
    fuzzy: filters.fuzzy,
  }), [effectiveMatchCase, effectiveWholeWord, filters.fuzzy]);
  const searchReturnState = useMemo(
    () => createSearchReturnState(`${location.pathname}${location.search}`),
    [location.pathname, location.search],
  );

  useShortcutSearchInputRegistration(searchRef, !isPageSurface);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    setDraftSearch(filters.q);
  }, [filters.q]);

  useEffect(() => {
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
  }, [onInputFocusHandled, shouldFocusInput]);

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
    const normalizedQuery = normalizeExactTitleQuery(filters.q, effectiveMatchCase);
    if (!normalizedQuery) {
      return [];
    }

    return rankedSearchHits.filter(
      (hit) => normalizeExactCandidateText(hit.title, effectiveMatchCase) === normalizedQuery
    );
  }, [effectiveMatchCase, filters.q, rankedSearchHits]);

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
      matchCase: effectiveMatchCase,
      wholeWord: effectiveWholeWord,
      fuzzy: filters.fuzzy,
    });
  }, [effectiveMatchCase, effectiveWholeWord, exactTitleHit, filters.fuzzy, filters.q]);

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
      matchCase: effectiveMatchCase,
      wholeWord: effectiveWholeWord,
      fuzzy: filters.fuzzy,
    }));
  }, [effectiveMatchCase, effectiveWholeWord, filters.fuzzy, filters.q, isSearchMode, visibleSearchHits]);

  const navigateToHitIndex = useCallback((index: number) => {
    if (index < 0 || index >= itemHrefs.length) {
      return;
    }

    setSelectedIndex(index);
    onHitNavigate?.();

    if (searchReturnState) {
      navigate(itemHrefs[index], { state: searchReturnState });
      return;
    }

    navigate(itemHrefs[index]);
  }, [itemHrefs, navigate, onHitNavigate, searchReturnState]);

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

        navigateToHitIndex(currentIndex);
      },
    };
  }, [isSearchMode, itemHrefs, navigateToHitIndex]);

  useShortcutResultListRegistration(shortcutResultListController);

  const handleSearchInputChange = useCallback((value: string) => {
    const instantSearchEnabled = getInstantSearchEnabled();
    setDraftSearch(value);
    if (instantSearchEnabled) {
      setFilter('q', value);
    }
    setSelectedIndex(-1);
  }, [setFilter]);

  const handleSearchExecute = useCallback((rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) {
      navigate('/');
      return false;
    }

    setFilter('q', trimmed);
    setSelectedIndex(-1);
    return true;
  }, [navigate, setFilter]);

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

  const handleJumpToHitSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const targetIndex = resolveJumpToHitIndex(jumpToHitInput, itemHrefs.length);
    if (targetIndex == null) {
      return;
    }

    setJumpToHitInput(String(targetIndex + 1));
    setIsJumpPopoverOpen(false);
    navigateToHitIndex(targetIndex);
  }, [itemHrefs.length, jumpToHitInput, navigateToHitIndex]);

  const toggleMatchCase = useCallback(() => {
    if (filters.fuzzy) {
      return;
    }
    setFilters({ matchCase: !effectiveMatchCase });
    setSelectedIndex(-1);
  }, [effectiveMatchCase, filters.fuzzy, setFilters]);

  const toggleWholeWord = useCallback(() => {
    if (filters.fuzzy) {
      return;
    }
    setFilters({ wholeWord: !effectiveWholeWord });
    setSelectedIndex(-1);
  }, [effectiveWholeWord, filters.fuzzy, setFilters]);

  const toggleFuzzy = useCallback(() => {
    setFilters({ fuzzy: !filters.fuzzy });
    setSelectedIndex(-1);
  }, [filters.fuzzy, setFilters]);

  const inputForm = (
    <div className="w-full">
      <UnifiedSearchInput
        query={draftSearch}
        shortcutLabel={formatShortcutKey(bindings.focus_search)}
        instantSearchEnabled={getInstantSearchEnabled()}
        matchCase={effectiveMatchCase}
        wholeWord={effectiveWholeWord}
        fuzzy={filters.fuzzy}
        onQueryChange={(value, meta) => {
          if (meta.isComposing) {
            setDraftSearch(value);
            return;
          }
          handleSearchInputChange(value);
        }}
        onExecuteQuery={(value) => handleSearchExecute(value)}
        onToggleMatchCase={toggleMatchCase}
        onToggleWholeWord={toggleWholeWord}
        onToggleFuzzy={toggleFuzzy}
        inputRef={searchRef}
        containerClassName="relative flex h-11 items-center rounded-lg border border-border bg-bg-muted px-3"
        inputClassName="h-full w-full bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        shortcutClassName="pr-3 font-mono text-base text-muted-foreground"
        toggleContainerClassName="ml-3 flex items-center gap-1"
      />
    </div>
  );

  const body = (
    <>
      {!isPageSurface && (
        <section className="mb-6">
          {inputForm}
        </section>
      )}

      <h1 className="font-mono text-4xl font-medium text-foreground">search</h1>

      {!isSearchMode && (
        <div className="mt-8 rounded-lg border border-border bg-card px-6 py-8 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            Use the header search box to find sermons.
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
              {visibleHitCount > 0 && (
                <Popover open={isJumpPopoverOpen} onOpenChange={setIsJumpPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/35"
                      aria-label="Open jump to hit"
                    >
                      <Hash className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[min(72vw,200px)]">
                    <form onSubmit={handleJumpToHitSubmit} className="flex items-center gap-2">
                      <label htmlFor="jump-to-hit-input" className="sr-only">
                        Jump to hit number
                      </label>
                      <input
                        id="jump-to-hit-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={jumpToHitInput}
                        onChange={(event) => setJumpToHitInput(event.target.value)}
                        placeholder={`1-${visibleHitCount}`}
                        className="h-10 w-full rounded-md border border-border bg-background px-2 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/35"
                        aria-label="Jump to hit number"
                      />
                      <button
                        type="submit"
                        className="h-10 rounded-md border border-border bg-background px-3 font-mono text-xs text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/35"
                      >
                        Jump
                      </button>
                    </form>
                  </PopoverContent>
                </Popover>
              )}

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

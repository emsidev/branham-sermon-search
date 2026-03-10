import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { useSermons, type SearchHit } from '@/hooks/useSermons';
import SearchHitsTable from '@/components/SearchHitsTable';
import SearchHitsCards from '@/components/SearchHitsCards';
import SermonPagination from '@/components/SermonPagination';
import { buildSermonHitHref, escapeRegExp, sanitizeSearchSnippet } from '@/lib/search';
import { getInstantSearchEnabled } from '@/lib/preferences';

const SORT_OPTIONS: Array<{ value: 'relevance-desc' | 'title-asc' | 'title-desc' | 'date-desc' | 'date-asc'; label: string }> = [
  { value: 'relevance-desc', label: 'Relevance' },
  { value: 'title-asc', label: 'Book (Title A-Z)' },
  { value: 'title-desc', label: 'Book (Title Z-A)' },
  { value: 'date-desc', label: 'Date (Newest)' },
  { value: 'date-asc', label: 'Date (Oldest)' },
];

function normalizeExactQuery(query: string): string {
  const collapsed = query.trim().replace(/\s+/g, ' ');
  if (!collapsed) {
    return '';
  }

  if (
    (collapsed.startsWith('"') && collapsed.endsWith('"')) ||
    (collapsed.startsWith("'") && collapsed.endsWith("'"))
  ) {
    return collapsed.slice(1, -1).trim().replace(/\s+/g, ' ').toLowerCase();
  }

  return collapsed.toLowerCase();
}

function normalizeExactCandidateText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function hasExactPhraseMatch(text: string, normalizedQuery: string): boolean {
  if (!text || !normalizedQuery) {
    return false;
  }

  if (normalizedQuery.includes(' ')) {
    return text.includes(normalizedQuery);
  }

  return new RegExp(`\\b${escapeRegExp(normalizedQuery)}\\b`, 'i').test(text);
}

function shouldTreatAsExact(hit: SearchHit, normalizedQuery: string): boolean {
  if (hit.is_exact_match) {
    return true;
  }

  if (!normalizedQuery) {
    return false;
  }

  const normalizedTitle = normalizeExactCandidateText(hit.title);
  const normalizedSnippet = normalizeExactCandidateText(sanitizeSearchSnippet(hit.snippet));

  return (
    hasExactPhraseMatch(normalizedTitle, normalizedQuery) ||
    hasExactPhraseMatch(normalizedSnippet, normalizedQuery)
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const {
    searchHits,
    isSearchMode,
    total,
    loading,
    filters,
    setFilter,
    pageSize,
  } = useSermons();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [draftSearch, setDraftSearch] = useState(filters.q);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftSearch(filters.q);
  }, [filters.q]);

  const rankedSearchHits = useMemo(() => {
    const normalizedQuery = normalizeExactQuery(filters.q);
    const computedExactHits = searchHits.map((hit) => {
      const computedExact = shouldTreatAsExact(hit, normalizedQuery);
      return computedExact === hit.is_exact_match
        ? hit
        : { ...hit, is_exact_match: computedExact };
    });

    if (filters.sort !== 'relevance-desc') {
      return computedExactHits;
    }

    return [...computedExactHits].sort((a, b) => Number(b.is_exact_match) - Number(a.is_exact_match));
  }, [filters.q, filters.sort, searchHits]);

  const exactTitleHit = useMemo(() => {
    const normalizedQuery = normalizeExactQuery(filters.q);
    if (!normalizedQuery) {
      return null;
    }

    return rankedSearchHits.find((hit) => normalizeExactCandidateText(hit.title) === normalizedQuery) ?? null;
  }, [filters.q, rankedSearchHits]);

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
    });
  }, [exactTitleHit, filters.q]);

  const itemHrefs = useMemo(() => {
    if (!isSearchMode) {
      return [];
    }

    return rankedSearchHits.map((hit) => buildSermonHitHref({
      sermonId: hit.sermon_id,
      query: filters.q,
      matchSource: hit.match_source,
      paragraphNumber: hit.paragraph_number,
      hitId: hit.hit_id,
    }));
  }, [filters.q, isSearchMode, rankedSearchHits]);

  useKeyboardNav({
    itemCount: isSearchMode ? rankedSearchHits.length : 0,
    selectedIndex,
    onSelectedIndexChange: setSelectedIndex,
    itemHrefs,
    searchInputRef: searchRef,
    booksShortcutHref: '/books',
    settingsShortcutHref: '/settings',
  });

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex w-full max-w-[1200px] items-center gap-4 px-6 py-3">
          <Link to="/" className="shrink-0 font-mono text-sm font-semibold text-foreground">
            the table search
          </Link>

          <form
            onSubmit={handleSearchSubmit}
            className="mx-auto w-full max-w-[520px]"
          >
            <div
              className="flex h-11 items-center rounded-lg border border-border bg-muted/40 px-3"
              style={{ viewTransitionName: 'global-search' }}
            >
              <span className="pr-3 font-mono text-base text-muted-foreground">/</span>
              <input
                ref={searchRef}
                type="text"
                value={draftSearch}
                onChange={(event) => handleSearchInputChange(event.target.value)}
                placeholder="search sermons ..."
                className="h-full w-full bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Search sermons"
              />
            </div>
          </form>

          <nav className="flex shrink-0 items-center gap-6 font-mono text-sm">
            <NavLink to="/books" className="text-muted-foreground hover:text-foreground">
              books <kbd className="rounded border border-border bg-muted px-1 text-[11px]">b</kbd>
            </NavLink>
            <NavLink to="/settings" className="text-muted-foreground hover:text-foreground">
              settings <kbd className="rounded border border-border bg-muted px-1 text-[11px]">,</kbd>
            </NavLink>
            <NavLink to="/about" className="text-muted-foreground hover:text-foreground">
              about
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[860px] px-6 pb-24 pt-10">
        <h1 className="font-mono text-4xl font-semibold text-foreground">search</h1>

        {!isSearchMode && (
          <div className="mt-8 rounded-xl border border-border bg-card px-6 py-8 text-center">
            <p className="font-mono text-sm text-muted-foreground">
              Type in the search box to find sermons.
            </p>
          </div>
        )}

        {isSearchMode && (
          <>
            {exactTitleHit && (
              <section className="mt-8">
                <Link
                  to={exactTitleHitHref}
                  className="group block rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-border/80"
                  style={{ backgroundImage: 'var(--exact-card-gradient)' }}
                  data-testid="exact-title-card"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-muted-foreground">Book title match</p>
                      <h2 className="truncate font-mono text-lg font-semibold text-foreground transition-colors group-hover:text-[hsl(var(--link))]">
                        {exactTitleHit.title}
                      </h2>
                    </div>
                    <span className="shrink-0 text-xs font-mono text-muted-foreground transition-colors group-hover:text-foreground">
                      open
                    </span>
                  </div>
                </Link>
              </section>
            )}

            <section className="mt-8 flex items-center justify-between gap-3">
              <p className="font-mono text-sm text-muted-foreground">
                Found {total.toLocaleString()} hits
              </p>

              <div className="flex items-center gap-2">
                <select
                  value={filters.sort}
                  onChange={(event) => handleSortChange(event.target.value)}
                  className="h-10 rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground focus:outline-none"
                  aria-label="Sort search results"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

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
                  hits={rankedSearchHits}
                  loading={loading}
                  selectedIndex={selectedIndex}
                  query={filters.q}
                />
              ) : (
                <SearchHitsCards
                  hits={rankedSearchHits}
                  loading={loading}
                  selectedIndex={selectedIndex}
                  query={filters.q}
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
      </main>
    </div>
  );
}

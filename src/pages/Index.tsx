import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSermons } from '@/hooks/useSermons';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { runWithViewTransition } from '@/lib/viewTransition';
import { getInstantSearchEnabled, setInstantSearchEnabled } from '@/lib/preferences';
import type { HomeSearchTransitionState } from '@/lib/searchNavigation';

function formatBuildDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Index() {
  const navigate = useNavigate();
  const { years } = useSermons();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [query, setQuery] = useState('');
  const [instantSearchEnabled, setInstantSearchEnabledState] = useState(() => getInstantSearchEnabled());
  const searchRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const searchRequestIdRef = useRef(0);
  const buildDateLabel = useMemo(() => formatBuildDate(__APP_BUILD_DATE__), []);

  useKeyboardNav({
    itemCount: 0,
    selectedIndex,
    onSelectedIndexChange: setSelectedIndex,
    itemHrefs: [],
    searchInputRef: searchRef,
    booksShortcutHref: '/books',
    settingsShortcutHref: '/settings',
  });

  const buildHomeTransitionState = useCallback((caret?: number): HomeSearchTransitionState => {
    const fallbackCaret = query.length;
    const numericCaret = typeof caret === 'number' && Number.isFinite(caret) ? Math.floor(caret) : fallbackCaret;
    return {
      source: 'home',
      autofocus: true,
      caret: Math.max(0, numericCaret),
      requestId: `home-search-${Date.now()}-${searchRequestIdRef.current++}`,
    };
  }, [query.length]);

  const navigateToSearch = useCallback((rawQuery: string, caret?: number): boolean => {
    const trimmedQuery = rawQuery.trim();
    if (!trimmedQuery) {
      return false;
    }

    const params = new URLSearchParams({
      q: trimmedQuery,
      sort: 'relevance-desc',
      view: 'card',
    });

    runWithViewTransition(() => {
      navigate(`/search?${params.toString()}`, {
        state: buildHomeTransitionState(caret),
      });
    });
    return true;
  }, [buildHomeTransitionState, navigate]);

  const handleSearchSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const caret = searchRef.current?.selectionStart ?? query.length;
    if (!navigateToSearch(query, caret)) {
      searchRef.current?.focus();
    }
  }, [navigateToSearch, query]);

  const handleSearchInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    if (!instantSearchEnabled) {
      return;
    }

    if (isComposingRef.current || event.nativeEvent.isComposing) {
      return;
    }

    const caret = event.target.selectionStart ?? nextValue.length;
    navigateToSearch(nextValue, caret);
  }, [instantSearchEnabled, navigateToSearch]);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback((event: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    if (!instantSearchEnabled) {
      return;
    }

    const nextValue = event.currentTarget.value;
    const caret = event.currentTarget.selectionStart ?? nextValue.length;
    navigateToSearch(nextValue, caret);
  }, [instantSearchEnabled, navigateToSearch]);

  const handleInstantSearchToggle = useCallback(() => {
    setInstantSearchEnabledState((currentValue) => {
      const nextValue = !currentValue;
      setInstantSearchEnabled(nextValue);
      return nextValue;
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border-subtle">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-end gap-6 px-6 py-4 font-mono text-sm">
          <NavLink to="/books" className="text-muted-foreground hover:text-foreground">
            books <kbd className="rounded border border-border bg-muted px-1 text-[11px]">b</kbd>
          </NavLink>
          <NavLink to="/settings" className="text-muted-foreground hover:text-foreground">
            settings <kbd className="rounded border border-border bg-muted px-1 text-[11px]">,</kbd>
          </NavLink>
          <NavLink to="/about" className="text-muted-foreground hover:text-foreground">
            about
          </NavLink>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-6 pb-8 pt-20">
        <div className="mx-auto w-full max-w-[640px] text-center">
          <h1 className="font-mono text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
            the table search
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            a fast, modern browser for the table
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-10">
            <div
              className="flex h-14 items-center rounded-lg border border-border bg-bg-muted p-1"
              style={{ viewTransitionName: 'global-search' }}
            >
              <span className="px-4 text-lg font-mono text-muted-foreground">/</span>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={handleSearchInputChange}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder="search sermons ..."
                className="h-full flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Search sermons"
              />
              <button
                type="submit"
                className="inline-flex h-full items-center gap-2 rounded-md bg-foreground px-4 font-mono text-sm text-background transition-opacity hover:opacity-90"
              >
                <Search className="h-4 w-4" />
                search
              </button>
            </div>
          </form>

          <div className="mt-4 flex items-center justify-center gap-1 font-mono text-sm text-muted-foreground">
            <span aria-hidden>⚡</span>
            <span>
              Instant search {instantSearchEnabled ? 'on' : 'off'} -
            </span>
            <button
              type="button"
              onClick={handleInstantSearchToggle}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {instantSearchEnabled ? 'turn off' : 'turn on'}
            </button>
          </div>

          <p className="mt-4 font-mono text-xs text-muted-foreground">
            built {buildDateLabel} {'\u00B7'} v{__APP_VERSION__}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-center gap-x-7 gap-y-3 pt-16 font-mono text-sm text-muted-foreground">
          {years.map((year) => (
            <span key={year}>{year}</span>
          ))}
        </div>
      </main>
    </div>
  );
}

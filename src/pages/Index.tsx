import React, { useCallback, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSermons } from '@/hooks/useSermons';
import { useKeyboardShortcuts, useShortcutSearchInputRegistration } from '@/hooks/useKeyboardShortcuts';
import { formatShortcutKey } from '@/lib/keyboardShortcuts';
import { runWithViewTransition } from '@/lib/viewTransition';
import { getInstantSearchEnabled, setInstantSearchEnabled } from '@/lib/preferences';
import type { HomeSearchTransitionState } from '@/lib/searchNavigation';

export default function Index() {
  const navigate = useNavigate();
  const { years } = useSermons();
  const [query, setQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(true);
  const [fuzzy, setFuzzy] = useState(false);
  const [instantSearchEnabled, setInstantSearchEnabledState] = useState(() => getInstantSearchEnabled());
  const searchRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const searchRequestIdRef = useRef(0);
  const { bindings } = useKeyboardShortcuts();

  useShortcutSearchInputRegistration(searchRef);

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

  const navigateToSearch = useCallback((
    rawQuery: string,
    caret?: number,
    modeOptions?: { matchCase?: boolean; wholeWord?: boolean; fuzzy?: boolean },
  ): boolean => {
    const trimmedQuery = rawQuery.trim();
    if (!trimmedQuery) {
      return false;
    }

    const effectiveMatchCase = modeOptions?.matchCase ?? matchCase;
    const effectiveWholeWord = modeOptions?.wholeWord ?? wholeWord;
    const effectiveFuzzy = modeOptions?.fuzzy ?? fuzzy;
    const params = new URLSearchParams({
      q: trimmedQuery,
      sort: 'relevance-desc',
      view: 'card',
    });
    if (effectiveFuzzy) {
      params.set('fuzzy', '1');
    } else {
      if (effectiveMatchCase) {
        params.set('matchCase', '1');
      }
      params.set('wholeWord', effectiveWholeWord ? '1' : '0');
    }

    runWithViewTransition(() => {
      navigate(`/search?${params.toString()}`, {
        state: buildHomeTransitionState(caret),
      });
    });
    return true;
  }, [buildHomeTransitionState, fuzzy, matchCase, navigate, wholeWord]);

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

  const toggleMatchCase = useCallback(() => {
    if (fuzzy) {
      return;
    }
    const nextMatchCase = !matchCase;
    setMatchCase(nextMatchCase);
    if (!instantSearchEnabled) {
      return;
    }

    const caret = searchRef.current?.selectionStart ?? query.length;
    navigateToSearch(query, caret, {
      matchCase: nextMatchCase,
      wholeWord,
      fuzzy,
    });
  }, [fuzzy, instantSearchEnabled, matchCase, navigateToSearch, query, wholeWord]);

  const toggleWholeWord = useCallback(() => {
    if (fuzzy) {
      return;
    }
    const nextWholeWord = !wholeWord;
    setWholeWord(nextWholeWord);
    if (!instantSearchEnabled) {
      return;
    }

    const caret = searchRef.current?.selectionStart ?? query.length;
    navigateToSearch(query, caret, {
      matchCase,
      wholeWord: nextWholeWord,
      fuzzy,
    });
  }, [fuzzy, instantSearchEnabled, matchCase, navigateToSearch, query, wholeWord]);

  const toggleFuzzy = useCallback(() => {
    const nextFuzzy = !fuzzy;
    let nextMatchCase = matchCase;
    let nextWholeWord = wholeWord;

    if (nextFuzzy) {
      nextMatchCase = false;
      nextWholeWord = false;
    } else if (!nextMatchCase && !nextWholeWord) {
      nextWholeWord = true;
    }

    setFuzzy(nextFuzzy);
    setMatchCase(nextMatchCase);
    setWholeWord(nextWholeWord);

    if (!instantSearchEnabled) {
      return;
    }

    const caret = searchRef.current?.selectionStart ?? query.length;
    navigateToSearch(query, caret, {
      matchCase: nextMatchCase,
      wholeWord: nextWholeWord,
      fuzzy: nextFuzzy,
    });
  }, [fuzzy, instantSearchEnabled, matchCase, navigateToSearch, query, wholeWord]);

  const handleSearchInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const loweredKey = event.key.toLowerCase();
    if (loweredKey === 'c') {
      if (fuzzy) {
        return;
      }
      event.preventDefault();
      toggleMatchCase();
      return;
    }

    if (loweredKey === 'w') {
      if (fuzzy) {
        return;
      }
      event.preventDefault();
      toggleWholeWord();
      return;
    }

    if (loweredKey === 'f') {
      event.preventDefault();
      toggleFuzzy();
    }
  }, [fuzzy, toggleFuzzy, toggleMatchCase, toggleWholeWord]);

  return (
    <main className="mx-auto w-full max-w-[860px] px-6 pb-12 pt-20">
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
            <span className="px-4 text-lg font-mono text-muted-foreground">{formatShortcutKey(bindings.focus_search)}</span>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={handleSearchInputChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={handleSearchInputKeyDown}
              placeholder="search sermons ..."
              className="h-full flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label="Search sermons"
            />
            <div className="mr-2 flex items-center gap-1">
              <button
                type="button"
                onClick={toggleMatchCase}
                disabled={fuzzy}
                className={`rounded border px-2 py-1 text-[11px] font-mono transition-colors ${
                  matchCase
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                } ${fuzzy ? 'cursor-not-allowed opacity-40' : ''}`}
                aria-label="Toggle match case"
                title={fuzzy ? 'Disabled while fuzzy mode is enabled' : 'Match case (Alt+C)'}
              >
                Aa
              </button>
              <button
                type="button"
                onClick={toggleWholeWord}
                disabled={fuzzy}
                className={`rounded border px-2 py-1 text-[11px] font-mono transition-colors ${
                  wholeWord
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                } ${fuzzy ? 'cursor-not-allowed opacity-40' : ''}`}
                aria-label="Toggle whole word"
                title={fuzzy ? 'Disabled while fuzzy mode is enabled' : 'Whole word (Alt+W)'}
              >
                W
              </button>
              <button
                type="button"
                onClick={toggleFuzzy}
                className={`rounded border px-2 py-1 text-[11px] font-mono transition-colors ${
                  fuzzy
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
                aria-label="Toggle fuzzy search"
                title="Fuzzy search (Alt+F)"
              >
                Fz
              </button>
            </div>
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
          <span aria-hidden>*</span>
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
      </div>

      <div className="mt-20 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 font-mono text-sm text-muted-foreground">
        {years.map((year) => (
          <span key={year}>{year}</span>
        ))}
      </div>
    </main>
  );
}

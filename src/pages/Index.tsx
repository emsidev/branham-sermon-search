import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedSearchInput from '@/components/search/UnifiedSearchInput';
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

  const handleSearchInputChange = useCallback((nextValue: string, isComposing: boolean) => {
    setQuery(nextValue);
    if (!instantSearchEnabled) {
      return;
    }

    if (isComposing) {
      return;
    }

    const caret = searchRef.current?.selectionStart ?? nextValue.length;
    navigateToSearch(nextValue, caret);
  }, [instantSearchEnabled, navigateToSearch]);

  const handleSearchExecute = useCallback((rawQuery: string, source: 'submit' | 'recent' = 'submit') => {
    const caret = source === 'recent'
      ? rawQuery.length
      : (searchRef.current?.selectionStart ?? rawQuery.length);
    if (!navigateToSearch(rawQuery, caret)) {
      searchRef.current?.focus();
      return false;
    }

    return true;
  }, [navigateToSearch]);

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

  return (
    <main className="mx-auto w-full max-w-[860px] px-6 pb-12 pt-20">
      <div className="mx-auto w-full max-w-[640px] text-center">
        <h1 className="font-mono text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
          the table search
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          A fast, modern browser for the table search
        </p>

        <div className="mt-10">
          <UnifiedSearchInput
            query={query}
            shortcutLabel={formatShortcutKey(bindings.focus_search)}
            instantSearchEnabled={instantSearchEnabled}
            matchCase={matchCase}
            wholeWord={wholeWord}
            fuzzy={fuzzy}
            onQueryChange={(value, meta) => {
              handleSearchInputChange(value, meta.isComposing);
              if (meta.phase === 'composition-end' && instantSearchEnabled) {
                const caret = searchRef.current?.selectionStart ?? value.length;
                navigateToSearch(value, caret);
              }
            }}
            onExecuteQuery={(value, meta) => handleSearchExecute(value, meta.source)}
            onToggleMatchCase={toggleMatchCase}
            onToggleWholeWord={toggleWholeWord}
            onToggleFuzzy={toggleFuzzy}
            inputRef={searchRef}
            containerClassName="relative flex h-14 items-center rounded-lg border border-border bg-bg-muted p-1"
            inputClassName="h-full flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            showSubmitButton
            submitButtonLabel="search"
            viewTransitionName="global-search"
          />
        </div>

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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import UnifiedSearchInput from '@/components/search/UnifiedSearchInput';
import { useKeyboardShortcuts, useShortcutSearchInputRegistration } from '@/hooks/useKeyboardShortcuts';
import { formatShortcutKey } from '@/lib/keyboardShortcuts';
import { getInstantSearchEnabled } from '@/lib/preferences';
import {
  isHomeSearchTransitionState,
  isSearchAutofocusTransitionState,
} from '@/lib/searchNavigation';
import { getLogoUrl } from '@/lib/utils';

const SCROLL_DELTA_THRESHOLD = 8;
const MIN_SCROLL_TO_HIDE = 64;

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return [
    'inline-flex items-center gap-1.5 text-sm font-mono transition-colors',
    isActive ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground hover:text-foreground',
  ].join(' ');
}

function parseWholeWordParam(rawValue: string | null): boolean {
  if (rawValue == null) {
    return true;
  }

  return rawValue === '1';
}

function buildCanonicalSearchHref(
  query: string,
  mode: { matchCase: boolean; wholeWord: boolean; fuzzy: boolean },
): string {
  const trimmedQuery = query.trim();
  const params = new URLSearchParams({
    q: trimmedQuery,
    sort: 'relevance-desc',
    view: 'card',
  });

  if (mode.fuzzy) {
    params.set('fuzzy', '1');
  } else {
    if (mode.matchCase) {
      params.set('matchCase', '1');
    }
    params.set('wholeWord', mode.wholeWord ? '1' : '0');
  }

  return `/search?${params.toString()}`;
}

export default function GlobalNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bindings } = useKeyboardShortcuts();
  const [isVisible, setIsVisible] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const handledFocusTransitionsRef = useRef<Set<string>>(new Set());
  const lastScrollYRef = useRef(0);
  const [draftQuery, setDraftQuery] = useState('');
  const [draftMode, setDraftMode] = useState({
    matchCase: false,
    wholeWord: true,
    fuzzy: false,
  });

  const isHomePage = location.pathname === '/';
  const shouldShowHeaderSearch = !isHomePage;
  const isSearchPage = location.pathname === '/search';
  useShortcutSearchInputRegistration(searchRef, shouldShowHeaderSearch);

  const routeSearchState = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const fuzzy = params.get('fuzzy') === '1';
    return {
      q: params.get('q') ?? '',
      matchCase: !fuzzy && params.get('matchCase') === '1',
      wholeWord: !fuzzy && parseWholeWordParam(params.get('wholeWord')),
      fuzzy,
    };
  }, [location.search]);

  useEffect(() => {
    setDraftQuery(routeSearchState.q);
    setDraftMode({
      matchCase: routeSearchState.matchCase,
      wholeWord: routeSearchState.wholeWord,
      fuzzy: routeSearchState.fuzzy,
    });
  }, [routeSearchState.fuzzy, routeSearchState.matchCase, routeSearchState.q, routeSearchState.wholeWord]);

  const transitionState = isSearchPage && isSearchAutofocusTransitionState(location.state) ? location.state : null;

  useEffect(() => {
    if (!transitionState) {
      return;
    }

    if (handledFocusTransitionsRef.current.has(transitionState.requestId)) {
      return;
    }

    const input = searchRef.current;
    if (!input) {
      return;
    }

    handledFocusTransitionsRef.current.add(transitionState.requestId);
    const maxCaret = input.value.length;
    const caret = isHomeSearchTransitionState(transitionState)
      ? transitionState.caret ?? maxCaret
      : maxCaret;
    const numericCaret = typeof caret === 'number' && Number.isFinite(caret)
      ? Math.floor(caret)
      : maxCaret;
    const safeCaret = Math.max(0, Math.min(numericCaret, maxCaret));

    const applyFocus = () => {
      input.focus({ preventScroll: true });
      input.setSelectionRange(safeCaret, safeCaret);
    };

    if (typeof window.requestAnimationFrame === 'function') {
      const rafId = window.requestAnimationFrame(applyFocus);
      return () => window.cancelAnimationFrame(rafId);
    }

    applyFocus();
    return undefined;
  }, [location.key, transitionState]);

  const updateSearchRouteParams = useCallback((
    patch: Partial<{ q: string; matchCase: boolean; wholeWord: boolean; fuzzy: boolean }>,
    options?: { clearPage?: boolean },
  ) => {
    const next = new URLSearchParams(location.search);
    const hasPatch = (key: 'q' | 'matchCase' | 'wholeWord' | 'fuzzy'): boolean => Object.prototype.hasOwnProperty.call(patch, key);

    if (hasPatch('q')) {
      const value = patch.q ?? '';
      if (value.length === 0) {
        next.delete('q');
      } else {
        next.set('q', value);
      }
    }

    const currentFuzzy = next.get('fuzzy') === '1';
    const currentMatchCase = next.get('matchCase') === '1';
    const currentWholeWord = parseWholeWordParam(next.get('wholeWord'));
    const shouldRewriteStrictMode = hasPatch('matchCase') || hasPatch('wholeWord') || hasPatch('fuzzy');

    if (shouldRewriteStrictMode) {
      let nextMatchCase = hasPatch('matchCase') ? Boolean(patch.matchCase) : currentMatchCase;
      let nextWholeWord = hasPatch('wholeWord') ? Boolean(patch.wholeWord) : currentWholeWord;
      const nextFuzzy = hasPatch('fuzzy') ? Boolean(patch.fuzzy) : currentFuzzy;

      if (nextFuzzy) {
        nextMatchCase = false;
        nextWholeWord = false;
      } else if (hasPatch('fuzzy') && !nextMatchCase && !nextWholeWord) {
        nextWholeWord = true;
      }

      if (nextFuzzy) {
        next.set('fuzzy', '1');
      } else {
        next.delete('fuzzy');
      }

      if (nextMatchCase) {
        next.set('matchCase', '1');
      } else {
        next.delete('matchCase');
      }

      next.set('wholeWord', nextWholeWord ? '1' : '0');
    }

    if (options?.clearPage) {
      next.delete('page');
    }

    const search = next.toString();
    navigate({
      pathname: '/search',
      search: search ? `?${search}` : '',
    });
  }, [location.search, navigate]);

  const navigateToSearchFromNonSearchRoute = useCallback((
    query: string,
    mode: { matchCase: boolean; wholeWord: boolean; fuzzy: boolean },
  ): boolean => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return false;
    }

    navigate(buildCanonicalSearchHref(trimmedQuery, mode));
    return true;
  }, [navigate]);

  const handleQueryChange = useCallback((value: string, isComposing: boolean) => {
    setDraftQuery(value);
    if (isComposing) {
      return;
    }

    if (!getInstantSearchEnabled()) {
      return;
    }

    if (isSearchPage) {
      updateSearchRouteParams({ q: value }, { clearPage: true });
      return;
    }

    navigateToSearchFromNonSearchRoute(value, draftMode);
  }, [draftMode, isSearchPage, navigateToSearchFromNonSearchRoute, updateSearchRouteParams]);

  const handleQueryExecute = useCallback((value: string) => {
    if (isSearchPage) {
      updateSearchRouteParams({ q: value }, { clearPage: true });
      return value.trim().length > 0;
    }

    return navigateToSearchFromNonSearchRoute(value, draftMode);
  }, [draftMode, isSearchPage, navigateToSearchFromNonSearchRoute, updateSearchRouteParams]);

  const handleToggleMatchCase = useCallback(() => {
    if (draftMode.fuzzy) {
      return;
    }

    const nextMode = {
      ...draftMode,
      matchCase: !draftMode.matchCase,
    };
    setDraftMode(nextMode);

    if (isSearchPage) {
      updateSearchRouteParams({ matchCase: nextMode.matchCase }, { clearPage: true });
      return;
    }

    if (getInstantSearchEnabled()) {
      navigateToSearchFromNonSearchRoute(draftQuery, nextMode);
    }
  }, [draftMode, draftQuery, isSearchPage, navigateToSearchFromNonSearchRoute, updateSearchRouteParams]);

  const handleToggleWholeWord = useCallback(() => {
    if (draftMode.fuzzy) {
      return;
    }

    const nextMode = {
      ...draftMode,
      wholeWord: !draftMode.wholeWord,
    };
    setDraftMode(nextMode);

    if (isSearchPage) {
      updateSearchRouteParams({ wholeWord: nextMode.wholeWord }, { clearPage: true });
      return;
    }

    if (getInstantSearchEnabled()) {
      navigateToSearchFromNonSearchRoute(draftQuery, nextMode);
    }
  }, [draftMode, draftQuery, isSearchPage, navigateToSearchFromNonSearchRoute, updateSearchRouteParams]);

  const handleToggleFuzzy = useCallback(() => {
    const nextFuzzy = !draftMode.fuzzy;
    let nextMatchCase = draftMode.matchCase;
    let nextWholeWord = draftMode.wholeWord;

    if (nextFuzzy) {
      nextMatchCase = false;
      nextWholeWord = false;
    } else if (!nextMatchCase && !nextWholeWord) {
      nextWholeWord = true;
    }

    const nextMode = {
      matchCase: nextMatchCase,
      wholeWord: nextWholeWord,
      fuzzy: nextFuzzy,
    };
    setDraftMode(nextMode);

    if (isSearchPage) {
      updateSearchRouteParams({
        matchCase: nextMatchCase,
        wholeWord: nextWholeWord,
        fuzzy: nextFuzzy,
      }, { clearPage: true });
      return;
    }

    if (getInstantSearchEnabled()) {
      navigateToSearchFromNonSearchRoute(draftQuery, nextMode);
    }
  }, [draftMode.fuzzy, draftMode.matchCase, draftMode.wholeWord, draftQuery, isSearchPage, navigateToSearchFromNonSearchRoute, updateSearchRouteParams]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;

      if (currentScrollY <= 0 || currentScrollY < MIN_SCROLL_TO_HIDE) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY + SCROLL_DELTA_THRESHOLD) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY - SCROLL_DELTA_THRESHOLD) {
        setIsVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={[
        'sticky top-0 z-40 border-b border-border-subtle bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85',
        'transition-transform duration-200 ease-out will-change-transform',
        isVisible ? 'translate-y-0' : '-translate-y-full',
      ].join(' ')}
    >
      <div className={`mx-auto w-full max-w-[1200px] px-6 py-3 ${shouldShowHeaderSearch ? 'grid grid-cols-[auto,minmax(0,1fr),auto] items-center gap-8' : 'flex items-center justify-end'}`}>
        {shouldShowHeaderSearch && (
          <NavLink
            to="/"
            className="shrink-0 transition-opacity hover:opacity-80"
            aria-label="the table search"
          >
            <div className="flex items-center gap-4 sm:gap-3">
              <img
                src={getLogoUrl()}
                alt="the table search"
                className="h-7 w-7"
                loading="eager"
                decoding="async"
              />
              <h1 className="font-sans text-xl font-medium tracking-tight text-foreground sm:text-2xl">
                the table search
              </h1>
            </div>
          </NavLink>
        )}

        {shouldShowHeaderSearch && (
          <div className="ml-auto w-full max-w-[720px]">
            <UnifiedSearchInput
              query={draftQuery}
              shortcutLabel={formatShortcutKey(bindings.focus_search)}
              instantSearchEnabled={getInstantSearchEnabled()}
              matchCase={draftMode.matchCase}
              wholeWord={draftMode.wholeWord}
              fuzzy={draftMode.fuzzy}
              onQueryChange={(value, meta) => handleQueryChange(value, meta.isComposing)}
              onExecuteQuery={(value) => handleQueryExecute(value)}
              onToggleMatchCase={handleToggleMatchCase}
              onToggleWholeWord={handleToggleWholeWord}
              onToggleFuzzy={handleToggleFuzzy}
              inputRef={searchRef}
              placeholder="search sermons ..."
              containerClassName="relative flex h-10 items-center rounded-md border border-border-subtle bg-bg-muted pl-2 pr-1"
              inputClassName="h-full flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              shortcutClassName="px-2 font-mono text-base text-muted-foreground"
              toggleContainerClassName="ml-2 flex items-center gap-1"
            />
          </div>
        )}

        <nav className="flex shrink-0 items-center gap-6">
          <NavLink to="/books" className={navLinkClassName}>
            books <kbd className="rounded border border-border bg-muted px-1 text-[11px]">{formatShortcutKey(bindings.open_books)}</kbd>
          </NavLink>
          <NavLink to="/settings" className={navLinkClassName}>
            settings <kbd className="rounded border border-border bg-muted px-1 text-[11px]">{formatShortcutKey(bindings.open_settings)}</kbd>
          </NavLink>
          <NavLink to="/about" className={navLinkClassName}>
            about
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

import { createSearchReturnState, type SearchReturnState } from '@/lib/searchNavigation';

export interface AdjacentSermonHit {
  id: string;
  title: string;
  date: string;
}

export interface SermonHitNavigationContext {
  searchQuery: string;
  fuzzy: boolean;
  matchCase: boolean;
  wholeWord: boolean;
  searchReturnTo: string | null;
}

export interface AdjacentHitNavigationTarget {
  href: string;
  state?: SearchReturnState;
}

export interface AdjacentHitNavigationHandlers {
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  navigatePrev: () => boolean;
  navigateNext: () => boolean;
}

export interface AdjacentHitNavigationHandlerOptions {
  prev: AdjacentSermonHit | null;
  next: AdjacentSermonHit | null;
  context: SermonHitNavigationContext;
  navigate: (target: AdjacentHitNavigationTarget) => void;
}

export function buildAdjacentSermonHitHref(
  sermonId: string,
  context: SermonHitNavigationContext,
): string {
  const params = new URLSearchParams();

  const trimmedQuery = context.searchQuery.trim();
  if (trimmedQuery) {
    params.set('q', trimmedQuery);
  }

  if (context.fuzzy) {
    params.set('fuzzy', '1');
  } else {
    if (context.matchCase) {
      params.set('matchCase', '1');
    }
    params.set('wholeWord', context.wholeWord ? '1' : '0');
  }

  const queryString = params.toString();
  return queryString ? `/sermons/${sermonId}?${queryString}` : `/sermons/${sermonId}`;
}

export function buildAdjacentSermonHitTarget(
  sermon: AdjacentSermonHit | null,
  context: SermonHitNavigationContext,
): AdjacentHitNavigationTarget | null {
  if (!sermon) {
    return null;
  }

  const target: AdjacentHitNavigationTarget = {
    href: buildAdjacentSermonHitHref(sermon.id, context),
  };

  const searchReturnState = context.searchReturnTo
    ? createSearchReturnState(context.searchReturnTo)
    : null;

  if (searchReturnState) {
    target.state = searchReturnState;
  }

  return target;
}

export function createAdjacentSermonHitNavigationHandlers({
  prev,
  next,
  context,
  navigate,
}: AdjacentHitNavigationHandlerOptions): AdjacentHitNavigationHandlers {
  const navigatePrev = (): boolean => {
    const target = buildAdjacentSermonHitTarget(prev, context);
    if (!target) {
      return false;
    }

    navigate(target);
    return true;
  };

  const navigateNext = (): boolean => {
    const target = buildAdjacentSermonHitTarget(next, context);
    if (!target) {
      return false;
    }

    navigate(target);
    return true;
  };

  return {
    canNavigatePrev: prev != null,
    canNavigateNext: next != null,
    navigatePrev,
    navigateNext,
  };
}

export interface ScrollToTopOptions {
  behavior?: ScrollBehavior;
  scroll?: (options: ScrollToOptions) => void;
}

export function scrollSermonDetailToTop(options: ScrollToTopOptions = {}): boolean {
  const behavior = options.behavior ?? 'smooth';
  const scroll = options.scroll ?? (typeof window !== 'undefined' ? window.scrollTo.bind(window) : null);
  if (!scroll) {
    return false;
  }

  scroll({
    top: 0,
    left: 0,
    behavior,
  });

  return true;
}

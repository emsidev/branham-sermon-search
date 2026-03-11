import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createHitNavigationKeyHandler } from './createHitNavigationKeyHandler';
import { createHitNavigator } from './createHitNavigator';
import type { UseS02HitNavigationOptions, UseS02HitNavigationResult } from './types';

const MATCH_SELECTOR = '[data-search-match="true"]';

function scrollToMatch(
  matches: HTMLElement[],
  index: number,
  behavior: ScrollBehavior,
): void {
  const match = matches[index];
  if (!match) {
    return;
  }

  match.scrollIntoView({
    behavior,
    block: 'center',
  });
}

export function useS02HitNavigation({
  containerRef,
  enabled,
  initialIndex = -1,
  scrollBehavior = 'smooth',
}: UseS02HitNavigationOptions): UseS02HitNavigationResult {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [totalHits, setTotalHits] = useState(0);
  const activeIndexRef = useRef(-1);
  const matchesRef = useRef<HTMLElement[]>([]);

  const collectMatches = useCallback((): HTMLElement[] => {
    if (!enabled) {
      return [];
    }

    const container = containerRef.current;
    if (!container) {
      return [];
    }

    return Array.from(container.querySelectorAll<HTMLElement>(MATCH_SELECTOR));
  }, [containerRef, enabled]);

  const commitState = useCallback((
    matches: HTMLElement[],
    nextIndex: number,
    shouldScroll: boolean,
  ): number => {
    const navigator = createHitNavigator(matches.length);
    const normalizedIndex = navigator.normalizeIndex(nextIndex);

    matchesRef.current = matches;
    activeIndexRef.current = normalizedIndex;
    setTotalHits(matches.length);
    setActiveIndex(normalizedIndex);

    if (shouldScroll && normalizedIndex !== -1) {
      scrollToMatch(matches, normalizedIndex, scrollBehavior);
    }

    return normalizedIndex;
  }, [scrollBehavior]);

  const refreshMatches = useCallback((preferInitialIndex: boolean): number => {
    const matches = collectMatches();
    const navigator = createHitNavigator(matches.length);
    const preferredIndex = navigator.normalizeIndex(initialIndex);
    let nextIndex = navigator.normalizeIndex(activeIndexRef.current);

    if (preferInitialIndex) {
      nextIndex = preferredIndex;
    } else if (nextIndex === -1 && preferredIndex !== -1) {
      nextIndex = preferredIndex;
    }

    const shouldScroll = nextIndex !== -1
      && (preferInitialIndex || nextIndex !== activeIndexRef.current);

    return commitState(matches, nextIndex, shouldScroll);
  }, [collectMatches, commitState, initialIndex]);

  const goNext = useCallback((): number => {
    const matches = collectMatches();
    const navigator = createHitNavigator(matches.length);
    const nextIndex = navigator.getNextIndex(activeIndexRef.current);
    return commitState(matches, nextIndex, true);
  }, [collectMatches, commitState]);

  const goPrev = useCallback((): number => {
    const matches = collectMatches();
    const navigator = createHitNavigator(matches.length);
    const prevIndex = navigator.getPrevIndex(activeIndexRef.current);
    return commitState(matches, prevIndex, true);
  }, [collectMatches, commitState]);

  const handleKeyDown = useCallback((event: KeyboardEvent): void => {
    if (!enabled) {
      return;
    }

    const command = createHitNavigationKeyHandler({
      key: event.key,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      target: event.target,
    });

    if (!command) {
      return;
    }

    event.preventDefault();
    if (command === 'next') {
      goNext();
      return;
    }

    goPrev();
  }, [enabled, goNext, goPrev]);

  useEffect(() => {
    refreshMatches(true);
  }, [refreshMatches]);

  useEffect(() => {
    if (!enabled || typeof MutationObserver === 'undefined') {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new MutationObserver(() => {
      refreshMatches(false);
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [containerRef, enabled, refreshMatches]);

  return useMemo(() => ({
    activeIndex,
    totalHits,
    goNext,
    goPrev,
    handleKeyDown,
  }), [activeIndex, totalHits, goNext, goPrev, handleKeyDown]);
}

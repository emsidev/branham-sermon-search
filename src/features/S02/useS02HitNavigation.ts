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
  resetKey,
  hitCycleKey = 'n',
  sermonCycleKey = 'm',
  onNextSermon,
  onPrevSermon,
}: UseS02HitNavigationOptions): UseS02HitNavigationResult {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [totalHits, setTotalHits] = useState(0);
  const activeIndexRef = useRef(-1);
  const totalHitsRef = useRef(0);
  const matchesRef = useRef<HTMLElement[]>([]);
  const scheduledRefreshFrameRef = useRef<number | null>(null);

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
    const previousActiveIndex = activeIndexRef.current;
    const previousTotalHits = totalHitsRef.current;
    const shouldUpdateActiveIndex = previousActiveIndex !== normalizedIndex;
    const shouldUpdateTotalHits = previousTotalHits !== matches.length;

    matchesRef.current = matches;
    if (shouldUpdateActiveIndex) {
      activeIndexRef.current = normalizedIndex;
      setActiveIndex(normalizedIndex);
    }
    if (shouldUpdateTotalHits) {
      totalHitsRef.current = matches.length;
      setTotalHits(matches.length);
    }

    if (shouldScroll && normalizedIndex !== -1 && (shouldUpdateActiveIndex || shouldUpdateTotalHits)) {
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

  const goTo = useCallback((index: number): number => {
    const matches = collectMatches();
    return commitState(matches, index, true);
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
    }, {
      hitCycleKey,
      sermonCycleKey,
    });

    if (!command) {
      return;
    }

    if (command === 'next') {
      event.preventDefault();
      goNext();
      return;
    }

    if (command === 'prev') {
      event.preventDefault();
      goPrev();
      return;
    }

    if (command === 'next_sermon') {
      if (!onNextSermon) {
        return;
      }
      event.preventDefault();
      onNextSermon();
      return;
    }

    if (!onPrevSermon) {
      return;
    }

    event.preventDefault();
    onPrevSermon();
  }, [enabled, goNext, goPrev, hitCycleKey, onNextSermon, onPrevSermon, sermonCycleKey]);

  useEffect(() => {
    refreshMatches(true);
  }, [refreshMatches, resetKey]);

  useEffect(() => {
    if (!enabled || typeof MutationObserver === 'undefined') {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (scheduledRefreshFrameRef.current != null) {
        return;
      }

      const flushRefresh = () => {
        scheduledRefreshFrameRef.current = null;
        refreshMatches(false);
      };

      if (typeof window.requestAnimationFrame === 'function') {
        scheduledRefreshFrameRef.current = window.requestAnimationFrame(flushRefresh);
        return;
      }

      flushRefresh();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      if (scheduledRefreshFrameRef.current != null) {
        window.cancelAnimationFrame(scheduledRefreshFrameRef.current);
        scheduledRefreshFrameRef.current = null;
      }
      observer.disconnect();
    };
  }, [containerRef, enabled, refreshMatches]);

  return useMemo(() => ({
    activeIndex,
    totalHits,
    goNext,
    goPrev,
    goTo,
    handleKeyDown,
  }), [activeIndex, totalHits, goNext, goPrev, goTo, handleKeyDown]);
}

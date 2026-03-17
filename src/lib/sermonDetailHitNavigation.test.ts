import { describe, expect, it, vi } from 'vitest';
import {
  buildAdjacentSermonHitHref,
  buildAdjacentSermonHitTarget,
  createAdjacentSermonHitNavigationHandlers,
  scrollSermonDetailToTop,
  type SermonHitNavigationContext,
} from './sermonDetailHitNavigation';

const strictContext: SermonHitNavigationContext = {
  searchQuery: 'only believe',
  fuzzy: false,
  matchCase: true,
  wholeWord: true,
  searchReturnTo: '/search?q=only+believe&sort=date-desc&view=table&page=4',
};

describe('sermonDetailHitNavigation', () => {
  it('builds strict adjacent sermon URLs and preserves strict search flags', () => {
    const href = buildAdjacentSermonHitHref('sermon-2', strictContext);
    expect(href).toBe('/sermons/sermon-2?q=only+believe&matchCase=1&wholeWord=1');
  });

  it('builds fuzzy adjacent sermon URLs without strict flags', () => {
    const href = buildAdjacentSermonHitHref('sermon-2', {
      ...strictContext,
      fuzzy: true,
      matchCase: true,
      wholeWord: true,
    });

    expect(href).toBe('/sermons/sermon-2?q=only+believe&fuzzy=1');
  });

  it('builds adjacent navigation target with searchReturnTo state when present', () => {
    const target = buildAdjacentSermonHitTarget(
      { id: 'sermon-2', title: 'Next Sermon', date: '1965-10-11' },
      strictContext,
    );

    expect(target).toEqual({
      href: '/sermons/sermon-2?q=only+believe&matchCase=1&wholeWord=1',
      state: {
        searchReturnTo: '/search?q=only+believe&sort=date-desc&view=table&page=4',
      },
    });
  });

  it('creates no navigation target when no adjacent sermon is available', () => {
    expect(buildAdjacentSermonHitTarget(null, strictContext)).toBeNull();
  });

  it('does not wrap next/prev navigation when adjacent sermon is unavailable', () => {
    const navigate = vi.fn();
    const handlers = createAdjacentSermonHitNavigationHandlers({
      prev: null,
      next: null,
      context: strictContext,
      navigate,
    });

    expect(handlers.canNavigatePrev).toBe(false);
    expect(handlers.canNavigateNext).toBe(false);
    expect(handlers.navigatePrev()).toBe(false);
    expect(handlers.navigateNext()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates to available adjacent sermon hit targets', () => {
    const navigate = vi.fn();
    const handlers = createAdjacentSermonHitNavigationHandlers({
      prev: { id: 'sermon-0', title: 'Prev Sermon', date: '1965-10-09' },
      next: { id: 'sermon-2', title: 'Next Sermon', date: '1965-10-11' },
      context: strictContext,
      navigate,
    });

    expect(handlers.canNavigatePrev).toBe(true);
    expect(handlers.canNavigateNext).toBe(true);
    expect(handlers.navigateNext()).toBe(true);
    expect(handlers.navigatePrev()).toBe(true);

    expect(navigate).toHaveBeenNthCalledWith(1, {
      href: '/sermons/sermon-2?q=only+believe&matchCase=1&wholeWord=1',
      state: {
        searchReturnTo: '/search?q=only+believe&sort=date-desc&view=table&page=4',
      },
    });

    expect(navigate).toHaveBeenNthCalledWith(2, {
      href: '/sermons/sermon-0?q=only+believe&matchCase=1&wholeWord=1',
      state: {
        searchReturnTo: '/search?q=only+believe&sort=date-desc&view=table&page=4',
      },
    });
  });

  it('scrolls to the top with smooth behavior by default', () => {
    const scroll = vi.fn();
    const scrolled = scrollSermonDetailToTop({ scroll });

    expect(scrolled).toBe(true);
    expect(scroll).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  });

  it('supports custom top-scroll behavior', () => {
    const scroll = vi.fn();
    const scrolled = scrollSermonDetailToTop({ behavior: 'auto', scroll });

    expect(scrolled).toBe(true);
    expect(scroll).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  });
});

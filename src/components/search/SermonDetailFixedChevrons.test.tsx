import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SermonDetailFixedChevrons from './SermonDetailFixedChevrons';
import {
  buildAdjacentSermonHitTarget,
  createAdjacentSermonHitNavigationHandlers,
  type SermonHitNavigationContext,
} from '@/lib/sermonDetailHitNavigation';

const navigationContext: SermonHitNavigationContext = {
  searchQuery: 'only believe',
  fuzzy: false,
  matchCase: false,
  wholeWord: true,
  searchReturnTo: '/search?q=only+believe&sort=date-desc&view=table&page=4',
};

function setWindowScrollY(value: number): void {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value,
  });
}

describe('SermonDetailFixedChevrons', () => {
  it('renders fixed-position left, right, and top chevrons', () => {
    render(
      <SermonDetailFixedChevrons
        canNavigatePrev
        canNavigateNext
        onNavigatePrev={vi.fn()}
        onNavigateNext={vi.fn()}
        onJumpToTop={vi.fn()}
      />,
    );

    expect(screen.getByTestId('sermon-detail-fixed-prev-chevron')).toHaveClass('fixed');
    expect(screen.getByTestId('sermon-detail-fixed-next-chevron')).toHaveClass('fixed');
    expect(screen.getByTestId('sermon-detail-fixed-top-chevron')).toHaveClass('fixed');
  });

  it('only allows left/right navigation when adjacent sermons are available', () => {
    const onNavigatePrev = vi.fn();
    const onNavigateNext = vi.fn();

    render(
      <SermonDetailFixedChevrons
        canNavigatePrev={false}
        canNavigateNext
        onNavigatePrev={onNavigatePrev}
        onNavigateNext={onNavigateNext}
        onJumpToTop={vi.fn()}
      />,
    );

    const prevButton = screen.getByRole('button', { name: 'Previous sermon hit' });
    const nextButton = screen.getByRole('button', { name: 'Next sermon hit' });

    fireEvent.click(prevButton);
    fireEvent.click(nextButton);

    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();
    expect(onNavigatePrev).not.toHaveBeenCalled();
    expect(onNavigateNext).toHaveBeenCalledTimes(1);
  });

  it('uses the same next/prev sermon-hit navigation handler path for fixed chevrons', () => {
    const navigate = vi.fn();
    const handlers = createAdjacentSermonHitNavigationHandlers({
      prev: { id: 'sermon-0', title: 'Prev Sermon', date: '1965-10-09' },
      next: { id: 'sermon-2', title: 'Next Sermon', date: '1965-10-11' },
      context: navigationContext,
      navigate,
    });

    render(
      <SermonDetailFixedChevrons
        canNavigatePrev={handlers.canNavigatePrev}
        canNavigateNext={handlers.canNavigateNext}
        onNavigatePrev={handlers.navigatePrev}
        onNavigateNext={handlers.navigateNext}
        onJumpToTop={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next sermon hit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous sermon hit' }));

    expect(navigate).toHaveBeenNthCalledWith(
      1,
      buildAdjacentSermonHitTarget(
        { id: 'sermon-2', title: 'Next Sermon', date: '1965-10-11' },
        navigationContext,
      ),
    );
    expect(navigate).toHaveBeenNthCalledWith(
      2,
      buildAdjacentSermonHitTarget(
        { id: 'sermon-0', title: 'Prev Sermon', date: '1965-10-09' },
        navigationContext,
      ),
    );
  });

  it('runs jump-to-top callback from up chevron', () => {
    const onJumpToTop = vi.fn();

    render(
      <SermonDetailFixedChevrons
        canNavigatePrev={false}
        canNavigateNext={false}
        onNavigatePrev={vi.fn()}
        onNavigateNext={vi.fn()}
        onJumpToTop={onJumpToTop}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Jump to top' }));
    expect(onJumpToTop).toHaveBeenCalledTimes(1);
  });

  it('hides on downward scroll and reveals on upward scroll', () => {
    setWindowScrollY(0);
    render(
      <SermonDetailFixedChevrons
        canNavigatePrev
        canNavigateNext
        onNavigatePrev={vi.fn()}
        onNavigateNext={vi.fn()}
        onJumpToTop={vi.fn()}
      />,
    );

    const prev = screen.getByRole('button', { name: 'Previous sermon hit' });
    expect(prev).toHaveClass('opacity-100');

    setWindowScrollY(240);
    fireEvent.scroll(window);
    expect(prev).toHaveClass('opacity-0');
    expect(prev).toHaveClass('pointer-events-none');

    setWindowScrollY(160);
    fireEvent.scroll(window);
    expect(prev).toHaveClass('opacity-100');
    expect(prev).toHaveClass('pointer-events-auto');
  });

  it('reveals while near the top even after downward scrolling', () => {
    setWindowScrollY(0);
    render(
      <SermonDetailFixedChevrons
        canNavigatePrev
        canNavigateNext
        onNavigatePrev={vi.fn()}
        onNavigateNext={vi.fn()}
        onJumpToTop={vi.fn()}
      />,
    );

    const next = screen.getByRole('button', { name: 'Next sermon hit' });
    setWindowScrollY(220);
    fireEvent.scroll(window);
    expect(next).toHaveClass('opacity-0');

    setWindowScrollY(40);
    fireEvent.scroll(window);
    expect(next).toHaveClass('opacity-100');
  });

  it('still hides right chevron on downward scroll even when it is disabled', () => {
    setWindowScrollY(0);
    render(
      <SermonDetailFixedChevrons
        canNavigatePrev
        canNavigateNext={false}
        onNavigatePrev={vi.fn()}
        onNavigateNext={vi.fn()}
        onJumpToTop={vi.fn()}
      />,
    );

    const next = screen.getByRole('button', { name: 'Next sermon hit' });
    expect(next).toBeDisabled();
    expect(next).toHaveClass('opacity-100');

    setWindowScrollY(220);
    fireEvent.scroll(window);
    expect(next).toHaveClass('opacity-0');
    expect(next).toHaveClass('pointer-events-none');
  });
});

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';

export interface SermonDetailFixedChevronsProps {
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onJumpToTop: () => void;
}

const SCROLL_DELTA_THRESHOLD = 4;
const REVEAL_NEAR_TOP_PX = 72;

function baseButtonClasses(disabled: boolean): string {
  const disabledClasses = disabled
    ? 'cursor-not-allowed disabled:border-border/70 disabled:bg-background/90 disabled:text-foreground/40'
    : 'hover:border-foreground/45 hover:bg-card';

  return `flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${disabledClasses}`;
}

export default function SermonDetailFixedChevrons({
  canNavigatePrev,
  canNavigateNext,
  onNavigatePrev,
  onNavigateNext,
  onJumpToTop,
}: SermonDetailFixedChevronsProps) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY ?? 0;

    const handleScroll = () => {
      const currentY = window.scrollY ?? 0;
      const delta = currentY - lastScrollYRef.current;

      if (Math.abs(delta) < SCROLL_DELTA_THRESHOLD) {
        return;
      }

      if (currentY <= REVEAL_NEAR_TOP_PX || delta < 0) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const visibilityClasses = isVisible
    ? 'opacity-100 pointer-events-auto'
    : 'opacity-0 pointer-events-none';

  return (
    <>
      <button
        type="button"
        aria-label="Previous sermon hit"
        title="Previous sermon hit"
        data-testid="sermon-detail-fixed-prev-chevron"
        disabled={!canNavigatePrev}
        onClick={() => {
          if (canNavigatePrev) {
            onNavigatePrev();
          }
        }}
        className={`fixed left-4 top-1/2 z-40 -translate-y-1/2 sm:left-6 lg:left-[max(1rem,calc(50%-32rem))] ${isVisible ? 'translate-x-0' : '-translate-x-2'} ${baseButtonClasses(!canNavigatePrev)} ${visibilityClasses}`}
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        aria-label="Next sermon hit"
        title="Next sermon hit"
        data-testid="sermon-detail-fixed-next-chevron"
        disabled={!canNavigateNext}
        onClick={() => {
          if (canNavigateNext) {
            onNavigateNext();
          }
        }}
        className={`fixed right-4 top-1/2 z-40 -translate-y-1/2 sm:right-6 lg:right-[max(1rem,calc(50%-32rem))] ${isVisible ? 'translate-x-0' : 'translate-x-2'} ${baseButtonClasses(!canNavigateNext)} ${visibilityClasses}`}
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        aria-label="Jump to top"
        title="Jump to top"
        data-testid="sermon-detail-fixed-top-chevron"
        onClick={onJumpToTop}
        className={`fixed bottom-6 right-4 z-40 sm:right-6 lg:right-[max(1rem,calc(50%-32rem))] ${isVisible ? 'translate-y-0' : 'translate-y-2'} ${baseButtonClasses(false)} ${visibilityClasses}`}
      >
        <ChevronUp className="h-5 w-5" aria-hidden="true" />
      </button>
    </>
  );
}

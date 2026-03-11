import { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { formatS04ResultCount } from './formatS04ResultCount';
import type { S04SearchPopupProps } from './types';

export function S04SearchPopup({
  isOpen,
  query,
  totalResults,
  activeResultIndex,
  onQueryChange,
  onNext,
  onPrevious,
  onClose,
  shouldFocusInput = false,
  onInputFocusHandled,
  className,
}: S04SearchPopupProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasResults = totalResults > 0;

  useEffect(() => {
    if (!isOpen || !shouldFocusInput) {
      return;
    }

    const applyFocus = () => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(0, query.length);
      onInputFocusHandled?.();
    };

    if (typeof window.requestAnimationFrame === 'function') {
      const rafId = window.requestAnimationFrame(applyFocus);
      return () => window.cancelAnimationFrame(rafId);
    }

    applyFocus();
    return undefined;
  }, [isOpen, onInputFocusHandled, query.length, shouldFocusInput]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <section
      role="dialog"
      aria-label="Search popup"
      className={`fixed right-4 top-4 z-50 w-[min(calc(100vw-2rem),420px)] rounded-lg border border-border bg-popover p-3 shadow-xl ${className ?? ''}`.trim()}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-wide">Find in sermon</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-border bg-background p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close search popup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/35"
          placeholder="Find in sermon..."
          aria-label="Find in sermon"
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="font-mono text-sm text-muted-foreground" aria-live="polite">
          {formatS04ResultCount(activeResultIndex, totalResults)}
        </p>

        <div className="inline-flex items-center rounded-md border border-border bg-background p-1">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!hasResults}
            className="rounded p-2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Previous result"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasResults}
            className="rounded p-2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Next result"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default S04SearchPopup;

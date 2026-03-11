import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { formatS04ResultCount } from './formatS04ResultCount';
import type { S04SearchPopupProps } from './types';

export function S04SearchPopup({
  isOpen,
  query,
  totalResults,
  activeResultIndex,
  results = [],
  onQueryChange,
  onNext,
  onPrevious,
  onSelectResult,
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

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!hasResults) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onNext();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onPrevious();
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close search popup overlay"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Search popup"
        className={`absolute left-1/2 top-1/2 z-10 w-[min(calc(100vw-2rem),760px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover p-4 shadow-2xl ${className ?? ''}`.trim()}
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

        <div className="mt-3 flex h-11 items-center rounded-lg border border-border bg-bg-muted px-3">
          <span className="pr-3 font-mono text-base text-muted-foreground">f</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleInputKeyDown}
            className="h-full w-full bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="search sermon text ..."
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

        <div className="mt-3 max-h-[50vh] overflow-y-auto rounded-md border border-border bg-background">
          {results.length === 0 ? (
            <p className="px-3 py-4 font-mono text-xs text-muted-foreground">
              No matching text in this sermon.
            </p>
          ) : (
            <ul>
              {results.map((result) => (
                <li key={result.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onSelectResult?.(result.absoluteIndex)}
                    className={`w-full px-3 py-2 text-left ${result.isActive ? 'bg-hover-row ring-1 ring-inset ring-ring/25' : 'hover:bg-hover-row/60'}`}
                    aria-label={`Result ${result.absoluteIndex + 1}: ${result.contextLabel}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                        {result.contextLabel}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        #{result.absoluteIndex + 1}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground/90">
                      <span className="font-semibold text-foreground">{result.matchText}</span>
                      {' · '}
                      {result.preview}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export default S04SearchPopup;

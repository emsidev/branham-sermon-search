import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export interface SearchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
  className?: string;
}

export function SearchPopup({
  isOpen,
  onClose,
  children,
  className,
}: SearchPopupProps) {
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
        className={`absolute left-1/2 top-1/2 z-10 h-[min(calc(100vh-2rem),860px)] w-[min(calc(100vw-2rem),1040px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl ${className ?? ''}`.trim()}
      >
        <div className="sticky top-0 z-20 flex items-center justify-end border-b border-border-subtle bg-popover/95 px-3 py-2 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border bg-background p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close search popup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}

export default SearchPopup;

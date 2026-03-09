import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SermonPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function SermonPagination({ currentPage, totalItems, pageSize, onPageChange }: SermonPaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="w-full max-w-[860px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
      <span className="text-xs text-muted-foreground font-mono">
        Showing {from}–{to} of {totalItems} sermons
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center justify-center h-8 w-8 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground font-mono">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-8 w-8 rounded text-xs font-mono ${
                p === currentPage
                  ? 'bg-foreground text-background font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--hover-row))]'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center justify-center h-8 w-8 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

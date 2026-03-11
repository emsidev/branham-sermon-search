import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface SermonBreadcrumbProps {
  year?: number | null;
  title: string;
  rootHref?: string;
}

export default function SermonBreadcrumb({ year, title, rootHref = '/' }: SermonBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-xs font-mono text-muted-foreground overflow-hidden">
      <Link to={rootHref} className="text-link hover:underline shrink-0">the table search</Link>
      <ChevronRight className="h-3 w-3 shrink-0" />
      {year && (
        <>
          <Link to={`/?year=${year}`} className="text-link hover:underline shrink-0">{year}</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
        </>
      )}
      <span className="text-foreground truncate">{title}</span>
    </nav>
  );
}

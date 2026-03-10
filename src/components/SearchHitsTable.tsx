import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import type { SearchHit } from '@/hooks/useSermons';
import {
  buildSermonHitHref,
  extractQueryTerms,
  formatMatchSourceLabel,
  resolveHighlightTermsForText,
  sanitizeSearchSnippet,
  splitTextByTerms,
} from '@/lib/search';

interface SearchHitsTableProps {
  hits: SearchHit[];
  loading: boolean;
  selectedIndex: number;
  query: string;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      <td className="py-3 px-4"><div className="skeleton-shimmer h-4 w-full rounded" /></td>
      <td className="py-3 px-4 hidden sm:table-cell"><div className="skeleton-shimmer h-4 w-20 rounded" /></td>
      <td className="py-3 px-4 hidden md:table-cell"><div className="skeleton-shimmer h-4 w-28 rounded" /></td>
      <td className="py-3 px-4 hidden lg:table-cell"><div className="skeleton-shimmer h-4 w-24 rounded" /></td>
      <td className="py-3 px-4 hidden xl:table-cell"><div className="skeleton-shimmer h-4 w-20 rounded" /></td>
      <td className="py-3 px-4 hidden xl:table-cell"><div className="skeleton-shimmer h-4 w-20 rounded" /></td>
    </tr>
  );
}

export default function SearchHitsTable({ hits, loading, selectedIndex, query }: SearchHitsTableProps) {
  const navigate = useNavigate();
  const queryTerms = React.useMemo(() => extractQueryTerms(query), [query]);

  if (!loading && hits.length === 0) {
    return (
      <div className="w-full max-w-[860px] mx-auto py-16 text-center">
        <p className="text-muted-foreground font-mono text-sm">No search hits found.</p>
        <p className="text-muted-foreground text-xs mt-2">Try a broader phrase or remove filters.</p>
      </div>
    );
  }

  return (
    <div className="surface-card w-full max-w-[860px] mx-auto overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Match</span>
            </th>
            <th className="text-left py-3 px-4 hidden sm:table-cell">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Code</span>
            </th>
            <th className="text-left py-3 px-4 hidden md:table-cell">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Title</span>
            </th>
            <th className="text-left py-3 px-4 hidden lg:table-cell">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Date</span>
            </th>
            <th className="text-left py-3 px-4 hidden xl:table-cell">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Location</span>
            </th>
            <th className="text-left py-3 px-4 hidden xl:table-cell">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Paragraph/Source</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            : hits.map((hit, i) => {
                const hitHref = buildSermonHitHref({
                  sermonId: hit.sermon_id,
                  query,
                  matchSource: hit.match_source,
                  paragraphNumber: hit.paragraph_number,
                  hitId: hit.hit_id,
                });

                return (
                  <tr
                    key={hit.hit_id}
                    className={`border-b border-border sermon-row-hover cursor-pointer ${i === selectedIndex ? 'bg-hover-row ring-1 ring-inset ring-ring/20' : ''}`}
                    role="link"
                    tabIndex={0}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest('a')) {
                        return;
                      }
                      navigate(hitHref);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') {
                        return;
                      }

                      event.preventDefault();
                      navigate(hitHref);
                    }}
                  >
                    <td className="py-3 px-4 text-xs leading-relaxed text-foreground">
                      <div className="mb-2 flex items-center gap-2 md:hidden">
                        <span className="font-mono text-xs font-semibold text-foreground">{hit.title}</span>
                      </div>
                      {renderHighlightedSnippet(hit.snippet, queryTerms)}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground text-xs font-mono whitespace-nowrap">
                      {hit.sermon_code}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Link
                          to={hitHref}
                          className="font-medium text-foreground transition-colors duration-200 hover:text-link"
                        >
                          {hit.title}
                        </Link>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground text-xs font-mono whitespace-nowrap">
                      {formatDate(hit.date)}
                    </td>
                    <td className="py-3 px-4 hidden xl:table-cell text-muted-foreground text-xs">
                      {hit.location || '-'}
                    </td>
                    <td className="py-3 px-4 hidden xl:table-cell text-muted-foreground text-xs font-mono whitespace-nowrap">
                      {formatMatchSourceLabel(
                        hit.match_source,
                        hit.paragraph_number,
                        hit.printed_paragraph_number
                      )}
                    </td>
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}

function renderHighlightedSnippet(snippet: string, queryTerms: string[]): React.ReactNode {
  const cleanedSnippet = sanitizeSearchSnippet(snippet);
  if (!queryTerms.length) {
    return cleanedSnippet || snippet;
  }

  const snippetText = cleanedSnippet || snippet;
  const effectiveTerms = resolveHighlightTermsForText(snippetText, queryTerms);
  const parts = splitTextByTerms(snippetText, effectiveTerms);

  return parts.map((part, idx) => {
    if (part.matched) {
      return <mark key={idx} className="bg-yellow-200/70 text-foreground px-0.5 rounded-sm">{part.text}</mark>;
    }
    return <React.Fragment key={idx}>{part.text}</React.Fragment>;
  });
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

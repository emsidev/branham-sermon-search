import React from 'react';
import { Link } from 'react-router-dom';
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

interface SearchHitsCardsProps {
  hits: SearchHit[];
  loading: boolean;
  selectedIndex: number;
  query: string;
}

function SkeletonCard() {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="skeleton-shimmer h-5 w-44 rounded" />
      <div className="mt-4 space-y-2">
        <div className="skeleton-shimmer h-3 w-full rounded" />
        <div className="skeleton-shimmer h-3 w-[85%] rounded" />
      </div>
      <div className="mt-4 skeleton-shimmer h-3 w-28 rounded" />
    </article>
  );
}

export default function SearchHitsCards({ hits, loading, selectedIndex, query }: SearchHitsCardsProps) {
  const queryTerms = React.useMemo(() => extractQueryTerms(query), [query]);

  if (!loading && hits.length === 0) {
    return (
      <div className="w-full py-12 text-center">
        <p className="text-sm font-mono text-muted-foreground">No search hits found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loading
        ? Array.from({ length: 5 }).map((_, index) => <SkeletonCard key={index} />)
        : hits.map((hit, index) => {
            const hitHref = buildSermonHitHref({
              sermonId: hit.sermon_id,
              query,
              matchSource: hit.match_source,
              paragraphNumber: hit.paragraph_number,
              hitId: hit.hit_id,
            });

            return (
              <Link
                key={hit.hit_id}
                to={hitHref}
                className={`group block rounded-xl border bg-card px-5 py-4 transition-colors ${
                  hit.is_exact_match ? 'border-border/80' : 'border-border'
                } ${index === selectedIndex ? 'ring-1 ring-ring/30' : 'hover:border-border/80'}`}
                style={hit.is_exact_match ? { backgroundImage: 'var(--exact-card-gradient)' } : undefined}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-mono text-lg font-semibold text-foreground transition-colors group-hover:text-[hsl(var(--link))]">
                      {hit.title}
                    </h2>
                    {hit.is_exact_match && (
                      <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-mono lowercase text-foreground">
                        exact
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground transition-colors group-hover:text-foreground">
                    open
                  </span>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  {renderHighlightedSnippet(hit.snippet, queryTerms)}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground">
                  <span>{hit.sermon_code}</span>
                  <span>{formatDate(hit.date)}</span>
                  <span>{hit.location || '-'}</span>
                  <span>{formatMatchSourceLabel(hit.match_source, hit.paragraph_number, hit.printed_paragraph_number, hit.chunk_index, hit.chunk_total)}</span>
                </div>
              </Link>
            );
          })}
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
      return <mark key={idx} className="rounded-sm bg-yellow-200/70 px-0.5 text-foreground">{part.text}</mark>;
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

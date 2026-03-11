import React from 'react';
import type { SearchHit } from '@/hooks/useSermons';
import {
  buildSermonHitHref,
  extractQueryTerms,
  formatMatchSourceLabel,
  resolveHighlightTermsForText,
  sanitizeSearchSnippet,
  splitTextByTerms,
} from '@/lib/search';
import SearchHitCard from '@/components/cards/SearchHitCard';

interface SearchHitsCardsProps {
  hits: SearchHit[];
  loading: boolean;
  selectedIndex: number;
  query: string;
  linkState?: unknown;
}

function SkeletonCard() {
  return (
    <article className="surface-card p-5">
      <div className="skeleton-shimmer h-5 w-44 rounded" />
      <div className="mt-4 space-y-2">
        <div className="skeleton-shimmer h-3 w-full rounded" />
        <div className="skeleton-shimmer h-3 w-[85%] rounded" />
      </div>
      <div className="mt-4 skeleton-shimmer h-3 w-28 rounded" />
    </article>
  );
}

export default function SearchHitsCards({
  hits,
  loading,
  selectedIndex,
  query,
  linkState,
}: SearchHitsCardsProps) {
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
              <SearchHitCard
                key={hit.hit_id}
                to={hitHref}
                linkState={linkState}
                title={hit.title}
                snippet={renderHighlightedSnippet(hit.snippet, queryTerms)}
                sermonCode={hit.sermon_code}
                location={hit.location}
                date={hit.date}
                matchLabel={formatMatchSourceLabel(
                  hit.match_source,
                  hit.paragraph_number,
                  hit.printed_paragraph_number
                )}
                tags={hit.tags}
                isExact={hit.is_exact_match}
                selected={index === selectedIndex}
              />
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

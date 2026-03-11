import React from 'react';
import { resolveHighlightTermsForText, splitTextByTerms } from '@/lib/search';

const ACTIVE_MATCH_CLASS = 'rounded-sm bg-yellow-200/70 px-0.5 text-foreground';
const DIMMED_MATCH_CLASS = 'rounded-sm bg-yellow-200/30 px-0.5 text-foreground/70';

export interface ActiveHitHighlightRenderResult {
  content: React.ReactNode;
  totalMatches: number;
  activeMatchIndex: number | null;
}

export function resolveActiveMatchIndex(
  totalMatches: number,
  requestedIndex?: number | null,
): number | null {
  if (!Number.isFinite(totalMatches) || totalMatches <= 0) {
    return null;
  }

  if (typeof requestedIndex === 'number' && Number.isFinite(requestedIndex)) {
    const normalizedIndex = Math.floor(requestedIndex);
    if (normalizedIndex >= 0 && normalizedIndex < totalMatches) {
      return normalizedIndex;
    }
  }

  return 0;
}

export function renderActiveHitHighlights(
  text: string,
  terms: string[],
  requestedActiveIndex?: number | null,
): ActiveHitHighlightRenderResult {
  if (!text) {
    return {
      content: text,
      totalMatches: 0,
      activeMatchIndex: null,
    };
  }

  const effectiveTerms = resolveHighlightTermsForText(text, terms);
  const parts = splitTextByTerms(text, effectiveTerms);
  const totalMatches = parts.reduce((count, part) => count + (part.matched ? 1 : 0), 0);

  if (totalMatches === 0) {
    return {
      content: text,
      totalMatches: 0,
      activeMatchIndex: null,
    };
  }

  const activeMatchIndex = resolveActiveMatchIndex(totalMatches, requestedActiveIndex);
  let matchIndex = 0;

  const content = parts.map((part, partIndex) => {
    if (!part.matched) {
      return <React.Fragment key={partIndex}>{part.text}</React.Fragment>;
    }

    const currentMatchIndex = matchIndex;
    const isActiveMatch = currentMatchIndex === activeMatchIndex;
    matchIndex += 1;

    return (
      <mark
        key={partIndex}
        data-search-match="true"
        data-search-match-index={String(currentMatchIndex)}
        data-search-match-active={isActiveMatch ? 'true' : 'false'}
        className={isActiveMatch ? ACTIVE_MATCH_CLASS : DIMMED_MATCH_CLASS}
      >
        {part.text}
      </mark>
    );
  });

  return {
    content,
    totalMatches,
    activeMatchIndex,
  };
}

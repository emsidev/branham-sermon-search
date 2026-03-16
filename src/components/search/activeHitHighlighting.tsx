import React from 'react';
import {
  resolveHighlightTermsForText,
  splitTextByTerms,
  type SearchMatchOptions,
} from '@/lib/search';

const ACTIVE_MATCH_CLASS = 'rounded-sm bg-yellow-200/70 px-0.5 text-foreground';
const DIMMED_MATCH_CLASS = 'rounded-sm bg-yellow-200/10 px-0.5 text-foreground/45';

export interface ActiveHitHighlightRenderResult {
  content: React.ReactNode;
  totalMatches: number;
  activeMatchIndex: number | null;
}

export interface ActiveHitHighlightOptions {
  fallbackToFirstMatch?: boolean;
  getMatchAttributes?: (matchIndex: number) => Record<string, string>;
  matchOptions?: SearchMatchOptions;
}

export function resolveActiveMatchIndex(
  totalMatches: number,
  requestedIndex?: number | null,
  options: ActiveHitHighlightOptions = {},
): number | null {
  const fallbackToFirstMatch = options.fallbackToFirstMatch ?? true;

  if (!Number.isFinite(totalMatches) || totalMatches <= 0) {
    return null;
  }

  if (typeof requestedIndex === 'number' && Number.isFinite(requestedIndex)) {
    const normalizedIndex = Math.floor(requestedIndex);
    if (normalizedIndex >= 0 && normalizedIndex < totalMatches) {
      return normalizedIndex;
    }
  }

  return fallbackToFirstMatch ? 0 : null;
}

export function renderActiveHitHighlights(
  text: string,
  terms: string[],
  requestedActiveIndex?: number | null,
  options: ActiveHitHighlightOptions = {},
): ActiveHitHighlightRenderResult {
  if (!text) {
    return {
      content: text,
      totalMatches: 0,
      activeMatchIndex: null,
    };
  }

  const effectiveTerms = resolveHighlightTermsForText(text, terms, options.matchOptions);
  const parts = splitTextByTerms(text, effectiveTerms, options.matchOptions);
  const totalMatches = parts.reduce((count, part) => count + (part.matched ? 1 : 0), 0);

  if (totalMatches === 0) {
    return {
      content: text,
      totalMatches: 0,
      activeMatchIndex: null,
    };
  }

  const activeMatchIndex = resolveActiveMatchIndex(totalMatches, requestedActiveIndex, options);
  const getMatchAttributes = options.getMatchAttributes;
  let matchIndex = 0;

  const content = parts.map((part, partIndex) => {
    if (!part.matched) {
      return <React.Fragment key={partIndex}>{part.text}</React.Fragment>;
    }

    const currentMatchIndex = matchIndex;
    const isActiveMatch = currentMatchIndex === activeMatchIndex;
    const matchAttributes = getMatchAttributes?.(currentMatchIndex) ?? {};
    matchIndex += 1;

    return (
      <mark
        key={partIndex}
        data-search-match="true"
        data-search-match-index={String(currentMatchIndex)}
        data-search-match-active={isActiveMatch ? 'true' : 'false'}
        {...matchAttributes}
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

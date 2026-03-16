import { describe, expect, it } from 'vitest';
import {
  buildSermonHitHref,
  extractHitChunkIndex,
  extractQueryTerms,
  hasNormalizedBoundedMatch,
  normalizeSearchComparableText,
  resolveHighlightTermsForText,
  sanitizeSearchSnippet,
  splitTextByTerms,
} from './search';

describe('search utilities', () => {
  it('builds canonical hit URLs with query context', () => {
    const href = buildSermonHitHref({
      sermonId: 'sermon-123',
      query: 'i am looking forward',
      matchSource: 'paragraph_text',
      paragraphNumber: 7,
      hitId: 'sermon-123:para:7:chunk:2',
    });

    expect(href).toContain('/sermons/sermon-123?');
    expect(href).toContain('q=i+am+looking+forward');
    expect(href).toContain('source=paragraph_text');
    expect(href).toContain('paragraph=7');
    expect(href).toContain('hit=sermon-123%3Apara%3A7%3Achunk%3A2');
  });

  it('includes match options in canonical hit URLs when enabled', () => {
    const href = buildSermonHitHref({
      sermonId: 'sermon-123',
      query: 'Only Believe',
      matchCase: true,
      wholeWord: true,
    });

    expect(href).toContain('matchCase=1');
    expect(href).toContain('wholeWord=1');
  });

  it('uses phrase-first highlighting terms for multi-word queries', () => {
    const terms = extractQueryTerms('i am looking forward');
    const segments = splitTextByTerms('I am looking forward to this week.', terms);
    const matched = segments.filter((segment) => segment.matched).map((segment) => segment.text.toLowerCase());

    expect(terms).toEqual(['i am looking forward', 'am', 'looking', 'forward']);
    expect(matched).toEqual(['i am looking forward']);
  });

  it('normalizes wrapped quotes and whitespace for phrase-first terms', () => {
    const terms = extractQueryTerms('   "i   am   looking   forward"  ');

    expect(terms).toEqual(['i am looking forward', 'am', 'looking', 'forward']);
  });

  it('uses phrase-only highlighting terms when phrase exists in text', () => {
    const terms = extractQueryTerms('i am looking forward');
    const resolved = resolveHighlightTermsForText(
      'Amen. I am looking forward to this week and this campaign is opening.',
      terms
    );
    const matched = splitTextByTerms('Amen. I am looking forward to this week and this campaign is opening.', resolved)
      .filter((segment) => segment.matched)
      .map((segment) => segment.text);

    expect(resolved).toEqual(['i am looking forward']);
    expect(matched).toEqual(['I am looking forward']);
  });

  it('falls back to token highlighting when phrase is not present', () => {
    const terms = extractQueryTerms('i am looking forward');
    const resolved = resolveHighlightTermsForText('I am really looking very far forward to this week.', terms);

    expect(resolved).toEqual(['am', 'looking', 'forward']);
  });

  it('does not fall back to token highlighting for phrase queries in whole-word mode', () => {
    const terms = extractQueryTerms('have faith in God');
    const resolved = resolveHighlightTermsForText(
      'God is good and have we faith enough in Him?',
      terms,
      { wholeWord: true },
    );
    const matched = splitTextByTerms(
      'God is good and have we faith enough in Him?',
      resolved,
      { wholeWord: true },
    ).filter((segment) => segment.matched);

    expect(resolved).toEqual(['have faith in God']);
    expect(matched).toHaveLength(0);
  });

  it('normalizes apostrophe variants for punctuation-insensitive matching', () => {
    expect(normalizeSearchComparableText("she's")).toBe('shes');
    expect(normalizeSearchComparableText('she\u2019s')).toBe('shes');
    expect(normalizeSearchComparableText('SHE\u2019D')).toBe('shed');
  });

  it('matches normalized bounded phrases across apostrophe variants', () => {
    expect(hasNormalizedBoundedMatch('but she\u2019s had an experience', 'shes')).toBe(true);
    expect(hasNormalizedBoundedMatch('and she\u2019d had an experience', 'shed')).toBe(true);
    expect(hasNormalizedBoundedMatch('and she\u2019d had an experience', 'she')).toBe(false);
  });

  it('supports case-sensitive bounded matching', () => {
    expect(hasNormalizedBoundedMatch('Only Believe', 'Only', { matchCase: true })).toBe(true);
    expect(hasNormalizedBoundedMatch('Only Believe', 'only', { matchCase: true })).toBe(false);
  });

  it('highlights punctuation-insensitive apostrophe variants', () => {
    const shesSegments = splitTextByTerms('But she\u2019s had an experience.', ['shes']);
    const shesMatched = shesSegments.filter((segment) => segment.matched).map((segment) => segment.text);
    expect(shesMatched).toEqual(['she\u2019s']);

    const shedSegments = splitTextByTerms("And she'd had an experience.", ['shed']);
    const shedMatched = shedSegments.filter((segment) => segment.matched).map((segment) => segment.text);
    expect(shedMatched).toEqual(["she'd"]);
  });

  it('enforces whole-word highlighting when enabled', () => {
    const partialSegments = splitTextByTerms('The promise was fulfilled within the people.', ['in'], {
      wholeWord: true,
    });
    expect(partialSegments.some((segment) => segment.matched)).toBe(false);

    const boundedSegments = splitTextByTerms('In faith we stand.', ['in'], {
      wholeWord: true,
    });
    const boundedMatched = boundedSegments.filter((segment) => segment.matched).map((segment) => segment.text);
    expect(boundedMatched).toEqual(['In']);
  });

  it('enforces case-sensitive highlighting when enabled', () => {
    const segments = splitTextByTerms('Only Believe', ['only'], { matchCase: true });
    expect(segments.some((segment) => segment.matched)).toBe(false);
  });

  it('extracts chunk index from hit ids', () => {
    expect(extractHitChunkIndex('abc:para:4:chunk:2')).toBe(2);
    expect(extractHitChunkIndex('abc:para:4')).toBeNull();
    expect(extractHitChunkIndex(null)).toBeNull();
  });

  it('removes ts_headline selector artifacts and tags from snippet text', () => {
    const raw = 'from so much speaking, but I am ,StopSel=looking</b> ,StopSel=forward</b> to this week';
    const cleaned = sanitizeSearchSnippet(raw);

    expect(cleaned).not.toContain(',StopSel=');
    expect(cleaned).not.toContain('</b>');
    expect(cleaned).toContain('looking');
    expect(cleaned).toContain('forward');
  });
});

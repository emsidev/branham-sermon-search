import { describe, expect, it } from 'vitest';
import { formatSearchResultCount } from './formatSearchResultCount';

describe('formatSearchResultCount', () => {
  it('returns 0 of 0 when there are no results', () => {
    expect(formatSearchResultCount(0, 0)).toBe('0 of 0');
    expect(formatSearchResultCount(12, -3)).toBe('0 of 0');
  });

  it('formats active index as one-based result count', () => {
    expect(formatSearchResultCount(2, 47)).toBe('3 of 47');
  });

  it('clamps the active index into valid range', () => {
    expect(formatSearchResultCount(-5, 10)).toBe('1 of 10');
    expect(formatSearchResultCount(42, 10)).toBe('10 of 10');
  });
});


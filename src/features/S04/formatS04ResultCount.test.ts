import { describe, expect, it } from 'vitest';
import { formatS04ResultCount } from './formatS04ResultCount';

describe('formatS04ResultCount', () => {
  it('returns 0 of 0 when there are no results', () => {
    expect(formatS04ResultCount(0, 0)).toBe('0 of 0');
    expect(formatS04ResultCount(12, -3)).toBe('0 of 0');
  });

  it('formats active index as one-based result count', () => {
    expect(formatS04ResultCount(2, 47)).toBe('3 of 47');
  });

  it('clamps the active index into valid range', () => {
    expect(formatS04ResultCount(-5, 10)).toBe('1 of 10');
    expect(formatS04ResultCount(42, 10)).toBe('10 of 10');
  });
});

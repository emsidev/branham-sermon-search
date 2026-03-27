import { describe, expect, it } from 'vitest';
import { formatDate, formatLongDate } from './utils';

describe('sermon date formatting', () => {
  it('formats full precision dates', () => {
    expect(formatDate('1947-04-12')).toBe('Apr 12, 1947');
    expect(formatLongDate('1947-04-12')).toBe('April 12, 1947');
  });

  it('formats month precision dates without exposing zero day', () => {
    expect(formatDate('1954-09-00')).toBe('Sep 1954');
    expect(formatLongDate('1954-09-00')).toBe('September 1954');
  });

  it('formats year precision dates without exposing zero month/day', () => {
    expect(formatDate('1948-00-00')).toBe('1948');
    expect(formatLongDate('1948-00-00')).toBe('1948');
  });
});

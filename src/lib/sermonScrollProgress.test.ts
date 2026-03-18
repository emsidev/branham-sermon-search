import { describe, expect, it } from 'vitest';
import { calculateSermonScrollProgressPercent } from './sermonScrollProgress';

describe('calculateSermonScrollProgressPercent', () => {
  it('returns 0 before target enters the viewport', () => {
    expect(calculateSermonScrollProgressPercent({
      scrollY: 0,
      viewportHeight: 800,
      targetTop: 1200,
      targetHeight: 1800,
    })).toBe(0);
  });

  it('returns 0 at the start of the target', () => {
    expect(calculateSermonScrollProgressPercent({
      scrollY: 1200,
      viewportHeight: 800,
      targetTop: 1200,
      targetHeight: 1800,
    })).toBe(0);
  });

  it('returns middle progress while target is being read', () => {
    expect(calculateSermonScrollProgressPercent({
      scrollY: 1700,
      viewportHeight: 800,
      targetTop: 1200,
      targetHeight: 1800,
    })).toBe(50);
  });

  it('returns 100 at and past the end of target', () => {
    expect(calculateSermonScrollProgressPercent({
      scrollY: 2200,
      viewportHeight: 800,
      targetTop: 1200,
      targetHeight: 1800,
    })).toBe(100);

    expect(calculateSermonScrollProgressPercent({
      scrollY: 2800,
      viewportHeight: 800,
      targetTop: 1200,
      targetHeight: 1800,
    })).toBe(100);
  });

  it('returns 100 when target fits entirely in viewport', () => {
    expect(calculateSermonScrollProgressPercent({
      scrollY: 1200,
      viewportHeight: 1000,
      targetTop: 1200,
      targetHeight: 600,
    })).toBe(100);
  });

  it('returns 0 for invalid dimensions', () => {
    expect(calculateSermonScrollProgressPercent({
      scrollY: 100,
      viewportHeight: 0,
      targetTop: 0,
      targetHeight: 800,
    })).toBe(0);

    expect(calculateSermonScrollProgressPercent({
      scrollY: 100,
      viewportHeight: 800,
      targetTop: 0,
      targetHeight: 0,
    })).toBe(0);
  });
});

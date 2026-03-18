import { describe, expect, it } from 'vitest';
import {
  buildReadingModeSearch,
  isReadingModeEnabledFromSearchParams,
  withReadingModeSearchParams,
} from './readingModeUrlState';

describe('readingModeUrlState', () => {
  it('detects enabled reading mode from search params', () => {
    expect(isReadingModeEnabledFromSearchParams(new URLSearchParams('reading=1'))).toBe(true);
    expect(isReadingModeEnabledFromSearchParams(new URLSearchParams('reading=0'))).toBe(false);
    expect(isReadingModeEnabledFromSearchParams(new URLSearchParams('q=amen'))).toBe(false);
  });

  it('applies and removes reading mode while preserving other query params', () => {
    const current = new URLSearchParams('q=amen&sort=relevance-desc');
    const enabled = withReadingModeSearchParams(current, true);
    expect(enabled.get('q')).toBe('amen');
    expect(enabled.get('sort')).toBe('relevance-desc');
    expect(enabled.get('reading')).toBe('1');

    const disabled = withReadingModeSearchParams(enabled, false);
    expect(disabled.get('q')).toBe('amen');
    expect(disabled.get('sort')).toBe('relevance-desc');
    expect(disabled.has('reading')).toBe(false);
  });

  it('builds search strings for enabled and disabled states', () => {
    expect(buildReadingModeSearch('?q=amen', true)).toBe('?q=amen&reading=1');
    expect(buildReadingModeSearch('?q=amen&reading=1', false)).toBe('?q=amen');
    expect(buildReadingModeSearch('', true)).toBe('?reading=1');
    expect(buildReadingModeSearch('?reading=1', false)).toBe('');
  });
});

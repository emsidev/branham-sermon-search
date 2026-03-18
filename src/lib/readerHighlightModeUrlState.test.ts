import { describe, expect, it } from 'vitest';
import {
  buildReaderHighlightModeSearch,
  getReaderHighlightModeFromSearchParams,
  isReaderHighlightMode,
  resolveReaderHighlightMode,
  withReaderHighlightModeSearchParams,
} from './readerHighlightModeUrlState';

describe('readerHighlightModeUrlState', () => {
  it('recognizes valid highlight modes and rejects invalid values', () => {
    expect(isReaderHighlightMode('word')).toBe(true);
    expect(isReaderHighlightMode('sentence')).toBe(true);
    expect(isReaderHighlightMode('paragraph')).toBe(true);
    expect(isReaderHighlightMode('invalid')).toBe(false);
    expect(isReaderHighlightMode(null)).toBe(false);
  });

  it('resolves missing and invalid values to word mode', () => {
    expect(resolveReaderHighlightMode(null)).toBe('word');
    expect(resolveReaderHighlightMode('invalid')).toBe('word');
    expect(resolveReaderHighlightMode('sentence')).toBe('sentence');
  });

  it('reads and writes highlight mode while preserving other params', () => {
    const initialParams = new URLSearchParams('q=amen&reading=1');
    const nextParams = withReaderHighlightModeSearchParams(initialParams, 'paragraph');
    expect(nextParams.get('q')).toBe('amen');
    expect(nextParams.get('reading')).toBe('1');
    expect(nextParams.get('highlightMode')).toBe('paragraph');
    expect(getReaderHighlightModeFromSearchParams(nextParams)).toBe('paragraph');
  });

  it('builds mode-specific search strings from existing query values', () => {
    expect(buildReaderHighlightModeSearch('?q=amen', 'sentence')).toBe('?q=amen&highlightMode=sentence');
    expect(buildReaderHighlightModeSearch('?q=amen&reading=1', 'paragraph')).toBe('?q=amen&reading=1&highlightMode=paragraph');
    expect(buildReaderHighlightModeSearch('', 'word')).toBe('?highlightMode=word');
  });
});

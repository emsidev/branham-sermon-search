import { describe, expect, it } from 'vitest';
import {
  buildReaderSlideViewSearch,
  getReaderSlidePageFromSearchParams,
  getReaderSlideSelectionFromSearchParams,
  isReaderSlideViewEnabledFromSearchParams,
  withReaderSlidePageSearchParams,
  withReaderSlideSelectionSearchParams,
  withReaderSlideViewSearchParams,
} from './readerSlideViewUrlState';

describe('readerSlideViewUrlState', () => {
  it('detects enabled slide view from search params', () => {
    expect(isReaderSlideViewEnabledFromSearchParams(new URLSearchParams('slide=1'))).toBe(true);
    expect(isReaderSlideViewEnabledFromSearchParams(new URLSearchParams('slide=0'))).toBe(false);
    expect(isReaderSlideViewEnabledFromSearchParams(new URLSearchParams('q=amen'))).toBe(false);
  });

  it('applies and removes slide mode while preserving other query params', () => {
    const current = new URLSearchParams('q=amen&highlightMode=sentence&slideStart=2&slideEnd=9&slidePage=3');
    const enabled = withReaderSlideViewSearchParams(current, true);
    expect(enabled.get('q')).toBe('amen');
    expect(enabled.get('highlightMode')).toBe('sentence');
    expect(enabled.get('slide')).toBe('1');
    expect(enabled.get('slideStart')).toBe('2');
    expect(enabled.get('slideEnd')).toBe('9');
    expect(enabled.get('slidePage')).toBe('3');

    const disabled = withReaderSlideViewSearchParams(enabled, false);
    expect(disabled.get('q')).toBe('amen');
    expect(disabled.get('highlightMode')).toBe('sentence');
    expect(disabled.has('slide')).toBe(false);
    expect(disabled.has('slideStart')).toBe(false);
    expect(disabled.has('slideEnd')).toBe(false);
    expect(disabled.has('slidePage')).toBe(false);
  });

  it('reads selection bounds and page from query params', () => {
    expect(getReaderSlideSelectionFromSearchParams(new URLSearchParams('slideStart=9&slideEnd=2'))).toEqual({
      startIndex: 2,
      endIndex: 9,
    });
    expect(getReaderSlideSelectionFromSearchParams(new URLSearchParams('slideStart=hello&slideEnd=2'))).toBeNull();

    expect(getReaderSlidePageFromSearchParams(new URLSearchParams('slidePage=5'))).toBe(5);
    expect(getReaderSlidePageFromSearchParams(new URLSearchParams('slidePage=0'))).toBe(1);
    expect(getReaderSlidePageFromSearchParams(new URLSearchParams('q=amen'))).toBe(1);
  });

  it('writes selection bounds and page while preserving unrelated params', () => {
    const base = new URLSearchParams('q=amen&slidePage=9');
    const withSelection = withReaderSlideSelectionSearchParams(base, 3, 8);
    expect(withSelection.toString()).toBe('q=amen&slide=1&slideStart=3&slideEnd=8');

    const withPage = withReaderSlidePageSearchParams(withSelection, 4);
    expect(withPage.toString()).toBe('q=amen&slide=1&slideStart=3&slideEnd=8&slidePage=4');
  });

  it('builds search strings for enabled and disabled states', () => {
    expect(buildReaderSlideViewSearch('?q=amen', true)).toBe('?q=amen&slide=1');
    expect(buildReaderSlideViewSearch('?q=amen', true, { selectionStart: 4, selectionEnd: 11 }))
      .toBe('?q=amen&slide=1&slideStart=4&slideEnd=11');
    expect(buildReaderSlideViewSearch('?q=amen&slide=1&slideStart=1&slideEnd=2&slidePage=3', false)).toBe('?q=amen');
    expect(buildReaderSlideViewSearch('', true, { selectionStart: 1, selectionEnd: 2 })).toBe('?slide=1&slideStart=1&slideEnd=2');
    expect(buildReaderSlideViewSearch('?slide=1', false)).toBe('');
  });
});

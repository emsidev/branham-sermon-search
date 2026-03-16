import { describe, expect, it } from 'vitest';
import { createHitNavigationKeyHandler } from './createHitNavigationKeyHandler';

describe('createHitNavigationKeyHandler', () => {
  it('maps n to next hit', () => {
    expect(createHitNavigationKeyHandler({
      key: 'n',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      target: document.body,
    })).toBe('next');
  });

  it('maps Shift+N to previous hit', () => {
    expect(createHitNavigationKeyHandler({
      key: 'N',
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      target: document.body,
    })).toBe('prev');
  });

  it('maps m and Shift+M to adjacent sermon navigation', () => {
    expect(createHitNavigationKeyHandler({
      key: 'm',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      target: document.body,
    })).toBe('next_sermon');

    expect(createHitNavigationKeyHandler({
      key: 'M',
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      target: document.body,
    })).toBe('prev_sermon');
  });

  it('ignores typing targets', () => {
    const input = document.createElement('input');
    expect(createHitNavigationKeyHandler({
      key: 'n',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      target: input,
    })).toBeNull();
  });

  it('ignores modifier combinations', () => {
    expect(createHitNavigationKeyHandler({
      key: 'n',
      shiftKey: false,
      altKey: true,
      ctrlKey: false,
      metaKey: false,
      target: document.body,
    })).toBeNull();
  });

  it('ignores non-navigation keys', () => {
    expect(createHitNavigationKeyHandler({
      key: 'k',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      target: document.body,
    })).toBeNull();
  });

  it('supports configured navigation keys', () => {
    expect(createHitNavigationKeyHandler({
      key: 'x',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      target: document.body,
    }, {
      hitCycleKey: 'x',
      sermonCycleKey: 'y',
    })).toBe('next');

    expect(createHitNavigationKeyHandler({
      key: 'Y',
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      target: document.body,
    }, {
      hitCycleKey: 'x',
      sermonCycleKey: 'y',
    })).toBe('prev_sermon');
  });
});

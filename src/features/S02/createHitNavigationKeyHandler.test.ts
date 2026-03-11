import { describe, expect, it } from 'vitest';
import { createHitNavigationKeyHandler } from './createHitNavigationKeyHandler';

describe('createHitNavigationKeyHandler', () => {
  it('maps n to next', () => {
    expect(createHitNavigationKeyHandler({
      key: 'n',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      target: document.body,
    })).toBe('next');
  });

  it('maps Shift+N to prev', () => {
    expect(createHitNavigationKeyHandler({
      key: 'N',
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      target: document.body,
    })).toBe('prev');
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
});

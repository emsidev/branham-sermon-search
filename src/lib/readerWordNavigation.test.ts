import { describe, expect, it } from 'vitest';
import {
  buildReaderWordRegionMap,
  countReaderWords,
  createReaderWordSelectionRange,
  defaultReaderWordNavigationShortcutCaptureTargetGuard,
  defaultReaderWordNavigationTypingTargetGuard,
  extendReaderWordSelection,
  getReaderWordSelectionBounds,
  isReaderWordSelected,
  resolveReaderWordNavigationCommand,
  shrinkReaderWordSelection,
  tokenizeReaderText,
  type ReaderWordNavigationKeyboardEventLike,
} from './readerWordNavigation';

function createKeyboardEventLike(
  overrides: Partial<ReaderWordNavigationKeyboardEventLike> = {},
): ReaderWordNavigationKeyboardEventLike {
  return {
    key: 'ArrowRight',
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    defaultPrevented: false,
    target: document.body,
    ...overrides,
  };
}

describe('readerWordNavigation tokenization', () => {
  it('tokenizes text while preserving separators and whitespace', () => {
    const text = "First, I am looking-forward. We're ready!";
    const tokens = tokenizeReaderText(text);

    expect(tokens.map((token) => token.text).join('')).toBe(text);
    expect(tokens.filter((token) => token.isWord).map((token) => token.text)).toEqual([
      'First',
      'I',
      'am',
      'looking',
      'forward',
      "We're",
      'ready',
    ]);
  });

  it('counts words and computes stable offsets by region', () => {
    expect(countReaderWords('')).toBe(0);
    expect(countReaderWords('Grace and peace.')).toBe(3);

    expect(buildReaderWordRegionMap([
      { key: 'p-1', text: 'Grace and peace.' },
      { key: 'p-2', text: 'Be with you all.' },
    ])).toEqual({
      totalWords: 7,
      offsetsByRegion: {
        'p-1': 0,
        'p-2': 3,
      },
    });
  });
});

describe('readerWordNavigation keyboard command resolver', () => {
  it('maps Space/ArrowRight to extend and ArrowLeft/Shift+Space to shrink', () => {
    expect(resolveReaderWordNavigationCommand(createKeyboardEventLike({ key: ' ' }))).toBe('extend');
    expect(resolveReaderWordNavigationCommand(createKeyboardEventLike({ key: 'ArrowRight' }))).toBe('extend');
    expect(resolveReaderWordNavigationCommand(createKeyboardEventLike({ key: 'ArrowLeft' }))).toBe('shrink');
    expect(resolveReaderWordNavigationCommand(createKeyboardEventLike({ key: ' ', shiftKey: true }))).toBe('shrink');
  });

  it('rejects typing targets and shortcut-capture controls', () => {
    const input = document.createElement('input');
    const captureButton = document.createElement('button');
    captureButton.setAttribute('data-shortcut-capture', 'true');

    expect(defaultReaderWordNavigationTypingTargetGuard(input)).toBe(true);
    expect(defaultReaderWordNavigationShortcutCaptureTargetGuard(captureButton)).toBe(true);

    expect(resolveReaderWordNavigationCommand(createKeyboardEventLike({ target: input }))).toBeNull();
    expect(resolveReaderWordNavigationCommand(createKeyboardEventLike({ target: captureButton }))).toBeNull();
  });

  it('rejects prevented events and modifier combinations', () => {
    expect(resolveReaderWordNavigationCommand(createKeyboardEventLike({ defaultPrevented: true }))).toBeNull();
    expect(resolveReaderWordNavigationCommand(createKeyboardEventLike({ altKey: true }))).toBeNull();
    expect(resolveReaderWordNavigationCommand(createKeyboardEventLike({ ctrlKey: true }))).toBeNull();
    expect(resolveReaderWordNavigationCommand(createKeyboardEventLike({ metaKey: true }))).toBeNull();
    expect(resolveReaderWordNavigationCommand(createKeyboardEventLike({ key: 'ArrowRight', shiftKey: true }))).toBeNull();
  });
});

describe('readerWordNavigation selection helpers', () => {
  it('creates ranges from clicked word index with clamping', () => {
    expect(createReaderWordSelectionRange(2, 5)).toEqual({ anchorIndex: 2, cursorIndex: 2 });
    expect(createReaderWordSelectionRange(-4, 5)).toEqual({ anchorIndex: 0, cursorIndex: 0 });
    expect(createReaderWordSelectionRange(99, 5)).toEqual({ anchorIndex: 4, cursorIndex: 4 });
    expect(createReaderWordSelectionRange(0, 0)).toBeNull();
  });

  it('extends selection with clamping at the final word', () => {
    const start = createReaderWordSelectionRange(1, 4);
    expect(start).toEqual({ anchorIndex: 1, cursorIndex: 1 });

    const next = extendReaderWordSelection(start, 4);
    expect(next).toEqual({ anchorIndex: 1, cursorIndex: 2 });

    const clamped = extendReaderWordSelection({ anchorIndex: 1, cursorIndex: 3 }, 4);
    expect(clamped).toEqual({ anchorIndex: 1, cursorIndex: 3 });
    expect(extendReaderWordSelection(null, 4)).toBeNull();
  });

  it('shrinks selection and clears when shrinking at anchor', () => {
    expect(shrinkReaderWordSelection({ anchorIndex: 1, cursorIndex: 3 }, 5)).toEqual({
      anchorIndex: 1,
      cursorIndex: 2,
    });
    expect(shrinkReaderWordSelection({ anchorIndex: 1, cursorIndex: 1 }, 5)).toBeNull();
    expect(shrinkReaderWordSelection(null, 5)).toBeNull();
  });

  it('computes selection bounds and selected-word checks', () => {
    const range = { anchorIndex: 2, cursorIndex: 4 };
    expect(getReaderWordSelectionBounds(range)).toEqual({ startIndex: 2, endIndex: 4 });
    expect(isReaderWordSelected(1, range)).toBe(false);
    expect(isReaderWordSelected(2, range)).toBe(true);
    expect(isReaderWordSelected(4, range)).toBe(true);
    expect(isReaderWordSelected(5, range)).toBe(false);
    expect(isReaderWordSelected(4, null)).toBe(false);
  });
});

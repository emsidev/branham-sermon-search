import { describe, expect, it } from 'vitest';
import {
  defaultReadingModeShortcutCaptureTargetGuard,
  defaultReadingModeTypingTargetGuard,
  shouldTriggerReadingModeShortcut,
  type ReadingModeKeyboardEventLike,
} from './readingModeShortcuts';

function createKeyboardEventLike(
  overrides: Partial<ReadingModeKeyboardEventLike> = {},
): ReadingModeKeyboardEventLike {
  return {
    key: 'r',
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    defaultPrevented: false,
    target: document.body,
    ...overrides,
  };
}

describe('readingModeShortcuts', () => {
  it('triggers when key matches and context is valid', () => {
    expect(shouldTriggerReadingModeShortcut(createKeyboardEventLike(), 'r')).toBe(true);
    expect(shouldTriggerReadingModeShortcut(createKeyboardEventLike({ key: 'R' }), 'r')).toBe(true);
  });

  it('does not trigger when modifier keys are pressed', () => {
    expect(shouldTriggerReadingModeShortcut(createKeyboardEventLike({ ctrlKey: true }), 'r')).toBe(false);
    expect(shouldTriggerReadingModeShortcut(createKeyboardEventLike({ altKey: true }), 'r')).toBe(false);
    expect(shouldTriggerReadingModeShortcut(createKeyboardEventLike({ metaKey: true }), 'r')).toBe(false);
  });

  it('does not trigger from typing targets', () => {
    const input = document.createElement('input');
    const textArea = document.createElement('textarea');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');

    expect(defaultReadingModeTypingTargetGuard(input)).toBe(true);
    expect(defaultReadingModeTypingTargetGuard(textArea)).toBe(true);
    expect(defaultReadingModeTypingTargetGuard(editable)).toBe(true);

    expect(shouldTriggerReadingModeShortcut(createKeyboardEventLike({ target: input }), 'r')).toBe(false);
    expect(shouldTriggerReadingModeShortcut(createKeyboardEventLike({ target: textArea }), 'r')).toBe(false);
    expect(shouldTriggerReadingModeShortcut(createKeyboardEventLike({ target: editable }), 'r')).toBe(false);
  });

  it('does not trigger from shortcut-capture controls', () => {
    const captureButton = document.createElement('button');
    captureButton.setAttribute('data-shortcut-capture', 'true');
    const captureChild = document.createElement('span');
    captureButton.appendChild(captureChild);

    expect(defaultReadingModeShortcutCaptureTargetGuard(captureButton)).toBe(true);
    expect(defaultReadingModeShortcutCaptureTargetGuard(captureChild)).toBe(true);
    expect(shouldTriggerReadingModeShortcut(createKeyboardEventLike({ target: captureChild }), 'r')).toBe(false);
  });

  it('does not trigger when event is already prevented or key does not match', () => {
    expect(shouldTriggerReadingModeShortcut(createKeyboardEventLike({ defaultPrevented: true }), 'r')).toBe(false);
    expect(shouldTriggerReadingModeShortcut(createKeyboardEventLike({ key: 'n' }), 'r')).toBe(false);
  });
});

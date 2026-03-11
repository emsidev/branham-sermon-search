import { describe, expect, it } from 'vitest';
import {
  defaultS04ShortcutCaptureTargetGuard,
  defaultS04TypingTargetGuard,
  shouldTriggerS04Shortcut,
  type KeyboardEventLike,
} from './shortcutGuards';

function createKeyboardEventLike(overrides: Partial<KeyboardEventLike> = {}): KeyboardEventLike {
  return {
    key: 'f',
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    defaultPrevented: false,
    target: document.body,
    ...overrides,
  };
}

describe('shortcutGuards', () => {
  it('triggers when key matches and context is valid', () => {
    const event = createKeyboardEventLike();
    expect(shouldTriggerS04Shortcut(event, 'f')).toBe(true);
  });

  it('does not trigger when modifier keys are pressed', () => {
    expect(shouldTriggerS04Shortcut(createKeyboardEventLike({ ctrlKey: true }), 'f')).toBe(false);
    expect(shouldTriggerS04Shortcut(createKeyboardEventLike({ altKey: true }), 'f')).toBe(false);
    expect(shouldTriggerS04Shortcut(createKeyboardEventLike({ metaKey: true }), 'f')).toBe(false);
  });

  it('does not trigger from typing targets', () => {
    const input = document.createElement('input');
    const textArea = document.createElement('textarea');
    const editable = document.createElement('div');
    editable.contentEditable = 'true';

    expect(defaultS04TypingTargetGuard(input)).toBe(true);
    expect(defaultS04TypingTargetGuard(textArea)).toBe(true);
    expect(defaultS04TypingTargetGuard(editable)).toBe(true);

    expect(shouldTriggerS04Shortcut(createKeyboardEventLike({ target: input }), 'f')).toBe(false);
    expect(shouldTriggerS04Shortcut(createKeyboardEventLike({ target: textArea }), 'f')).toBe(false);
    expect(shouldTriggerS04Shortcut(createKeyboardEventLike({ target: editable }), 'f')).toBe(false);
  });

  it('does not trigger from shortcut-capture controls', () => {
    const captureButton = document.createElement('button');
    captureButton.setAttribute('data-shortcut-capture', 'true');
    const captureSpan = document.createElement('span');
    captureButton.appendChild(captureSpan);

    expect(defaultS04ShortcutCaptureTargetGuard(captureButton)).toBe(true);
    expect(defaultS04ShortcutCaptureTargetGuard(captureSpan)).toBe(true);
    expect(shouldTriggerS04Shortcut(createKeyboardEventLike({ target: captureSpan }), 'f')).toBe(false);
  });

  it('does not trigger when event is already prevented or key does not match', () => {
    expect(shouldTriggerS04Shortcut(createKeyboardEventLike({ defaultPrevented: true }), 'f')).toBe(false);
    expect(shouldTriggerS04Shortcut(createKeyboardEventLike({ key: 'j' }), 'f')).toBe(false);
  });
});

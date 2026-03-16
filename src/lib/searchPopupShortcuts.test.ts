import { describe, expect, it } from 'vitest';
import {
  defaultSearchPopupShortcutCaptureTargetGuard,
  defaultSearchPopupTypingTargetGuard,
  shouldTriggerSearchPopupShortcut,
  type KeyboardEventLike,
} from './searchPopupShortcuts';

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
    expect(shouldTriggerSearchPopupShortcut(event, 'f')).toBe(true);
  });

  it('does not trigger when modifier keys are pressed', () => {
    expect(shouldTriggerSearchPopupShortcut(createKeyboardEventLike({ ctrlKey: true }), 'f')).toBe(false);
    expect(shouldTriggerSearchPopupShortcut(createKeyboardEventLike({ altKey: true }), 'f')).toBe(false);
    expect(shouldTriggerSearchPopupShortcut(createKeyboardEventLike({ metaKey: true }), 'f')).toBe(false);
  });

  it('does not trigger from typing targets', () => {
    const input = document.createElement('input');
    const textArea = document.createElement('textarea');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');

    expect(defaultSearchPopupTypingTargetGuard(input)).toBe(true);
    expect(defaultSearchPopupTypingTargetGuard(textArea)).toBe(true);
    expect(defaultSearchPopupTypingTargetGuard(editable)).toBe(true);

    expect(shouldTriggerSearchPopupShortcut(createKeyboardEventLike({ target: input }), 'f')).toBe(false);
    expect(shouldTriggerSearchPopupShortcut(createKeyboardEventLike({ target: textArea }), 'f')).toBe(false);
    expect(shouldTriggerSearchPopupShortcut(createKeyboardEventLike({ target: editable }), 'f')).toBe(false);
  });

  it('does not trigger from shortcut-capture controls', () => {
    const captureButton = document.createElement('button');
    captureButton.setAttribute('data-shortcut-capture', 'true');
    const captureSpan = document.createElement('span');
    captureButton.appendChild(captureSpan);

    expect(defaultSearchPopupShortcutCaptureTargetGuard(captureButton)).toBe(true);
    expect(defaultSearchPopupShortcutCaptureTargetGuard(captureSpan)).toBe(true);
    expect(shouldTriggerSearchPopupShortcut(createKeyboardEventLike({ target: captureSpan }), 'f')).toBe(false);
  });

  it('does not trigger when event is already prevented or key does not match', () => {
    expect(shouldTriggerSearchPopupShortcut(createKeyboardEventLike({ defaultPrevented: true }), 'f')).toBe(false);
    expect(shouldTriggerSearchPopupShortcut(createKeyboardEventLike({ key: 'j' }), 'f')).toBe(false);
  });
});


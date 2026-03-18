import { normalizeShortcutKey } from '@/lib/keyboardShortcuts';

export type ReadingModeTypingTargetGuard = (target: EventTarget | null) => boolean;
export type ReadingModeShortcutCaptureTargetGuard = (target: EventTarget | null) => boolean;

export interface ShouldTriggerReadingModeShortcutOptions {
  isTypingTarget?: ReadingModeTypingTargetGuard;
  isShortcutCaptureTarget?: ReadingModeShortcutCaptureTargetGuard;
}

export type ReadingModeKeyboardEventLike = Pick<
  KeyboardEvent,
  'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'defaultPrevented' | 'target'
>;

export function defaultReadingModeTypingTargetGuard(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const contentEditableAttr = target.getAttribute('contenteditable');
  const isContentEditable = Boolean(target.isContentEditable)
    || contentEditableAttr === ''
    || contentEditableAttr === 'true';

  return target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || isContentEditable;
}

export function defaultReadingModeShortcutCaptureTargetGuard(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest('[data-shortcut-capture="true"]'));
}

export function shouldTriggerReadingModeShortcut(
  event: ReadingModeKeyboardEventLike,
  shortcutKey: string,
  options: ShouldTriggerReadingModeShortcutOptions = {},
): boolean {
  if (event.defaultPrevented) {
    return false;
  }

  if (event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }

  const normalizedShortcutKey = normalizeShortcutKey(shortcutKey);
  if (!normalizedShortcutKey) {
    return false;
  }

  const normalizedEventKey = normalizeShortcutKey(event.key);
  if (!normalizedEventKey || normalizedEventKey !== normalizedShortcutKey) {
    return false;
  }

  const isShortcutCaptureTarget = options.isShortcutCaptureTarget ?? defaultReadingModeShortcutCaptureTargetGuard;
  if (isShortcutCaptureTarget(event.target)) {
    return false;
  }

  const isTypingTarget = options.isTypingTarget ?? defaultReadingModeTypingTargetGuard;
  if (isTypingTarget(event.target)) {
    return false;
  }

  return true;
}

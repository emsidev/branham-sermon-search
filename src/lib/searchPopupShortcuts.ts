import { normalizeShortcutKey } from '@/lib/keyboardShortcuts';

export type SearchPopupTypingTargetGuard = (target: EventTarget | null) => boolean;
export type SearchPopupShortcutCaptureTargetGuard = (target: EventTarget | null) => boolean;

export interface ShouldTriggerSearchPopupShortcutOptions {
  isTypingTarget?: SearchPopupTypingTargetGuard;
  isShortcutCaptureTarget?: SearchPopupShortcutCaptureTargetGuard;
}

export type KeyboardEventLike = Pick<
  KeyboardEvent,
  'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'defaultPrevented' | 'target'
>;

export function defaultSearchPopupTypingTargetGuard(target: EventTarget | null): boolean {
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

export function defaultSearchPopupShortcutCaptureTargetGuard(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest('[data-shortcut-capture="true"]'));
}

export function shouldTriggerSearchPopupShortcut(
  event: KeyboardEventLike,
  shortcutKey: string,
  options: ShouldTriggerSearchPopupShortcutOptions = {},
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

  const isShortcutCaptureTarget = options.isShortcutCaptureTarget ?? defaultSearchPopupShortcutCaptureTargetGuard;
  if (isShortcutCaptureTarget(event.target)) {
    return false;
  }

  const isTypingTarget = options.isTypingTarget ?? defaultSearchPopupTypingTargetGuard;
  if (isTypingTarget(event.target)) {
    return false;
  }

  return true;
}

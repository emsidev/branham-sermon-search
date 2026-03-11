import { normalizeShortcutKey } from '@/lib/keyboardShortcuts';
import type {
  S04ShortcutCaptureTargetGuard,
  S04TypingTargetGuard,
} from './types';

export interface ShouldTriggerS04ShortcutOptions {
  isTypingTarget?: S04TypingTargetGuard;
  isShortcutCaptureTarget?: S04ShortcutCaptureTargetGuard;
}

export type KeyboardEventLike = Pick<
  KeyboardEvent,
  'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'defaultPrevented' | 'target'
>;

export function defaultS04TypingTargetGuard(target: EventTarget | null): boolean {
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

export function defaultS04ShortcutCaptureTargetGuard(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest('[data-shortcut-capture="true"]'));
}

export function shouldTriggerS04Shortcut(
  event: KeyboardEventLike,
  shortcutKey: string,
  options: ShouldTriggerS04ShortcutOptions = {},
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

  const isShortcutCaptureTarget = options.isShortcutCaptureTarget ?? defaultS04ShortcutCaptureTargetGuard;
  if (isShortcutCaptureTarget(event.target)) {
    return false;
  }

  const isTypingTarget = options.isTypingTarget ?? defaultS04TypingTargetGuard;
  if (isTypingTarget(event.target)) {
    return false;
  }

  return true;
}

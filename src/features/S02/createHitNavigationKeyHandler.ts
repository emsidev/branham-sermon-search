import { normalizeShortcutKey } from '@/lib/keyboardShortcuts';
import type { S02HitNavigationCommand, S02HitNavigationKeyContext } from './types';

interface CreateHitNavigationKeyHandlerOptions {
  hitCycleKey?: string;
  sermonCycleKey?: string;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.isContentEditable;
}

export function createHitNavigationKeyHandler(
  context: S02HitNavigationKeyContext,
  options: CreateHitNavigationKeyHandlerOptions = {},
): S02HitNavigationCommand {
  if (context.altKey || context.ctrlKey || context.metaKey) {
    return null;
  }

  if (isTypingTarget(context.target)) {
    return null;
  }

  const normalizedKey = normalizeShortcutKey(context.key);
  if (!normalizedKey) {
    return null;
  }

  const normalizedHitCycleKey = normalizeShortcutKey(options.hitCycleKey ?? 'n');
  const normalizedSermonCycleKey = normalizeShortcutKey(options.sermonCycleKey ?? 'm');

  if (normalizedHitCycleKey && normalizedKey === normalizedHitCycleKey) {
    return context.shiftKey ? 'prev' : 'next';
  }

  if (normalizedSermonCycleKey && normalizedKey === normalizedSermonCycleKey) {
    return context.shiftKey ? 'prev_sermon' : 'next_sermon';
  }

  return null;
}

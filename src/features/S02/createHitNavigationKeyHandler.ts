import type { S02HitNavigationCommand, S02HitNavigationKeyContext } from './types';

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
): S02HitNavigationCommand {
  if (context.altKey || context.ctrlKey || context.metaKey) {
    return null;
  }

  if (isTypingTarget(context.target)) {
    return null;
  }

  const normalizedKey = context.key.toLowerCase();
  if (normalizedKey !== 'n') {
    return null;
  }

  return context.shiftKey ? 'prev' : 'next';
}

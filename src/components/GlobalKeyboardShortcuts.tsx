import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import {
  buildSearchHrefFromQuery,
  createShortcutSearchTransitionState,
  readSearchReturnTo,
} from '@/lib/searchNavigation';
import { normalizeShortcutKey } from '@/lib/keyboardShortcuts';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.isContentEditable;
}

function isShortcutCaptureTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest('[data-shortcut-capture="true"]'));
}

export default function GlobalKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const shortcutRequestIdRef = useRef(0);
  const {
    bindings,
    getSearchInputElement,
    getResultListController,
  } = useKeyboardShortcuts();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const target = event.target;
      if (isShortcutCaptureTarget(target)) {
        return;
      }

      const hasDisallowedModifier = event.altKey || event.ctrlKey || event.metaKey;

      if (event.key === 'Escape' && !hasDisallowedModifier) {
        getSearchInputElement()?.blur();
        return;
      }

      if (isTypingTarget(target) || hasDisallowedModifier) {
        return;
      }

      const normalizedKey = normalizeShortcutKey(event.key);
      if (!normalizedKey) {
        if (event.key === 'Enter') {
          const controller = getResultListController();
          if (controller?.hasItems()) {
            event.preventDefault();
            controller.activateSelection();
          }
        }
        return;
      }

      if (normalizedKey === bindings.focus_search) {
        event.preventDefault();
        const searchInput = getSearchInputElement();
        if (searchInput) {
          searchInput.focus();
          return;
        }

        const requestId = `shortcut-search-${Date.now()}-${shortcutRequestIdRef.current++}`;
        const persistedSearchHref = readSearchReturnTo(location.state);
        const queryFromUrl = new URLSearchParams(location.search).get('q') ?? '';
        const searchHref = persistedSearchHref
          ?? (queryFromUrl.trim() ? buildSearchHrefFromQuery(queryFromUrl) : '/search');

        navigate(searchHref, {
          state: createShortcutSearchTransitionState(requestId),
        });
        return;
      }

      if (normalizedKey === bindings.open_books) {
        event.preventDefault();
        navigate('/books');
        return;
      }

      if (normalizedKey === bindings.open_settings) {
        event.preventDefault();
        navigate('/settings');
        return;
      }

      const controller = getResultListController();
      if (!controller?.hasItems()) {
        return;
      }

      if (normalizedKey === bindings.result_next) {
        event.preventDefault();
        controller.selectNext();
        return;
      }

      if (normalizedKey === bindings.result_prev) {
        event.preventDefault();
        controller.selectPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bindings, getResultListController, getSearchInputElement, location.search, location.state, navigate]);

  return null;
}

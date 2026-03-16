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
        const urlParams = new URLSearchParams(location.search);
        const queryFromUrl = urlParams.get('q') ?? '';
        const matchCaseFromUrl = urlParams.get('matchCase') === '1';
        const wholeWordParam = urlParams.get('wholeWord');
        const wholeWordFromUrl = wholeWordParam == null ? true : wholeWordParam === '1';
        const searchHref = persistedSearchHref
          ?? (
            queryFromUrl.trim() || matchCaseFromUrl || wholeWordFromUrl
              ? buildSearchHrefFromQuery(queryFromUrl, {
                  matchCase: matchCaseFromUrl,
                  wholeWord: wholeWordFromUrl,
                })
              : '/search'
          );

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

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bindings, getSearchInputElement, location.search, location.state, navigate]);

  return null;
}

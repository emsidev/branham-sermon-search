import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseKeyboardNavOptions {
  selectedIndex: number;
  itemHrefs: string[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  booksShortcutHref?: string;
  settingsShortcutHref?: string;
}

export function useKeyboardNav({
  selectedIndex,
  itemHrefs,
  searchInputRef,
  booksShortcutHref,
  settingsShortcutHref,
}: UseKeyboardNavOptions) {
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    // `/` focuses search from anywhere
    if (e.key === '/' && !isInput) {
      e.preventDefault();
      searchInputRef.current?.focus();
      return;
    }

    // Escape clears search and blurs
    if (e.key === 'Escape') {
      searchInputRef.current?.blur();
      return;
    }

    if (
      booksShortcutHref &&
      !isInput &&
      e.key.toLowerCase() === 'b' &&
      !e.altKey &&
      !e.metaKey &&
      !e.ctrlKey
    ) {
      e.preventDefault();
      navigate(booksShortcutHref);
      return;
    }

    if (
      settingsShortcutHref &&
      !isInput &&
      e.key === ',' &&
      !e.altKey &&
      !e.metaKey &&
      !e.ctrlKey
    ) {
      e.preventDefault();
      navigate(settingsShortcutHref);
      return;
    }

    if (isInput) return;

    if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < itemHrefs.length) {
      e.preventDefault();
      navigate(itemHrefs[selectedIndex]);
    }
  }, [
    booksShortcutHref,
    settingsShortcutHref,
    selectedIndex,
    itemHrefs,
    navigate,
    searchInputRef,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

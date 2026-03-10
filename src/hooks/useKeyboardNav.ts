import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseKeyboardNavOptions {
  itemCount: number;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  itemHrefs: string[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  booksShortcutHref?: string;
  settingsShortcutHref?: string;
}

export function useKeyboardNav({
  itemCount,
  selectedIndex,
  onSelectedIndexChange,
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

    // j/k navigate list
    if (e.key === 'j') {
      e.preventDefault();
      onSelectedIndexChange(Math.min(selectedIndex + 1, itemCount - 1));
    } else if (e.key === 'k') {
      e.preventDefault();
      onSelectedIndexChange(Math.max(selectedIndex - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < itemHrefs.length) {
      e.preventDefault();
      navigate(itemHrefs[selectedIndex]);
    }
  }, [
    booksShortcutHref,
    settingsShortcutHref,
    selectedIndex,
    itemCount,
    itemHrefs,
    navigate,
    searchInputRef,
    onSelectedIndexChange,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

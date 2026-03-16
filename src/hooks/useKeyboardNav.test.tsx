import { fireEvent, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';
import { useKeyboardNav } from './useKeyboardNav';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

describe('useKeyboardNav', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('navigates to selected item href when Enter is pressed', () => {
    const searchInputRef = {
      current: document.createElement('input'),
    } as React.RefObject<HTMLInputElement>;

    renderHook(() =>
      useKeyboardNav({
        selectedIndex: 1,
        itemHrefs: ['/sermons/a', '/sermons/b?q=search&source=page_text&page=2'],
        searchInputRef,
      })
    );

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/sermons/b?q=search&source=page_text&page=2');
  });

  it('navigates to books shortcut when b is pressed outside input', () => {
    const searchInputRef = {
      current: document.createElement('input'),
    } as React.RefObject<HTMLInputElement>;

    renderHook(() =>
      useKeyboardNav({
        selectedIndex: -1,
        itemHrefs: [],
        searchInputRef,
        booksShortcutHref: '/books',
      })
    );

    fireEvent.keyDown(window, { key: 'b' });

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/books');
  });

  it('does not trigger books shortcut while typing in an input', () => {
    const input = document.createElement('input');
    const searchInputRef = {
      current: input,
    } as React.RefObject<HTMLInputElement>;

    renderHook(() =>
      useKeyboardNav({
        selectedIndex: -1,
        itemHrefs: [],
        searchInputRef,
        booksShortcutHref: '/books',
      })
    );

    fireEvent.keyDown(input, { key: 'b' });

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('navigates to settings shortcut when comma is pressed outside input', () => {
    const searchInputRef = {
      current: document.createElement('input'),
    } as React.RefObject<HTMLInputElement>;

    renderHook(() =>
      useKeyboardNav({
        selectedIndex: -1,
        itemHrefs: [],
        searchInputRef,
        settingsShortcutHref: '/settings',
      })
    );

    fireEvent.keyDown(window, { key: ',' });

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/settings');
  });

  it('does not trigger settings shortcut while typing in an input', () => {
    const input = document.createElement('input');
    const searchInputRef = {
      current: input,
    } as React.RefObject<HTMLInputElement>;

    renderHook(() =>
      useKeyboardNav({
        selectedIndex: -1,
        itemHrefs: [],
        searchInputRef,
        settingsShortcutHref: '/settings',
      })
    );

    fireEvent.keyDown(input, { key: ',' });

    expect(navigateMock).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalKeyboardShortcuts from './GlobalKeyboardShortcuts';
import type { ShortcutBindings } from '@/lib/keyboardShortcuts';
import type { ShortcutResultListController } from '@/hooks/useKeyboardShortcuts';

let bindingsMock: ShortcutBindings = {
  focus_search: '/',
  open_books: 'b',
  open_settings: ',',
  result_next: 'j',
  result_prev: 'k',
};
let searchInputMock: HTMLInputElement | null = null;
let resultControllerMock: ShortcutResultListController | null = null;

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    bindings: bindingsMock,
    syncStatus: 'synced',
    syncWarning: null,
    setShortcutBinding: vi.fn(),
    resetShortcutBinding: vi.fn(),
    resetAllShortcutBindings: vi.fn(),
    registerSearchInputResolver: () => () => undefined,
    getSearchInputElement: () => searchInputMock,
    registerResultListController: () => () => undefined,
    getResultListController: () => resultControllerMock,
  }),
}));

function LocationSpy() {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

function renderWithRouter(initialEntry = '/about') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <GlobalKeyboardShortcuts />
      <Routes>
        <Route path="*" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('GlobalKeyboardShortcuts', () => {
  beforeEach(() => {
    bindingsMock = {
      focus_search: '/',
      open_books: 'b',
      open_settings: ',',
      result_next: 'j',
      result_prev: 'k',
    };
    searchInputMock = null;
    resultControllerMock = null;
  });

  it('navigates to search when focus shortcut is pressed with no active search input', async () => {
    renderWithRouter('/about');

    fireEvent.keyDown(window, { key: '/' });

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/search');
    });
  });

  it('focuses the active search input instead of navigating', async () => {
    searchInputMock = document.createElement('input');
    document.body.appendChild(searchInputMock);

    renderWithRouter('/about');
    fireEvent.keyDown(window, { key: '/' });

    await waitFor(() => {
      expect(document.activeElement).toBe(searchInputMock);
    });
    expect(screen.getByTestId('path')).toHaveTextContent('/about');

    searchInputMock.remove();
  });

  it('routes list navigation keys only when list context exists', () => {
    const selectNext = vi.fn();
    const selectPrevious = vi.fn();
    const activateSelection = vi.fn();

    resultControllerMock = {
      hasItems: () => true,
      selectNext,
      selectPrevious,
      activateSelection,
    };

    renderWithRouter('/search');

    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'k' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(selectNext).toHaveBeenCalledTimes(1);
    expect(selectPrevious).toHaveBeenCalledTimes(1);
    expect(activateSelection).toHaveBeenCalledTimes(1);
  });

  it('does not intercept j/k when list controller has no items', () => {
    const selectNext = vi.fn();
    resultControllerMock = {
      hasItems: () => false,
      selectNext,
      selectPrevious: vi.fn(),
      activateSelection: vi.fn(),
    };

    renderWithRouter('/search');
    fireEvent.keyDown(window, { key: 'j' });

    expect(selectNext).not.toHaveBeenCalled();
  });
});

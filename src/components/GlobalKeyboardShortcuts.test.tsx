import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalKeyboardShortcuts from './GlobalKeyboardShortcuts';
import type { ShortcutBindings } from '@/lib/keyboardShortcuts';

let bindingsMock: ShortcutBindings = {
  focus_search: '/',
  open_books: 'b',
  open_settings: ',',
  result_next: 'n',
  result_prev: 'm',
};
let searchInputMock: HTMLInputElement | null = null;
const getResultListControllerMock = vi.fn();

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
    getResultListController: getResultListControllerMock,
  }),
}));

function LocationSpy() {
  const location = useLocation();
  return (
    <>
      <div data-testid="path">{location.pathname}</div>
      <div data-testid="full-path">{`${location.pathname}${location.search}`}</div>
    </>
  );
}

function renderWithRouter(initialEntry: string | { pathname: string; search?: string; state?: unknown } = '/about') {
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
      result_next: 'n',
      result_prev: 'm',
    };
    searchInputMock = null;
    getResultListControllerMock.mockReset();
  });

  it('navigates to search when focus shortcut is pressed with no active search input', async () => {
    renderWithRouter('/about');

    fireEvent.keyDown(window, { key: '/' });

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/search');
    });
  });

  it('preserves searchReturnTo query context when slash shortcut is pressed', async () => {
    renderWithRouter({
      pathname: '/sermons/sermon-1',
      search: '?q=leadership',
      state: { searchReturnTo: '/search?q=only+believe&sort=date-desc&view=table&page=2' },
    });

    fireEvent.keyDown(window, { key: '/' });

    await waitFor(() => {
      expect(screen.getByTestId('full-path')).toHaveTextContent(
        '/search?q=only+believe&sort=date-desc&view=table&page=2',
      );
    });
  });

  it('falls back to current URL query when slash shortcut has no return state', async () => {
    renderWithRouter('/sermons/sermon-1?q=the+token');

    fireEvent.keyDown(window, { key: '/' });

    await waitFor(() => {
      expect(screen.getByTestId('full-path')).toHaveTextContent('/search?q=the+token');
    });
  });

  it('preserves match options from the current URL when slash shortcut falls back', async () => {
    renderWithRouter('/sermons/sermon-1?q=Only+Believe&matchCase=1&wholeWord=1');

    fireEvent.keyDown(window, { key: '/' });

    await waitFor(() => {
      expect(screen.getByTestId('full-path')).toHaveTextContent(
        '/search?q=Only+Believe&matchCase=1&wholeWord=1',
      );
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

  it('does not route j/k/Enter through result-list shortcuts anymore', () => {
    const selectNext = vi.fn();
    const selectPrevious = vi.fn();
    const activateSelection = vi.fn();

    getResultListControllerMock.mockReturnValue({
      hasItems: () => true,
      selectNext,
      selectPrevious,
      activateSelection,
    });

    renderWithRouter('/search');

    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'k' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(selectNext).not.toHaveBeenCalled();
    expect(selectPrevious).not.toHaveBeenCalled();
    expect(activateSelection).not.toHaveBeenCalled();
    expect(screen.getByTestId('path')).toHaveTextContent('/search');
  });
});

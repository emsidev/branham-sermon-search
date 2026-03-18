import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalNavbar from './GlobalNavbar';

let instantSearchEnabledMock = true;

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    bindings: {
      focus_search: '/',
      open_books: 'b',
      open_settings: ',',
      result_next: 'n',
      result_prev: 'm',
      toggle_reading_mode: 'r',
      cycle_highlight_mode: 'h',
      reader_extend_selection: 'ArrowRight',
      reader_shrink_selection: 'ArrowLeft',
    },
    syncStatus: 'synced',
    syncWarning: null,
    setShortcutBinding: vi.fn(),
    resetShortcutBinding: vi.fn(),
    resetAllShortcutBindings: vi.fn(),
    registerSearchInputResolver: () => () => undefined,
    getSearchInputElement: () => null,
    registerResultListController: () => () => undefined,
    getResultListController: () => null,
  }),
  useShortcutSearchInputRegistration: vi.fn(),
}));

vi.mock('@/lib/preferences', () => ({
  getInstantSearchEnabled: () => instantSearchEnabledMock,
}));

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value,
  });
}

function LocationSpy() {
  const location = useLocation();
  return <div data-testid="path">{`${location.pathname}${location.search}`}</div>;
}

function renderNavbar(initialEntry = '/books') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="*"
          element={(
            <>
              <GlobalNavbar />
              <LocationSpy />
            </>
          )}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('GlobalNavbar', () => {
  beforeEach(() => {
    instantSearchEnabledMock = true;
    setScrollY(0);
  });

  it('stays sticky and toggles visibility by scroll direction', () => {
    renderNavbar('/books');

    const header = screen.getByRole('banner');
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('translate-y-0');

    act(() => {
      setScrollY(140);
      window.dispatchEvent(new Event('scroll'));
    });

    expect(header.className).toContain('-translate-y-full');

    act(() => {
      setScrollY(40);
      window.dispatchEvent(new Event('scroll'));
    });

    expect(header.className).toContain('translate-y-0');
  });

  it('hides logo/search on home and renders both on non-home routes', () => {
    const homeRender = renderNavbar('/');
    expect(screen.queryByRole('link', { name: 'the table search' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Search sermons')).not.toBeInTheDocument();
    homeRender.unmount();

    const booksRender = renderNavbar('/books');
    expect(screen.getByRole('link', { name: 'the table search' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search sermons')).toBeInTheDocument();
    booksRender.unmount();

    renderNavbar('/search?q=faith');

    expect(screen.getByRole('link', { name: 'the table search' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search sermons')).toBeInTheDocument();
  });

  it('redirects to /search while typing on non-search routes when instant search is on', async () => {
    instantSearchEnabledMock = true;
    renderNavbar('/about');

    fireEvent.change(screen.getByLabelText('Search sermons'), {
      target: { value: 'amen' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/search?q=amen&sort=relevance-desc&view=card&wholeWord=1');
    });
  });

  it('waits for Enter before redirecting when instant search is off', async () => {
    instantSearchEnabledMock = false;
    renderNavbar('/about');
    const input = screen.getByLabelText('Search sermons');

    fireEvent.change(input, {
      target: { value: 'amen' },
    });
    expect(screen.getByTestId('path')).toHaveTextContent('/about');

    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/search?q=amen&sort=relevance-desc&view=card&wholeWord=1');
    });
  });

  it('updates search-route query params in place and clears page while preserving other filters', async () => {
    renderNavbar('/search?q=old&sort=date-desc&view=table&page=3&year=1965');

    fireEvent.change(screen.getByLabelText('Search sermons'), {
      target: { value: 'new phrase' },
    });

    await waitFor(() => {
      const path = screen.getByTestId('path').textContent ?? '';
      const [pathname, rawQuery] = path.split('?');
      const params = new URLSearchParams(rawQuery ?? '');

      expect(pathname).toBe('/search');
      expect(params.get('q')).toBe('new phrase');
      expect(params.get('sort')).toBe('date-desc');
      expect(params.get('view')).toBe('table');
      expect(params.get('year')).toBe('1965');
      expect(params.has('page')).toBe(false);
    });
  });

  it('updates match mode params from header controls on /search', async () => {
    renderNavbar('/search?q=amen&sort=relevance-desc&view=card&page=4&wholeWord=1');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle match case' }));

    await waitFor(() => {
      const path = screen.getByTestId('path').textContent ?? '';
      expect(path).toContain('/search?');
      expect(path).toContain('matchCase=1');
      expect(path).toContain('wholeWord=1');
      expect(path).not.toContain('page=');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Toggle fuzzy search' }));

    await waitFor(() => {
      const path = screen.getByTestId('path').textContent ?? '';
      expect(path).toContain('fuzzy=1');
      expect(path).not.toContain('matchCase=1');
      expect(path).not.toContain('wholeWord=1');
    });
  });
});

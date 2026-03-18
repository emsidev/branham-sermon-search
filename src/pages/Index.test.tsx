import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Index from './Index';
import { SEARCH_HISTORY_STORAGE_KEY } from '@/lib/searchHistory';

const useSermonsMock = vi.fn();
const useKeyboardNavMock = vi.fn();
const navigateMock = vi.fn();
let instantSearchEnabledMock = true;
const setInstantSearchEnabledMock = vi.fn();
const localStorageState = new Map<string, string>();

vi.mock('@/hooks/useSermons', () => ({
  useSermons: () => useSermonsMock(),
}));

vi.mock('@/hooks/useKeyboardNav', () => ({
  useKeyboardNav: (...args: unknown[]) => useKeyboardNavMock(...args),
}));

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

vi.mock('@/lib/viewTransition', () => ({
  runWithViewTransition: (callback: () => void) => callback(),
}));

vi.mock('@/lib/preferences', () => ({
  getInstantSearchEnabled: () => instantSearchEnabledMock,
  setInstantSearchEnabled: (enabled: boolean) => {
    instantSearchEnabledMock = enabled;
    setInstantSearchEnabledMock(enabled);
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderIndex() {
  return render(
    <MemoryRouter>
      <Index />
    </MemoryRouter>
  );
}

function createLocalStorageMock(): Storage {
  return {
    get length() {
      return localStorageState.size;
    },
    clear: () => {
      localStorageState.clear();
    },
    getItem: (key: string) => localStorageState.get(key) ?? null,
    key: (index: number) => Array.from(localStorageState.keys())[index] ?? null,
    removeItem: (key: string) => {
      localStorageState.delete(key);
    },
    setItem: (key: string, value: string) => {
      localStorageState.set(key, String(value));
    },
  };
}

describe('Index', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      value: createLocalStorageMock(),
    });
    localStorageState.clear();
    window.localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
    instantSearchEnabledMock = true;
    setInstantSearchEnabledMock.mockReset();

    navigateMock.mockReset();
    useKeyboardNavMock.mockReset();
    useSermonsMock.mockReset();
    useSermonsMock.mockReturnValue({
      years: [1958, 1972, 1975],
    });
  });

  it('renders the hero page content', () => {
    renderIndex();

    expect(screen.getByText('the table search')).toBeInTheDocument();
    expect(screen.getByText('a fast, modern browser for the table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle fuzzy search' })).toBeInTheDocument();
    expect(screen.getByText('1958')).toBeInTheDocument();
    expect(screen.getByText('1972')).toBeInTheDocument();
  });

  it('navigates to search route on submit with canonical params', () => {
    instantSearchEnabledMock = false;
    renderIndex();

    const searchInput = screen.getByLabelText('Search sermons');
    fireEvent.change(searchInput, {
      target: { value: '  only believe  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    expect(navigateMock).toHaveBeenCalledWith(
      '/search?q=only+believe&sort=relevance-desc&view=card&wholeWord=1',
      expect.objectContaining({
        state: expect.objectContaining({
          source: 'home',
          autofocus: true,
          caret: expect.any(Number),
          requestId: expect.any(String),
        }),
      })
    );
  });

  it('does not navigate when query is empty', () => {
    renderIndex();

    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('navigates instantly while typing when instant search is on', () => {
    instantSearchEnabledMock = true;
    renderIndex();

    fireEvent.change(screen.getByLabelText('Search sermons'), {
      target: { value: 'amen' },
    });

    expect(navigateMock).toHaveBeenCalledWith(
      '/search?q=amen&sort=relevance-desc&view=card&wholeWord=1',
      expect.objectContaining({
        state: expect.objectContaining({
          source: 'home',
          autofocus: true,
          caret: expect.any(Number),
          requestId: expect.any(String),
        }),
      })
    );
  });

  it('does not navigate during IME composition until composition ends', () => {
    instantSearchEnabledMock = true;
    renderIndex();
    const searchInput = screen.getByLabelText('Search sermons');

    fireEvent.compositionStart(searchInput);
    fireEvent.change(searchInput, {
      target: { value: '\u30a2' },
    });
    expect(navigateMock).not.toHaveBeenCalled();

    fireEvent.compositionEnd(searchInput);

    expect(
      navigateMock.mock.calls.some((call) => (
        typeof call[0] === 'string'
        && call[0] === '/search?q=%E3%82%A2&sort=relevance-desc&view=card&wholeWord=1'
      ))
    ).toBe(true);
  });

  it('applies match toggles to search navigation URLs', () => {
    instantSearchEnabledMock = true;
    renderIndex();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.change(input, {
      target: { value: 'amen' },
    });
    navigateMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle match case' }));
    expect(navigateMock).toHaveBeenCalledWith(
      '/search?q=amen&sort=relevance-desc&view=card&matchCase=1&wholeWord=1',
      expect.any(Object),
    );

    navigateMock.mockClear();
    fireEvent.keyDown(input, { key: 'w', altKey: true });
    expect(navigateMock).toHaveBeenCalledWith(
      '/search?q=amen&sort=relevance-desc&view=card&matchCase=1&wholeWord=0',
      expect.any(Object),
    );
  });

  it('applies fuzzy toggle to search navigation URL with one click', () => {
    instantSearchEnabledMock = true;
    renderIndex();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.change(input, {
      target: { value: 'amen' },
    });
    navigateMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle fuzzy search' }));

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(
      '/search?q=amen&sort=relevance-desc&view=card&fuzzy=1',
      expect.any(Object),
    );
  });

  it('supports Alt+F fuzzy shortcut and disables Aa/W while fuzzy is active', () => {
    instantSearchEnabledMock = true;
    renderIndex();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.change(input, { target: { value: 'amen' } });
    navigateMock.mockClear();

    fireEvent.keyDown(input, { key: 'f', altKey: true });
    expect(navigateMock).toHaveBeenCalledWith(
      '/search?q=amen&sort=relevance-desc&view=card&fuzzy=1',
      expect.any(Object),
    );

    const matchCaseButton = screen.getByRole('button', { name: 'Toggle match case' });
    const wholeWordButton = screen.getByRole('button', { name: 'Toggle whole word' });
    expect(matchCaseButton).toBeDisabled();
    expect(wholeWordButton).toBeDisabled();
  });

  it('shows recent searches dropdown on focus when query is empty', () => {
    window.localStorage.setItem(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(['Seven Seals', 'Pillar of Fire']),
    );
    renderIndex();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.focus(input);

    expect(screen.getByTestId('search-history-dropdown')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use recent search Seven Seals' })).toBeInTheDocument();
  });

  it('navigates immediately when selecting a recent search from dropdown', () => {
    window.localStorage.setItem(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(['Seven Seals', 'Pillar of Fire']),
    );
    renderIndex();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.focus(input);
    fireEvent.click(screen.getByRole('button', { name: 'Use recent search Seven Seals' }));

    expect(navigateMock).toHaveBeenCalledWith(
      '/search?q=Seven+Seals&sort=relevance-desc&view=card&wholeWord=1',
      expect.objectContaining({
        state: expect.objectContaining({
          source: 'home',
          autofocus: true,
          caret: 'Seven Seals'.length,
        }),
      }),
    );
  });

  it('records history on blur when instant search is enabled', () => {
    instantSearchEnabledMock = true;
    renderIndex();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.change(input, { target: { value: '  pillar   of fire  ' } });
    fireEvent.blur(input);

    expect(window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY)).toBe(JSON.stringify(['pillar of fire']));
  });

  it('does not record history on blur when instant search is disabled', () => {
    instantSearchEnabledMock = false;
    renderIndex();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.change(input, { target: { value: '  pillar   of fire  ' } });
    fireEvent.blur(input);

    expect(window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY)).toBeNull();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SharedSearchExperience from './SharedSearchExperience';
import type { SearchHit } from '@/hooks/useSermons';
import { SEARCH_HISTORY_STORAGE_KEY } from '@/lib/searchHistory';

const useSermonsMock = vi.fn();
const setFiltersMock = vi.fn();
const setFilterMock = vi.fn();
const clearFiltersMock = vi.fn();
const localStorageState = new Map<string, string>();

vi.mock('@/hooks/useSermons', () => ({
  useSermons: () => useSermonsMock(),
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
  useShortcutResultListRegistration: vi.fn(),
}));

vi.mock('@/components/SermonPagination', () => ({
  default: () => <div data-testid="pagination" />,
}));

vi.mock('@/components/SearchHitsCards', () => ({
  default: ({ onHitNavigate }: { onHitNavigate?: () => void }) => (
    <button type="button" onClick={() => onHitNavigate?.()}>
      trigger-hit
    </button>
  ),
}));

vi.mock('@/components/SearchHitsTable', () => ({
  default: () => <div data-testid="table-view" />,
}));

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

const defaultHits: SearchHit[] = [
  {
    hit_id: 'hit-1',
    sermon_id: 'sermon-1',
    sermon_code: '65-1010',
    title: 'Leadership',
    summary: null,
    date: '1965-10-10',
    location: 'Jeffersonville, IN',
    paragraph_number: 4,
    printed_paragraph_number: 4,
    chunk_index: 1,
    chunk_total: 1,
    match_source: 'paragraph_text',
    snippet: 'Leadership and faith...',
    relevance: 5.1,
    is_exact_match: true,
    tags: [],
    total_count: 1,
  },
];

function buildUseSermonsMockValue(overrides?: Partial<ReturnType<typeof useSermonsMock>>) {
  return {
    searchHits: defaultHits,
    isSearchMode: true,
    total: 1,
    loading: false,
    filters: {
      q: 'leadership',
      year: '',
      title: '',
      location: '',
      page: 1,
      sort: 'relevance-desc',
      view: 'card',
      matchCase: false,
      wholeWord: false,
      fuzzy: false,
    },
    setFilter: setFilterMock,
    setFilters: setFiltersMock,
    clearFilters: clearFiltersMock,
    years: [1965, 1964],
    titles: ['Leadership', 'Only Believe'],
    locations: ['Jeffersonville, IN', 'Phoenix, AZ'],
    pageSize: 25,
    ...overrides,
  };
}

function renderSharedSearch() {
  return render(
    <MemoryRouter initialEntries={['/sermons/sermon-1?q=leadership']}>
      <SharedSearchExperience surface="modal" />
    </MemoryRouter>
  );
}

describe('SharedSearchExperience', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      value: createLocalStorageMock(),
    });
    localStorageState.clear();
    window.localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
    setFilterMock.mockReset();
    setFiltersMock.mockReset();
    clearFiltersMock.mockReset();
    useSermonsMock.mockReset();
    useSermonsMock.mockReturnValue(buildUseSermonsMockValue());
  });

  it('renders modal surface without page header chrome', () => {
    renderSharedSearch();

    expect(screen.getByLabelText('Search sermons')).toBeInTheDocument();
    expect(screen.queryByText('the table search')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'search' })).toBeInTheDocument();
  });

  it('focuses input when modal focus request is active', async () => {
    const onInputFocusHandled = vi.fn();

    render(
      <MemoryRouter initialEntries={['/sermons/sermon-1?q=leadership']}>
        <SharedSearchExperience
          surface="modal"
          shouldFocusInput
          onInputFocusHandled={onInputFocusHandled}
        />
      </MemoryRouter>
    );

    const input = screen.getByLabelText('Search sermons');
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
    expect(onInputFocusHandled).toHaveBeenCalledTimes(1);
  });

  it('forwards hit navigation callback from modal results', () => {
    const onHitNavigate = vi.fn();

    render(
      <MemoryRouter initialEntries={['/sermons/sermon-1?q=leadership']}>
        <SharedSearchExperience surface="modal" onHitNavigate={onHitNavigate} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'trigger-hit' }));
    expect(onHitNavigate).toHaveBeenCalledTimes(1);
  });

  it('toggles match options from search bar controls', () => {
    renderSharedSearch();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle match case' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle whole word' }));

    expect(setFiltersMock).toHaveBeenCalledWith({ matchCase: true });
    expect(setFiltersMock).toHaveBeenCalledWith({ wholeWord: true });
  });

  it('toggles fuzzy mode from search bar controls', () => {
    renderSharedSearch();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle fuzzy search' }));
    expect(setFiltersMock).toHaveBeenCalledWith({ fuzzy: true });
  });

  it('turning fuzzy on uses a single atomic mode patch', () => {
    useSermonsMock.mockReturnValue(buildUseSermonsMockValue({
      filters: {
        q: 'leadership',
        year: '',
        title: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: true,
        wholeWord: true,
        fuzzy: false,
      },
    }));
    renderSharedSearch();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle fuzzy search' }));

    expect(setFiltersMock).toHaveBeenCalledTimes(1);
    expect(setFiltersMock).toHaveBeenCalledWith({ fuzzy: true });
  });

  it('supports Alt+C and Alt+W on focused search input', () => {
    renderSharedSearch();
    const input = screen.getByLabelText('Search sermons');

    fireEvent.keyDown(input, { key: 'c', altKey: true });
    fireEvent.keyDown(input, { key: 'w', altKey: true });
    fireEvent.keyDown(input, { key: 'c', altKey: true, ctrlKey: true });

    expect(setFiltersMock).toHaveBeenCalledWith({ matchCase: true });
    expect(setFiltersMock).toHaveBeenCalledWith({ wholeWord: true });
    expect(setFiltersMock).toHaveBeenCalledTimes(2);
  });

  it('supports Alt+F on focused search input and avoids modifier conflicts', () => {
    renderSharedSearch();
    const input = screen.getByLabelText('Search sermons');

    fireEvent.keyDown(input, { key: 'f', altKey: true });
    fireEvent.keyDown(input, { key: 'f', altKey: true, ctrlKey: true });

    expect(setFiltersMock).toHaveBeenCalledWith({ fuzzy: true });
    expect(setFiltersMock).toHaveBeenCalledTimes(1);
  });

  it('disables strict match toggles while fuzzy mode is enabled', () => {
    useSermonsMock.mockReturnValue(buildUseSermonsMockValue({
      filters: {
        q: 'leadership',
        year: '',
        title: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: false,
        wholeWord: false,
        fuzzy: true,
      },
    }));
    renderSharedSearch();

    const input = screen.getByLabelText('Search sermons');
    const matchCaseButton = screen.getByRole('button', { name: 'Toggle match case' });
    const wholeWordButton = screen.getByRole('button', { name: 'Toggle whole word' });

    expect(matchCaseButton).toBeDisabled();
    expect(wholeWordButton).toBeDisabled();

    fireEvent.keyDown(input, { key: 'c', altKey: true });
    fireEvent.keyDown(input, { key: 'w', altKey: true });
    expect(setFiltersMock).not.toHaveBeenCalled();
  });

  it('renders filter trigger beside sort and hides badge at zero active filters', () => {
    renderSharedSearch();

    const sortSelect = screen.getByLabelText('Sort search results');
    const controlRow = sortSelect.closest('div');
    expect(controlRow).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Open filters' })).toBeInTheDocument();
    expect(screen.queryByTestId('filter-count-badge')).not.toBeInTheDocument();
  });

  it('opens filter popup from trigger and renders filter controls', () => {
    renderSharedSearch();

    fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));

    expect(screen.getByLabelText('Filter by year')).toHaveDisplayValue('All years');
    expect(screen.getByLabelText('Filter by sermon title')).toHaveDisplayValue('All titles');
    expect(screen.getByLabelText('Filter by location')).toHaveDisplayValue('All locations');
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDisabled();
  });

  it('updates year filter when a year option is selected', () => {
    renderSharedSearch();

    fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));
    fireEvent.change(screen.getByLabelText('Filter by year'), { target: { value: '1965' } });

    expect(setFilterMock).toHaveBeenCalledWith('year', '1965');
  });

  it('updates title filter when a title option is selected', () => {
    renderSharedSearch();

    fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));
    fireEvent.change(screen.getByLabelText('Filter by sermon title'), { target: { value: 'Leadership' } });

    expect(setFilterMock).toHaveBeenCalledWith('title', 'Leadership');
  });

  it('updates location filter when a location option is selected', () => {
    renderSharedSearch();

    fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));
    fireEvent.change(screen.getByLabelText('Filter by location'), { target: { value: 'Phoenix, AZ' } });

    expect(setFilterMock).toHaveBeenCalledWith('location', 'Phoenix, AZ');
  });

  it('shows selected filter count badge from 1 to 3', () => {
    useSermonsMock.mockReturnValue(buildUseSermonsMockValue({
      filters: {
        q: 'leadership',
        year: '1965',
        title: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: false,
        wholeWord: false,
        fuzzy: false,
      },
    }));
    const { rerender } = renderSharedSearch();
    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('1');

    useSermonsMock.mockReturnValue(buildUseSermonsMockValue({
      filters: {
        q: 'leadership',
        year: '1965',
        title: 'Leadership',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: false,
        wholeWord: false,
        fuzzy: false,
      },
    }));
    rerender(
      <MemoryRouter initialEntries={['/sermons/sermon-1?q=leadership']}>
        <SharedSearchExperience surface="modal" />
      </MemoryRouter>
    );
    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('2');

    useSermonsMock.mockReturnValue(buildUseSermonsMockValue({
      filters: {
        q: 'leadership',
        year: '1965',
        title: 'Leadership',
        location: 'Phoenix, AZ',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: false,
        wholeWord: false,
        fuzzy: false,
      },
    }));
    rerender(
      <MemoryRouter initialEntries={['/sermons/sermon-1?q=leadership']}>
        <SharedSearchExperience surface="modal" />
      </MemoryRouter>
    );
    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('3');
  });

  it('clears filters from popup and reflects zero badge after rerender', () => {
    useSermonsMock.mockReturnValue(buildUseSermonsMockValue({
      filters: {
        q: 'leadership',
        year: '1965',
        title: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: false,
        wholeWord: false,
        fuzzy: false,
      },
    }));

    const { rerender } = renderSharedSearch();
    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(clearFiltersMock).toHaveBeenCalledTimes(1);

    useSermonsMock.mockReturnValue(buildUseSermonsMockValue());
    rerender(
      <MemoryRouter initialEntries={['/sermons/sermon-1?q=leadership']}>
        <SharedSearchExperience surface="modal" />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('filter-count-badge')).not.toBeInTheDocument();
  });

  it('saves submitted search text to local history', () => {
    useSermonsMock.mockReturnValue(buildUseSermonsMockValue({
      searchHits: [],
      isSearchMode: false,
      total: 0,
      filters: {
        q: '',
        year: '',
        title: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: false,
        wholeWord: false,
        fuzzy: false,
      },
    }));

    renderSharedSearch();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.change(input, { target: { value: '  Pillar   of Fire  ' } });
    fireEvent.submit(input.closest('form')!);

    expect(setFilterMock).toHaveBeenCalledWith('q', 'Pillar   of Fire');
    expect(window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY)).toBe(JSON.stringify(['Pillar of Fire']));
  });

  it('records search history on blur when instant search is enabled', () => {
    useSermonsMock.mockReturnValue(buildUseSermonsMockValue({
      searchHits: [],
      isSearchMode: false,
      total: 0,
      filters: {
        q: '',
        year: '',
        title: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: false,
        wholeWord: false,
        fuzzy: false,
      },
    }));

    renderSharedSearch();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.change(input, { target: { value: '  steadfast  faith  ' } });
    fireEvent.blur(input);

    expect(window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY)).toBe(JSON.stringify(['steadfast faith']));
  });

  it('does not record history on blur when instant search is disabled', () => {
    window.localStorage.setItem('message-search.instant-search-enabled', 'false');
    useSermonsMock.mockReturnValue(buildUseSermonsMockValue({
      searchHits: [],
      isSearchMode: false,
      total: 0,
      filters: {
        q: '',
        year: '',
        title: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: false,
        wholeWord: false,
        fuzzy: false,
      },
    }));

    renderSharedSearch();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.change(input, { target: { value: '  steadfast  faith  ' } });
    fireEvent.blur(input);

    expect(window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY)).toBeNull();
  });

  it('shows search history dropdown when input is focused and empty', () => {
    window.localStorage.setItem(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(['Seven Seals', 'Leadership']),
    );
    useSermonsMock.mockReturnValue(buildUseSermonsMockValue({
      searchHits: [],
      isSearchMode: false,
      total: 0,
      filters: {
        q: '',
        year: '',
        title: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: false,
        wholeWord: false,
        fuzzy: false,
      },
    }));

    renderSharedSearch();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.focus(input);

    expect(screen.getByTestId('search-history-dropdown')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use recent search Seven Seals' })).toBeInTheDocument();
  });

  it('hides search history dropdown when typing a non-empty query', () => {
    window.localStorage.setItem(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(['Seven Seals', 'Leadership']),
    );
    useSermonsMock.mockReturnValue(buildUseSermonsMockValue({
      searchHits: [],
      isSearchMode: false,
      total: 0,
      filters: {
        q: '',
        year: '',
        title: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: false,
        wholeWord: false,
        fuzzy: false,
      },
    }));

    renderSharedSearch();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.focus(input);
    expect(screen.getByTestId('search-history-dropdown')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'sea' } });
    expect(screen.queryByTestId('search-history-dropdown')).not.toBeInTheDocument();
  });

  it('reuses a search history entry from dropdown click', () => {
    window.localStorage.setItem(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(['Seven Seals', 'Leadership']),
    );
    useSermonsMock.mockReturnValue(buildUseSermonsMockValue({
      searchHits: [],
      isSearchMode: false,
      total: 0,
      filters: {
        q: '',
        year: '',
        title: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: false,
        wholeWord: false,
        fuzzy: false,
      },
    }));

    renderSharedSearch();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.focus(input);
    fireEvent.click(screen.getByRole('button', { name: 'Use recent search Seven Seals' }));

    expect(setFilterMock).toHaveBeenCalledWith('q', 'Seven Seals');
  });

  it('hides search history dropdown on blur and Escape', () => {
    window.localStorage.setItem(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(['Seven Seals', 'Leadership']),
    );
    useSermonsMock.mockReturnValue(buildUseSermonsMockValue({
      searchHits: [],
      isSearchMode: false,
      total: 0,
      filters: {
        q: '',
        year: '',
        title: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: false,
        wholeWord: false,
        fuzzy: false,
      },
    }));

    renderSharedSearch();

    const input = screen.getByLabelText('Search sermons');
    fireEvent.focus(input);
    expect(screen.getByTestId('search-history-dropdown')).toBeInTheDocument();

    fireEvent.blur(input);
    expect(screen.queryByTestId('search-history-dropdown')).not.toBeInTheDocument();

    fireEvent.focus(input);
    expect(screen.getByTestId('search-history-dropdown')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('search-history-dropdown')).not.toBeInTheDocument();
  });
});


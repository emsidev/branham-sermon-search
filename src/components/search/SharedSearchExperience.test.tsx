import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SharedSearchExperience from './SharedSearchExperience';
import type { SearchHit } from '@/hooks/useSermons';

const useSermonsMock = vi.fn();
const setFilterMock = vi.fn();
const clearFiltersMock = vi.fn();

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
    },
    setFilter: setFilterMock,
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
    setFilterMock.mockReset();
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

    expect(setFilterMock).toHaveBeenCalledWith('matchCase', true);
    expect(setFilterMock).toHaveBeenCalledWith('wholeWord', true);
  });

  it('supports Alt+C and Alt+W on focused search input', () => {
    renderSharedSearch();
    const input = screen.getByLabelText('Search sermons');

    fireEvent.keyDown(input, { key: 'c', altKey: true });
    fireEvent.keyDown(input, { key: 'w', altKey: true });
    fireEvent.keyDown(input, { key: 'c', altKey: true, ctrlKey: true });

    expect(setFilterMock).toHaveBeenCalledWith('matchCase', true);
    expect(setFilterMock).toHaveBeenCalledWith('wholeWord', true);
    expect(setFilterMock).toHaveBeenCalledTimes(2);
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
});


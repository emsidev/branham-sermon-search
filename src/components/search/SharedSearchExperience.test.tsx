import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SharedSearchExperience from './SharedSearchExperience';
import type { SearchHit } from '@/hooks/useSermons';

const useSermonsMock = vi.fn();
const setFilterMock = vi.fn();

vi.mock('@/hooks/useSermons', () => ({
  useSermons: () => useSermonsMock(),
}));

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    bindings: {
      focus_search: '/',
      open_books: 'b',
      open_settings: ',',
      result_next: 'j',
      result_prev: 'k',
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
    useSermonsMock.mockReset();
    useSermonsMock.mockReturnValue({
      searchHits: defaultHits,
      isSearchMode: true,
      total: 1,
      loading: false,
      filters: {
        q: 'leadership',
        year: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
      },
      setFilter: setFilterMock,
      pageSize: 25,
    });
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
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchPage from './Search';
import type { SearchHit } from '@/hooks/useSermons';

const useSermonsMock = vi.fn();
const useKeyboardNavMock = vi.fn();
const setFilterMock = vi.fn();
let instantSearchEnabledMock = true;
const setInstantSearchEnabledMock = vi.fn();

const defaultSearchHits: SearchHit[] = [
  {
    hit_id: 'normal-hit',
    sermon_id: 's2',
    sermon_code: '63-0317M',
    title: 'God Hiding Himself',
    date: '1963-03-17',
    location: 'Jeffersonville, IN',
    paragraph_number: 1,
    printed_paragraph_number: 1,
    chunk_index: 1,
    chunk_total: 1,
    match_source: 'paragraph_text',
    snippet: 'God hiding Himself in simplicity...',
    relevance: 3.4,
    is_exact_match: false,
    total_count: 2,
  },
  {
    hit_id: 'phrase-hit',
    sermon_id: 's1',
    sermon_code: '58-0105',
    title: 'Have Faith in God',
    date: '1958-01-05',
    location: 'Jeffersonville, IN',
    paragraph_number: 1,
    printed_paragraph_number: 1,
    chunk_index: 1,
    chunk_total: 2,
    match_source: 'paragraph_text',
    snippet: 'standing, just bow our heads for a moment of prayer. Lord, it is good to be here into this fellowship.',
    relevance: 2.1,
    is_exact_match: false,
    total_count: 2,
  },
];

vi.mock('@/hooks/useSermons', () => ({
  useSermons: () => useSermonsMock(),
}));

vi.mock('@/hooks/useKeyboardNav', () => ({
  useKeyboardNav: (...args: unknown[]) => useKeyboardNavMock(...args),
}));

vi.mock('@/lib/preferences', () => ({
  INSTANT_SEARCH_STORAGE_KEY: 'message-search.instant-search-enabled',
  getInstantSearchEnabled: () => instantSearchEnabledMock,
  setInstantSearchEnabled: (enabled: boolean) => {
    instantSearchEnabledMock = enabled;
    setInstantSearchEnabledMock(enabled);
  },
}));

vi.mock('@/components/SermonPagination', () => ({
  default: () => <div data-testid="pagination" />,
}));

vi.mock('@/components/SearchHitsCards', () => ({
  default: ({ hits }: { hits: Array<{ title: string; is_exact_match: boolean }> }) => (
    <div data-testid="cards-view">
      <div data-testid="cards-count">{hits.length}</div>
      {hits.map((hit) => (
        <div key={hit.title} data-testid="card-hit">
          <span data-testid="card-hit-title">{hit.title}</span>
          {hit.is_exact_match && <span>exact</span>}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/SearchHitsTable', () => ({
  default: ({ hits }: { hits: Array<{ title: string; is_exact_match: boolean }> }) => (
    <div data-testid="table-view">
      <div data-testid="table-count">{hits.length}</div>
      {hits.map((hit) => (
        <div key={hit.title} data-testid="table-hit">
          <span data-testid="table-hit-title">{hit.title}</span>
          {hit.is_exact_match && <span>exact</span>}
        </div>
      ))}
    </div>
  ),
}));

function renderSearchPage() {
  return render(
    <MemoryRouter>
      <SearchPage />
    </MemoryRouter>
  );
}

describe('SearchPage', () => {
  beforeEach(() => {
    instantSearchEnabledMock = true;
    setInstantSearchEnabledMock.mockReset();
    setFilterMock.mockReset();
    useKeyboardNavMock.mockReset();
    useSermonsMock.mockReset();
    useSermonsMock.mockReturnValue({
      searchHits: defaultSearchHits,
      isSearchMode: true,
      total: 2,
      loading: false,
      filters: {
        q: 'Lord, it is good to be here',
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

  it('prioritizes exact phrase matches at the top of card results', () => {
    renderSearchPage();

    expect(screen.queryByText('Exact match')).not.toBeInTheDocument();
    expect(screen.queryByTestId('exact-title-card')).not.toBeInTheDocument();
    expect(screen.getByText('Found 2 hits')).toBeInTheDocument();
    expect(screen.getByTestId('cards-count')).toHaveTextContent('2');
    const cardTitles = screen.getAllByTestId('card-hit-title').map((item) => item.textContent);
    expect(cardTitles[0]).toBe('Have Faith in God');
    expect(screen.getAllByText('exact')).toHaveLength(1);
  });

  it('renders exact-title top card for exact title queries in card view', () => {
    useSermonsMock.mockReturnValue({
      searchHits: defaultSearchHits,
      isSearchMode: true,
      total: 2,
      loading: false,
      filters: {
        q: 'have faith in God',
        year: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
      },
      setFilter: setFilterMock,
      pageSize: 25,
    });

    renderSearchPage();

    const exactTitleCard = screen.getByTestId('exact-title-card');
    expect(exactTitleCard).toBeInTheDocument();
    expect(screen.getByText('Book title match')).toBeInTheDocument();
    expect(screen.getAllByText('Have Faith in God').length).toBeGreaterThan(0);
    expect(exactTitleCard).toHaveAttribute('href', expect.stringContaining('/sermons/s1?'));
  });

  it('renders exact-title top card for exact title queries in table view', () => {
    useSermonsMock.mockReturnValue({
      searchHits: defaultSearchHits,
      isSearchMode: true,
      total: 2,
      loading: false,
      filters: {
        q: 'have faith in God',
        year: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'table',
      },
      setFilter: setFilterMock,
      pageSize: 25,
    });

    renderSearchPage();

    expect(screen.getByTestId('exact-title-card')).toBeInTheDocument();
    expect(screen.getByTestId('table-view')).toBeInTheDocument();
  });

  it('updates sort and view through controls', () => {
    renderSearchPage();

    fireEvent.change(screen.getByLabelText('Sort search results'), {
      target: { value: 'date-desc' },
    });
    expect(setFilterMock).toHaveBeenCalledWith('sort', 'date-desc');

    fireEvent.click(screen.getByRole('button', { name: 'Table view' }));
    expect(setFilterMock).toHaveBeenCalledWith('view', 'table');
  });

  it('runs search on submit only when instant search is off', () => {
    instantSearchEnabledMock = false;
    renderSearchPage();
    setFilterMock.mockClear();

    fireEvent.change(screen.getByLabelText('Search sermons'), {
      target: { value: 'new phrase' },
    });
    expect(setFilterMock).not.toHaveBeenCalledWith('q', 'new phrase');

    fireEvent.submit(screen.getByLabelText('Search sermons').closest('form')!);
    expect(setFilterMock).toHaveBeenCalledWith('q', 'new phrase');
  });
});

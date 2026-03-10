import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchPage from './Search';
import type { SearchHit } from '@/hooks/useSermons';
import type { HomeSearchTransitionState } from '@/lib/searchNavigation';

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
    summary: null,
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
    tags: ['doctrine'],
    total_count: 2,
  },
  {
    hit_id: 'phrase-hit',
    sermon_id: 's1',
    sermon_code: '58-0105',
    title: 'Have Faith in God',
    summary: 'Brother Branham opens the campaign with faith-centered encouragement.',
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
    tags: ['faith'],
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

function renderSearchPage(
  initialEntries: Array<string | { pathname: string; search?: string; state?: unknown }> = ['/search']
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
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
    expect(screen.getByText('faith')).toBeInTheDocument();
    expect(screen.getByTestId('book-match-summary')).toHaveTextContent(
      'Brother Branham opens the campaign with faith-centered encouragement.'
    );
    expect(screen.getAllByText('Have Faith in God').length).toBeGreaterThan(0);
    expect(exactTitleCard).toHaveAttribute('href', expect.stringContaining('/sermons/s1?'));
  });

  it('omits book-match summary when the exact title hit has no summary', () => {
    useSermonsMock.mockReturnValue({
      searchHits: [
        {
          ...defaultSearchHits[1],
          summary: null,
        },
      ],
      isSearchMode: true,
      total: 1,
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

    expect(screen.getByTestId('exact-title-card')).toBeInTheDocument();
    expect(screen.queryByTestId('book-match-summary')).not.toBeInTheDocument();
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

  it('marks phrase matches as exact even when backend exact is false', () => {
    useSermonsMock.mockReturnValue({
      searchHits: [
        {
          ...defaultSearchHits[0],
          title: 'The Faith Move',
          snippet: 'A different message body.',
          relevance: 5,
        },
        {
          ...defaultSearchHits[1],
          title: 'Have Faith In God',
          snippet: 'Samson could beat down a thousand Philistines with a jawbone.',
          relevance: 1,
          is_exact_match: false,
        },
      ],
      isSearchMode: true,
      total: 2,
      loading: false,
      filters: {
        q: 'down a thousand Philistines',
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

    const cardTitles = screen.getAllByTestId('card-hit-title').map((item) => item.textContent);
    expect(cardTitles[0]).toBe('Have Faith In God');
    expect(screen.getAllByText('exact')).toHaveLength(1);
  });

  it('marks exact only for the chunk containing the full contiguous phrase sequence', () => {
    useSermonsMock.mockReturnValue({
      searchHits: [
        {
          ...defaultSearchHits[0],
          hit_id: 'same-para:chunk:2',
          paragraph_number: 44,
          printed_paragraph_number: 44,
          chunk_index: 2,
          chunk_total: 2,
          title: 'Chunk Without Phrase',
          snippet: "It's a man, a brother. And the brother has been in a house.",
          relevance: 9,
          is_exact_match: false,
        },
        {
          ...defaultSearchHits[0],
          hit_id: 'same-para:chunk:1',
          paragraph_number: 44,
          printed_paragraph_number: 44,
          chunk_index: 1,
          chunk_total: 2,
          title: 'Chunk With Phrase',
          snippet: "someone. It's a relative. It's a man. It's her brother.",
          relevance: 1,
          is_exact_match: false,
        },
      ],
      isSearchMode: true,
      total: 2,
      loading: false,
      filters: {
        q: 'someone its a relative its a man its her brother',
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

    const cardTitles = screen.getAllByTestId('card-hit-title').map((item) => item.textContent);
    expect(cardTitles[0]).toBe('Chunk With Phrase');
    expect(screen.getAllByText('exact')).toHaveLength(1);
  });

  it('treats punctuation and case differences as exact phrase matches', () => {
    useSermonsMock.mockReturnValue({
      searchHits: defaultSearchHits,
      isSearchMode: true,
      total: 2,
      loading: false,
      filters: {
        q: 'LORD it is good: to be here',
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

    expect(screen.getAllByText('exact')).toHaveLength(1);
    const cardTitles = screen.getAllByTestId('card-hit-title').map((item) => item.textContent);
    expect(cardTitles[0]).toBe('Have Faith in God');
  });

  it('treats apostrophe variants as exact phrase matches', () => {
    useSermonsMock.mockReturnValue({
      searchHits: [
        {
          ...defaultSearchHits[0],
          title: 'Contraction Variant',
          snippet: '... but she’s had an experience and she’d had a testimony ...',
          relevance: 5,
          is_exact_match: false,
        },
      ],
      isSearchMode: true,
      total: 1,
      loading: false,
      filters: {
        q: 'shes had an experience',
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

    expect(screen.getByText('exact')).toBeInTheDocument();
  });

  it('does not mark exact when the query only appears inside larger words', () => {
    useSermonsMock.mockReturnValue({
      searchHits: [
        {
          ...defaultSearchHits[0],
          title: 'Within Him',
          snippet: 'The promise was fulfilled within the people.',
          match_source: 'paragraph_text',
          is_exact_match: false,
          relevance: 5,
        },
      ],
      isSearchMode: true,
      total: 1,
      loading: false,
      filters: {
        q: 'in',
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

    const cardsView = screen.getByTestId('cards-view');
    expect(within(cardsView).queryByText('exact')).not.toBeInTheDocument();
  });

  it('does not mark paragraph hits exact from title text alone', () => {
    useSermonsMock.mockReturnValue({
      searchHits: [
        {
          ...defaultSearchHits[1],
          title: 'Have Faith In God',
          snippet: 'Power demonstrated, it ought to rise in you.',
          match_source: 'paragraph_text',
          is_exact_match: false,
        },
      ],
      isSearchMode: true,
      total: 1,
      loading: false,
      filters: {
        q: 'have faith in god',
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

    const cardsView = screen.getByTestId('cards-view');
    expect(within(cardsView).queryByText('exact')).not.toBeInTheDocument();
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

  it('focuses the nav search input and restores the caret for home transfer state', async () => {
    const transitionState: HomeSearchTransitionState = {
      source: 'home',
      autofocus: true,
      requestId: 'home-transition-1',
      caret: 5,
    };

    renderSearchPage([{ pathname: '/search', state: transitionState }]);

    const searchInput = screen.getByLabelText('Search sermons') as HTMLInputElement;
    await waitFor(() => {
      expect(document.activeElement).toBe(searchInput);
    });
    expect(searchInput.selectionStart).toBe(5);
    expect(searchInput.selectionEnd).toBe(5);
    expect(searchInput.closest('div')).toHaveClass('home-search-fallback-enter');
  });

  it('defaults the caret to the end of text when home transfer state omits caret', async () => {
    const transitionState: HomeSearchTransitionState = {
      source: 'home',
      autofocus: true,
      requestId: 'home-transition-2',
    };

    renderSearchPage([{ pathname: '/search', state: transitionState }]);

    const searchInput = screen.getByLabelText('Search sermons') as HTMLInputElement;
    await waitFor(() => {
      expect(document.activeElement).toBe(searchInput);
    });
    const textLength = searchInput.value.length;
    expect(searchInput.selectionStart).toBe(textLength);
    expect(searchInput.selectionEnd).toBe(textLength);
  });

  it('does not force autofocus for non-home route state', () => {
    renderSearchPage([{ pathname: '/search', state: { source: 'books', autofocus: true, requestId: 'x' } }]);

    const searchInput = screen.getByLabelText('Search sermons');
    expect(document.activeElement).not.toBe(searchInput);
    expect(searchInput.closest('div')).not.toHaveClass('home-search-fallback-enter');
  });
});

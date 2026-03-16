import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SermonDetail from './SermonDetail';

const fetchSermonByIdMock = vi.fn();
const fetchAdjacentSermonsMock = vi.fn();
const fetchBoundarySermonsMock = vi.fn();
const useSermonsMock = vi.fn();
const setFilterMock = vi.fn();
let effectiveHitScrollBehaviorMock: ScrollBehavior = 'smooth';

vi.mock('@/hooks/useSermons', () => ({
  useSermons: () => useSermonsMock(),
  fetchSermonById: (...args: unknown[]) => fetchSermonByIdMock(...args),
  fetchAdjacentSermons: (...args: unknown[]) => fetchAdjacentSermonsMock(...args),
  fetchBoundarySermons: (...args: unknown[]) => fetchBoundarySermonsMock(...args),
}));

vi.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({ play: vi.fn() }),
}));

vi.mock('@/lib/preferences', () => ({
  getEffectiveHitScrollBehavior: () => effectiveHitScrollBehaviorMock,
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

vi.mock('@/components/SermonBreadcrumb', () => ({
  default: ({ rootHref }: { rootHref?: string }) => (
    <a data-testid="breadcrumb-root" href={rootHref ?? '/'}>
      breadcrumb
    </a>
  ),
}));

const sermonDetailFixture = {
  id: 'sermon-1',
  sermon_code: '65-1010',
  title: 'Leadership',
  summary: 'A compact summary of the sermon content.',
  date: '1965-10-10',
  year: 1965,
  location: 'Jeffersonville, IN',
  city: null,
  state: null,
  scripture: null,
  tags: [],
  text_content: 'First I am looking forward to this week. Later i am looking forward to that.',
  fts: null,
  created_at: '2026-03-09T00:00:00.000Z',
  updated_at: '2026-03-09T00:00:00.000Z',
  pdf_source_path: null,
  audio_url: null,
  duration_seconds: null,
  paragraphs: [
    {
      paragraph_number: 4,
      printed_paragraph_number: 4,
      paragraph_text: 'First I am looking forward to this week. Later i am looking forward to that.',
    },
  ],
};

function renderDetail(entry: string | { pathname: string; search?: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/sermons/:id"
          element={(
            <>
              <SermonDetail />
              <LocationStateSpy />
            </>
          )}
        />
      </Routes>
    </MemoryRouter>
  );
}

function LocationStateSpy() {
  const location = useLocation();
  return (
    <>
      <div data-testid="location-path">{`${location.pathname}${location.search}`}</div>
      <div data-testid="location-state">{JSON.stringify(location.state ?? null)}</div>
    </>
  );
}

function getActiveMatch(): HTMLElement | null {
  return document.querySelector<HTMLElement>('mark[data-search-match="true"][data-search-match-active="true"]');
}

describe('SermonDetail', () => {
  beforeEach(() => {
    fetchSermonByIdMock.mockReset();
    fetchAdjacentSermonsMock.mockReset();
    fetchBoundarySermonsMock.mockReset();
    useSermonsMock.mockReset();
    setFilterMock.mockReset();
    fetchSermonByIdMock.mockResolvedValue(sermonDetailFixture);
    fetchAdjacentSermonsMock.mockResolvedValue({ prev: null, next: null });
    fetchBoundarySermonsMock.mockResolvedValue({
      first: { id: 'sermon-first', title: 'First Sermon', date: '1957-01-01' },
      last: { id: 'sermon-last', title: 'Last Sermon', date: '1965-12-31' },
    });
    useSermonsMock.mockReturnValue({
      searchHits: [
        {
          hit_id: 'hit-1',
          sermon_id: 'sermon-2',
          sermon_code: '62-0715',
          title: 'Believing In Action',
          summary: null,
          date: '1962-07-15',
          location: 'Jeffersonville, IN',
          paragraph_number: 2,
          printed_paragraph_number: 2,
          chunk_index: 1,
          chunk_total: 1,
          match_source: 'paragraph_text',
          snippet: 'Only believe, all things are possible...',
          relevance: 4.1,
          is_exact_match: true,
          tags: [],
          total_count: 1,
        },
      ],
      isSearchMode: true,
      total: 1,
      loading: false,
      filters: {
        q: 'only believe',
        year: '',
        location: '',
        page: 1,
        sort: 'relevance-desc',
        view: 'card',
        matchCase: false,
        wholeWord: false,
      },
      setFilter: setFilterMock,
      pageSize: 25,
    });

    effectiveHitScrollBehaviorMock = 'smooth';

    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {};
    }

    vi.useRealTimers();
  });

  it('activates chunk target from route params for paragraph-text search hits', async () => {
    renderDetail('/sermons/sermon-1?q=i%20am%20looking%20forward&source=paragraph_text&paragraph=4&hit=sermon-1:para:4:chunk:2');

    await waitFor(() => {
      expect(document.querySelectorAll('mark[data-search-match="true"]')).toHaveLength(2);
    });

    const active = getActiveMatch();
    expect(active).not.toBeNull();
    expect(active).toHaveTextContent('i am looking forward');
    expect(active).toHaveAttribute('data-search-match-origin', 'paragraph');
    expect(active).toHaveAttribute('data-search-match-paragraph', '4');
    expect(active).toHaveAttribute('data-search-match-local-index', '1');
  });

  it('activates first title match when source is title', async () => {
    renderDetail('/sermons/sermon-1?q=lead&source=title&hit=sermon-1:title&wholeWord=0');

    await waitFor(() => {
      expect(document.querySelectorAll('mark[data-search-match="true"]')).toHaveLength(1);
    });

    const active = getActiveMatch();
    expect(active).not.toBeNull();
    expect(active).toHaveTextContent('Lead');
    expect(active).toHaveAttribute('data-search-match-origin', 'title');
  });

  it('renders stronger dim style for non-active hits', async () => {
    renderDetail('/sermons/sermon-1?q=i%20am%20looking%20forward');

    await waitFor(() => {
      expect(document.querySelectorAll('mark[data-search-match="true"]')).toHaveLength(2);
    });

    const matches = Array.from(document.querySelectorAll<HTMLElement>('mark[data-search-match="true"]'));
    const dimmed = matches.find((element) => element.getAttribute('data-search-match-active') === 'false');
    expect(dimmed).toBeDefined();
    expect(dimmed).toHaveClass('bg-yellow-200/10');
    expect(dimmed).toHaveClass('text-foreground/45');
  });

  it('opens global search modal from toolbar or F key, but ignores Ctrl/Cmd+F', async () => {
    renderDetail('/sermons/sermon-1?q=i%20am%20looking%20forward');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /find/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /find/i }));
    expect(screen.getByRole('dialog', { name: 'Search popup' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search sermons')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort search results')).toBeInTheDocument();
    expect(screen.queryByLabelText('Find in sermon')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close search popup' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Search popup' })).not.toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'f' });
    expect(screen.getByRole('dialog', { name: 'Search popup' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close search popup' }));

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'f', metaKey: true });
    expect(screen.queryByRole('dialog', { name: 'Search popup' })).not.toBeInTheDocument();
  });

  it('closes global search modal after selecting a search hit', async () => {
    renderDetail('/sermons/sermon-1?q=i%20am%20looking%20forward');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /find/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /find/i }));
    expect(screen.getByRole('dialog', { name: 'Search popup' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Believing In Action'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Search popup' })).not.toBeInTheDocument();
    });
  });

  it('uses auto scroll behavior when effective preference resolves to auto', async () => {
    effectiveHitScrollBehaviorMock = 'auto';
    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});

    renderDetail('/sermons/sermon-1?q=i%20am%20looking%20forward');

    await waitFor(() => {
      expect(document.querySelectorAll('mark[data-search-match="true"]')).toHaveLength(2);
      expect(scrollSpy).toHaveBeenCalled();
    });

    const scrollOptions = scrollSpy.mock.calls[0]?.[0] as ScrollIntoViewOptions;
    expect(scrollOptions).toEqual(expect.objectContaining({ behavior: 'auto', block: 'center' }));
    scrollSpy.mockRestore();
  });

  it('uses smooth scroll behavior when effective preference resolves to smooth', async () => {
    effectiveHitScrollBehaviorMock = 'smooth';
    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});

    renderDetail('/sermons/sermon-1?q=i%20am%20looking%20forward');

    await waitFor(() => {
      expect(document.querySelectorAll('mark[data-search-match="true"]')).toHaveLength(2);
      expect(scrollSpy).toHaveBeenCalled();
    });

    const scrollOptions = scrollSpy.mock.calls[0]?.[0] as ScrollIntoViewOptions;
    expect(scrollOptions).toEqual(expect.objectContaining({ behavior: 'smooth', block: 'center' }));
    scrollSpy.mockRestore();
  });

  it('navigates to next adjacent sermon first hit with m and preserves query context', async () => {
    fetchAdjacentSermonsMock.mockResolvedValue({
      prev: { id: 'sermon-0', title: 'Prev', date: '1965-10-09' },
      next: { id: 'sermon-2', title: 'Next', date: '1965-10-11' },
    });

    renderDetail('/sermons/sermon-1?q=only+believe&source=paragraph_text&paragraph=4&hit=sermon-1:para:4:chunk:2');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /find/i })).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'm' });

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/sermons/sermon-2?q=only+believe');
    });
    expect(screen.getByTestId('location-path')).not.toHaveTextContent('source=');
    expect(screen.getByTestId('location-path')).not.toHaveTextContent('paragraph=');
    expect(screen.getByTestId('location-path')).not.toHaveTextContent('hit=');
    expect(fetchSermonByIdMock).toHaveBeenCalledWith('sermon-2');
  });

  it('navigates to previous adjacent sermon with Shift+M and preserves searchReturnTo state', async () => {
    fetchAdjacentSermonsMock.mockResolvedValue({
      prev: { id: 'sermon-0', title: 'Prev', date: '1965-10-09' },
      next: { id: 'sermon-2', title: 'Next', date: '1965-10-11' },
    });

    renderDetail({
      pathname: '/sermons/sermon-1',
      search: '?q=only+believe',
      state: { searchReturnTo: '/search?q=only+believe&sort=date-desc&view=table&page=4' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /find/i })).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'M', shiftKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/sermons/sermon-0?q=only+believe');
    });
    expect(screen.getByTestId('location-state')).toHaveTextContent(
      '"searchReturnTo":"/search?q=only+believe&sort=date-desc&view=table&page=4"',
    );
  });

  it('wraps m to the first sermon when there is no next adjacent sermon', async () => {
    fetchAdjacentSermonsMock.mockResolvedValue({
      prev: { id: 'sermon-0', title: 'Prev', date: '1965-10-09' },
      next: null,
    });
    fetchBoundarySermonsMock.mockResolvedValue({
      first: { id: 'sermon-first', title: 'First Sermon', date: '1957-01-01' },
      last: { id: 'sermon-last', title: 'Last Sermon', date: '1965-12-31' },
    });

    renderDetail('/sermons/sermon-1?q=only+believe');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /find/i })).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'm' });

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/sermons/sermon-first?q=only+believe');
    });
  });

  it('wraps Shift+M to the last sermon when there is no previous adjacent sermon', async () => {
    fetchAdjacentSermonsMock.mockResolvedValue({
      prev: null,
      next: { id: 'sermon-2', title: 'Next', date: '1965-10-11' },
    });
    fetchBoundarySermonsMock.mockResolvedValue({
      first: { id: 'sermon-first', title: 'First Sermon', date: '1957-01-01' },
      last: { id: 'sermon-last', title: 'Last Sermon', date: '1965-12-31' },
    });

    renderDetail('/sermons/sermon-1?q=only+believe');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /find/i })).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'M', shiftKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/sermons/sermon-last?q=only+believe');
    });
  });

  it('prefers navigation state search return target for breadcrumb root link', async () => {
    renderDetail({
      pathname: '/sermons/sermon-1',
      search: '?q=only+believe',
      state: { searchReturnTo: '/search?q=only+believe&sort=date-desc&view=table&page=4' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('breadcrumb-root')).toBeInTheDocument();
    });

    expect(screen.getByTestId('breadcrumb-root')).toHaveAttribute(
      'href',
      '/search?q=only+believe&sort=date-desc&view=table&page=4',
    );
  });

  it('falls back to query-only search route when navigation state is missing', async () => {
    renderDetail('/sermons/sermon-1?q=only+believe');

    await waitFor(() => {
      expect(screen.getByTestId('breadcrumb-root')).toBeInTheDocument();
    });

    expect(screen.getByTestId('breadcrumb-root')).toHaveAttribute('href', '/search?q=only+believe&wholeWord=1');
  });

  it('includes match options in breadcrumb fallback when present in route query', async () => {
    renderDetail('/sermons/sermon-1?q=Only+Believe&matchCase=1&wholeWord=1');

    await waitFor(() => {
      expect(screen.getByTestId('breadcrumb-root')).toBeInTheDocument();
    });

    expect(screen.getByTestId('breadcrumb-root')).toHaveAttribute(
      'href',
      '/search?q=Only+Believe&matchCase=1&wholeWord=1',
    );
  });

  it('falls back to /search when no query or return state exists', async () => {
    renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(screen.getByTestId('breadcrumb-root')).toBeInTheDocument();
    });

    expect(screen.getByTestId('breadcrumb-root')).toHaveAttribute('href', '/search?wholeWord=1');
  });
});


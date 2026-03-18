import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SermonDetail from './SermonDetail';
import type { ShortcutBindings } from '@/lib/keyboardShortcuts';

const fetchSermonByIdMock = vi.fn();
const fetchAdjacentSermonsMock = vi.fn();
const fetchBoundarySermonsMock = vi.fn();
const useSermonsMock = vi.fn();
const setFilterMock = vi.fn();
const setFiltersMock = vi.fn();
let audioUrlMock: string | null = null;
let effectiveHitScrollBehaviorMock: ScrollBehavior = 'smooth';
let shortcutBindingsMock: ShortcutBindings = {
  focus_search: '/',
  open_books: 'b',
  open_settings: ',',
  result_next: 'n',
  result_prev: 'm',
  toggle_reading_mode: 'r',
};

vi.mock('@/hooks/useSermons', () => ({
  useSermons: () => useSermonsMock(),
  fetchSermonById: (...args: unknown[]) => fetchSermonByIdMock(...args),
  fetchAdjacentSermons: (...args: unknown[]) => fetchAdjacentSermonsMock(...args),
  fetchBoundarySermons: (...args: unknown[]) => fetchBoundarySermonsMock(...args),
}));

vi.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({ play: vi.fn(), url: audioUrlMock }),
}));

vi.mock('@/lib/preferences', () => ({
  getEffectiveHitScrollBehavior: () => effectiveHitScrollBehaviorMock,
  getInstantSearchEnabled: () => true,
}));

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    bindings: shortcutBindingsMock,
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
      <div data-testid="location-key">{location.key}</div>
      <div data-testid="location-state">{JSON.stringify(location.state ?? null)}</div>
    </>
  );
}

function getActiveMatch(): HTMLElement | null {
  return document.querySelector<HTMLElement>('mark[data-search-match="true"][data-search-match-active="true"]');
}

function getReaderWords(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-reader-word="true"]'));
}

function getSelectedReaderWords(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-reader-word="true"][data-reader-word-selected="true"]'));
}

function getReaderWordByIndex(index: number): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-reader-word="true"][data-reader-word-index="${index}"]`);
}

function getSelectedReaderWordIndexes(): number[] {
  return getSelectedReaderWords()
    .map((element) => Number.parseInt(element.getAttribute('data-reader-word-index') ?? '', 10))
    .filter((value) => Number.isFinite(value));
}

describe('SermonDetail', () => {
  beforeEach(() => {
    fetchSermonByIdMock.mockReset();
    fetchAdjacentSermonsMock.mockReset();
    fetchBoundarySermonsMock.mockReset();
    useSermonsMock.mockReset();
    setFilterMock.mockReset();
    setFiltersMock.mockReset();
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
      setFilters: setFiltersMock,
      pageSize: 25,
    });

    audioUrlMock = null;
    effectiveHitScrollBehaviorMock = 'smooth';
    shortcutBindingsMock = {
      focus_search: '/',
      open_books: 'b',
      open_settings: ',',
      result_next: 'n',
      result_prev: 'm',
      toggle_reading_mode: 'r',
    };

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

    await waitFor(() => {
      expect(getActiveMatch()).not.toBeNull();
    });

    const active = getActiveMatch();
    expect(active).not.toBeNull();
    expect(active).toHaveTextContent('i am looking forward');
    expect(active).toHaveAttribute('data-search-match-origin', 'paragraph');
    expect(active).toHaveAttribute('data-search-match-paragraph', '4');
    expect(active).toHaveAttribute('data-search-match-local-index', '1');
  });

  it('activates and scrolls fuzzy paragraph hits from route context without needing exact whole-word matches', async () => {
    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});

    renderDetail('/sermons/sermon-1?q=i%20am%20lookng%20forward&source=paragraph_text&paragraph=4&hit=sermon-1:para:4:chunk:2&fuzzy=1');

    await waitFor(() => {
      expect(document.querySelectorAll('mark[data-search-match="true"]').length).toBeGreaterThanOrEqual(2);
      expect(scrollSpy).toHaveBeenCalled();
    });

    const active = getActiveMatch();
    expect(active).not.toBeNull();
    expect(active).toHaveTextContent('forward');
    expect(active).toHaveAttribute('data-search-match-origin', 'paragraph');
    expect(active).toHaveAttribute('data-search-match-paragraph', '4');
    expect(active).toHaveAttribute('data-search-match-local-index', '1');
    scrollSpy.mockRestore();
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

  it('requires click to start selection and supports cumulative extend/shrink with clamping', async () => {
    renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });

    expect(getSelectedReaderWords()).toHaveLength(0);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(getSelectedReaderWords()).toHaveLength(0);

    const totalWords = getReaderWords().length;
    const firstWord = getReaderWordByIndex(0);
    expect(firstWord).not.toBeNull();
    fireEvent.click(firstWord!);
    expect(getSelectedReaderWordIndexes()).toEqual([0]);

    fireEvent.keyDown(window, { key: ' ' });
    expect(getSelectedReaderWordIndexes()).toEqual([0, 1]);
    const selectedSeparators = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reader-word-separator-selected="true"]'),
    );
    expect(selectedSeparators.length).toBeGreaterThan(0);
    expect(selectedSeparators.some((element) => /\s/.test(element.textContent ?? ''))).toBe(true);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(getSelectedReaderWordIndexes()).toEqual([0, 1, 2]);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(getSelectedReaderWordIndexes()).toEqual([0, 1]);

    fireEvent.keyDown(window, { key: ' ', shiftKey: true });
    expect(getSelectedReaderWordIndexes()).toEqual([0]);

    fireEvent.keyDown(window, { key: ' ', shiftKey: true });
    expect(getSelectedReaderWords()).toHaveLength(0);

    fireEvent.click(firstWord!);
    expect(getSelectedReaderWordIndexes()).toEqual([0]);

    for (let index = 0; index < totalWords + 5; index += 1) {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    }

    expect(getSelectedReaderWords()).toHaveLength(totalWords);
    expect(getSelectedReaderWordIndexes()[totalWords - 1]).toBe(totalWords - 1);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(getSelectedReaderWords()).toHaveLength(totalWords);

    const resetTargetWord = getReaderWordByIndex(5);
    expect(resetTargetWord).not.toBeNull();
    fireEvent.click(resetTargetWord!);
    expect(getSelectedReaderWordIndexes()).toEqual([5]);
  });

  it('keeps word-by-word navigation active in reading mode', async () => {
    renderDetail('/sermons/sermon-1?reading=1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: 'Toggle reading mode' })).toHaveAttribute('aria-pressed', 'true');
    });

    expect(getSelectedReaderWords()).toHaveLength(0);
    const firstWord = getReaderWordByIndex(0);
    expect(firstWord).not.toBeNull();
    fireEvent.click(firstWord!);
    expect(getSelectedReaderWordIndexes()).toEqual([0]);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(getSelectedReaderWordIndexes()).toEqual([0, 1]);
  });

  it('combines word-by-word highlighting with existing search-match highlighting', async () => {
    renderDetail('/sermons/sermon-1?q=i%20am%20looking%20forward');

    await waitFor(() => {
      expect(document.querySelectorAll('mark[data-search-match="true"]')).toHaveLength(2);
      expect(getActiveMatch()).not.toBeNull();
      expect(getReaderWords().length).toBeGreaterThan(0);
    });

    expect(document.querySelector('mark[data-search-match="true"] [data-reader-word="true"]')).not.toBeNull();
    expect(getSelectedReaderWords()).toHaveLength(0);

    const firstWord = getReaderWordByIndex(0);
    expect(firstWord).not.toBeNull();
    fireEvent.click(firstWord!);
    expect(getSelectedReaderWordIndexes()).toEqual([0]);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(getSelectedReaderWordIndexes()).toEqual([0, 1]);

    expect(document.querySelectorAll('mark[data-search-match="true"]')).toHaveLength(2);
    expect(getActiveMatch()).not.toBeNull();
  });

  it('does not move word-by-word cursor when a typing target has focus', async () => {
    renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });

    const firstWord = getReaderWordByIndex(0);
    expect(firstWord).not.toBeNull();
    fireEvent.click(firstWord!);
    expect(getSelectedReaderWordIndexes()).toEqual([0]);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: 'ArrowRight' });

    expect(getSelectedReaderWordIndexes()).toEqual([0]);
    input.remove();
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

  it('enables reading mode from URL state and hides non-reading chrome', async () => {
    fetchAdjacentSermonsMock.mockResolvedValue({
      prev: { id: 'sermon-0', title: 'Prev Sermon', date: '1965-10-09' },
      next: { id: 'sermon-2', title: 'Next Sermon', date: '1965-10-11' },
    });

    renderDetail('/sermons/sermon-1?q=only+believe&reading=1');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Toggle reading mode' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Toggle reading mode' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('breadcrumb-root')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sermon-meta-strip')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Jump to top' })).not.toBeInTheDocument();
    expect(screen.queryByText('Prev Sermon')).not.toBeInTheDocument();
    expect(screen.queryByText('Next Sermon')).not.toBeInTheDocument();
    expect(screen.getByTestId('sermon-title')).toHaveClass('text-lg');
    expect(screen.getByTestId('sermon-title')).toHaveClass('leading-snug');
    expect(screen.getByTestId('sermon-summary')).toHaveClass('text-xs');
    expect(screen.getAllByTestId('sermon-paragraph-text')[0]).toHaveClass('text-[1.5rem]');
    expect(screen.getAllByTestId('sermon-paragraph-text')[0]).toHaveClass('leading-10');
    expect(screen.getByRole('progressbar', { name: 'Sermon reading progress' })).toBeInTheDocument();
    expect(screen.getByTestId('sermon-progress-bar')).toBeInTheDocument();
  });

  it('keeps sticky sermon progress bar visible in normal and reading mode', async () => {
    renderDetail('/sermons/sermon-1?q=only+believe');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Toggle reading mode' })).toBeInTheDocument();
    });

    expect(screen.getByRole('progressbar', { name: 'Sermon reading progress' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle reading mode' }));
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/sermons/sermon-1?q=only+believe&reading=1');
    });

    expect(screen.getByRole('progressbar', { name: 'Sermon reading progress' })).toBeInTheDocument();
  });

  it('hides sticky sermon progress bar while audio player is active', async () => {
    audioUrlMock = 'https://example.com/audio.mp3';
    renderDetail('/sermons/sermon-1?q=only+believe');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Toggle reading mode' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('progressbar', { name: 'Sermon reading progress' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('sermon-progress-bar')).not.toBeInTheDocument();
  });

  it('toggles reading mode from header button and preserves existing route state', async () => {
    renderDetail({
      pathname: '/sermons/sermon-1',
      search: '?q=only+believe',
      state: { searchReturnTo: '/search?q=only+believe&sort=date-desc&view=table&page=4' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Toggle reading mode' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Toggle reading mode' }));
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/sermons/sermon-1?q=only+believe&reading=1');
    });
    expect(screen.getByTestId('location-state')).toHaveTextContent(
      '"searchReturnTo":"/search?q=only+believe&sort=date-desc&view=table&page=4"',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle reading mode' }));
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/sermons/sermon-1?q=only+believe');
    });
  });

  it('toggles reading mode from configurable keyboard shortcut', async () => {
    shortcutBindingsMock = {
      ...shortcutBindingsMock,
      toggle_reading_mode: 'x',
    };

    renderDetail('/sermons/sermon-1?q=only+believe');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Toggle reading mode' })).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'x' });
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/sermons/sermon-1?q=only+believe&reading=1');
    });

    fireEvent.keyDown(window, { key: 'X', shiftKey: true });
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/sermons/sermon-1?q=only+believe');
    });
  });

  it('pushes reading mode URL transitions instead of replacing history entries', async () => {
    renderDetail('/sermons/sermon-1?q=only+believe');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Toggle reading mode' })).toBeInTheDocument();
    });

    const initialKey = screen.getByTestId('location-key').textContent;
    fireEvent.click(screen.getByRole('button', { name: 'Toggle reading mode' }));
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/sermons/sermon-1?q=only+believe&reading=1');
    });
    const readingOnKey = screen.getByTestId('location-key').textContent;
    expect(readingOnKey).toBeTruthy();
    expect(readingOnKey).not.toBe(initialKey);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle reading mode' }));
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/sermons/sermon-1?q=only+believe');
    });
    const readingOffKey = screen.getByTestId('location-key').textContent;
    expect(readingOffKey).toBeTruthy();
    expect(readingOffKey).not.toBe(readingOnKey);
  });

  it('renders fixed sermon detail chevrons and disables lateral chevrons when no adjacent sermon exists', async () => {
    renderDetail('/sermons/sermon-1?q=only+believe');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Jump to top' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Previous sermon hit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next sermon hit' })).toBeDisabled();
  });

  it('scrolls to top when fixed up chevron is clicked', async () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    renderDetail('/sermons/sermon-1?q=only+believe');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Jump to top' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Jump to top' }));
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
    scrollSpy.mockRestore();
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

  it('navigates to next adjacent sermon from fixed right chevron and preserves query context', async () => {
    fetchAdjacentSermonsMock.mockResolvedValue({
      prev: { id: 'sermon-0', title: 'Prev', date: '1965-10-09' },
      next: { id: 'sermon-2', title: 'Next', date: '1965-10-11' },
    });

    renderDetail('/sermons/sermon-1?q=only+believe&source=paragraph_text&paragraph=4&hit=sermon-1:para:4:chunk:2');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next sermon hit' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next sermon hit' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/sermons/sermon-2?q=only+believe');
    });
    expect(screen.getByTestId('location-path')).not.toHaveTextContent('source=');
    expect(screen.getByTestId('location-path')).not.toHaveTextContent('paragraph=');
    expect(screen.getByTestId('location-path')).not.toHaveTextContent('hit=');
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

  it('includes fuzzy mode in breadcrumb fallback when present in route query', async () => {
    renderDetail('/sermons/sermon-1?q=Only+Believ&fuzzy=1');

    await waitFor(() => {
      expect(screen.getByTestId('breadcrumb-root')).toBeInTheDocument();
    });

    expect(screen.getByTestId('breadcrumb-root')).toHaveAttribute(
      'href',
      '/search?q=Only+Believ&fuzzy=1',
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


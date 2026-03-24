import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  toggle_slide_view: 'p',
  add_slide_highlight: 'g',
  cycle_highlight_mode: 'h',
  reader_extend_selection: 'ArrowRight',
  reader_shrink_selection: 'ArrowLeft',
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

const multiParagraphSermonDetailFixture = {
  ...sermonDetailFixture,
  text_content: 'First I am looking forward to this week.\n\nLater i am looking forward to that.',
  paragraphs: [
    {
      paragraph_number: 4,
      printed_paragraph_number: 4,
      paragraph_text: 'First I am looking forward to this week.',
    },
    {
      paragraph_number: 5,
      printed_paragraph_number: 5,
      paragraph_text: 'Later i am looking forward to that.',
    },
  ],
};

const longSlideSentenceSet = [
  'Faith gives us courage when the valley feels cold.',
  'Hope keeps speaking when fear would rather stay silent.',
  'Grace teaches us to be patient with one another.',
  'Truth steadies the heart when voices become noisy.',
  'Prayer turns anxious waiting into quiet confidence.',
  'Mercy keeps our words gentle when tempers rise.',
  'Love remembers people are more than their failures.',
  'Joy returns strength to weary souls in the night.',
];

const longSlideParagraphText = Array.from({ length: 5 }, () => longSlideSentenceSet.join(' ')).join(' ');

const longSlideSermonDetailFixture = {
  ...sermonDetailFixture,
  text_content: longSlideParagraphText,
  paragraphs: [
    {
      paragraph_number: 4,
      printed_paragraph_number: 4,
      paragraph_text: longSlideParagraphText,
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

function getHighlightModeButton(modeLabel: 'Word' | 'Sentence' | 'Paragraph'): HTMLElement {
  return screen.getByRole('button', { name: `Highlight mode ${modeLabel}` });
}

function getReaderTextOptionsPopup(): HTMLElement {
  return screen.getByTestId('reader-text-options-popup');
}

function getReaderSlideViewHint(): HTMLElement {
  return screen.getByTestId('reader-slide-view-hint');
}

function getReaderFullscreenSlideView(): HTMLElement {
  return screen.getByTestId('reader-fullscreen-slide-view');
}

function getReaderFullscreenSlideText(): HTMLElement {
  return screen.getByTestId('reader-fullscreen-slide-text');
}

async function selectReaderWordAndOpenOptionsPopup(wordIndex = 0): Promise<void> {
  const word = getReaderWordByIndex(wordIndex);
  expect(word).not.toBeNull();
  fireEvent.click(word!);
  await waitFor(() => {
    expect(getReaderTextOptionsPopup()).toBeInTheDocument();
  });
}

function createMockDomRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    width,
    height,
    top,
    right: left + width,
    bottom: top + height,
    left,
    toJSON: () => ({}),
  } as DOMRect;
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
      toggle_slide_view: 'p',
      add_slide_highlight: 'g',
      cycle_highlight_mode: 'h',
      reader_extend_selection: 'ArrowRight',
      reader_shrink_selection: 'ArrowLeft',
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
      expect(getActiveMatch()).not.toBeNull();
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

  it('defaults highlight mode to word and falls back to word for invalid query values', async () => {
    const { unmount } = renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);
    expect(getHighlightModeButton('Word')).toHaveAttribute('aria-pressed', 'true');

    unmount();
    renderDetail('/sermons/sermon-1?highlightMode=invalid');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);
    expect(getHighlightModeButton('Word')).toHaveAttribute('aria-pressed', 'true');
    expect(getHighlightModeButton('Sentence')).toHaveAttribute('aria-pressed', 'false');
    expect(getHighlightModeButton('Paragraph')).toHaveAttribute('aria-pressed', 'false');
  });

  it('updates URL and active state when highlight mode is toggled from highlighted text options popup', async () => {
    renderDetail('/sermons/sermon-1?q=only+believe');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);
    expect(getHighlightModeButton('Word')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(getHighlightModeButton('Sentence'));
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('highlightMode=sentence');
    });
    expect(getHighlightModeButton('Sentence')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(getHighlightModeButton('Paragraph'));
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('highlightMode=paragraph');
    });
    expect(getHighlightModeButton('Paragraph')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(getHighlightModeButton('Word'));
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('highlightMode=word');
    });
    expect(getHighlightModeButton('Word')).toHaveAttribute('aria-pressed', 'true');
  });

  it('cycles highlight mode from configurable keyboard shortcut and updates URL state', async () => {
    renderDetail('/sermons/sermon-1?q=only+believe');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);
    expect(getHighlightModeButton('Word')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(window, { key: 'h' });
    await waitFor(() => {
      expect(getHighlightModeButton('Sentence')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('location-path')).toHaveTextContent('highlightMode=sentence');
    });

    fireEvent.keyDown(window, { key: 'h' });
    await waitFor(() => {
      expect(getHighlightModeButton('Paragraph')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('location-path')).toHaveTextContent('highlightMode=paragraph');
    });
  });

  it('shows highlighted text options popup only after text is selected', async () => {
    renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });

    expect(screen.queryByTestId('reader-text-options-popup')).not.toBeInTheDocument();
    await selectReaderWordAndOpenOptionsPopup(0);
    expect(getReaderTextOptionsPopup()).toHaveTextContent('Highlighted Text Options');
    expect(screen.getByTestId('reader-slide-view-toggle')).toBeInTheDocument();
  });

  it('renders highlighted text options in a right-side drawer after text selection', async () => {
    renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);

    const popup = getReaderTextOptionsPopup();
    expect(popup.className).toContain('right-3');
    expect(popup.className).toContain('top-24');
    expect(screen.getByTestId('reader-highlight-mode-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('reader-slide-view-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('reader-slide-queue-hint')).toBeInTheDocument();
  });

  it('auto-hides highlighted text options drawer after 2.5 seconds of inactivity', async () => {
    vi.useFakeTimers();
    try {
      renderDetail('/sermons/sermon-1');

      await waitFor(() => {
        expect(getReaderWords().length).toBeGreaterThan(0);
      });
      await selectReaderWordAndOpenOptionsPopup(0);
      expect(getReaderTextOptionsPopup()).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(2499);
      });
      expect(getReaderTextOptionsPopup()).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      expect(screen.queryByTestId('reader-text-options-popup')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('pauses drawer auto-hide while interacting and resumes after interaction ends', async () => {
    vi.useFakeTimers();
    try {
      renderDetail('/sermons/sermon-1');

      await waitFor(() => {
        expect(getReaderWords().length).toBeGreaterThan(0);
      });
      await selectReaderWordAndOpenOptionsPopup(0);
      const popup = getReaderTextOptionsPopup();

      fireEvent.mouseEnter(popup);
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(getReaderTextOptionsPopup()).toBeInTheDocument();

      fireEvent.mouseLeave(getReaderTextOptionsPopup());
      await act(async () => {
        vi.advanceTimersByTime(2400);
      });
      expect(getReaderTextOptionsPopup()).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.queryByTestId('reader-text-options-popup')).not.toBeInTheDocument();

      await selectReaderWordAndOpenOptionsPopup(0);
      const highlightModeButton = getHighlightModeButton('Word');
      fireEvent.focus(highlightModeButton);
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(getReaderTextOptionsPopup()).toBeInTheDocument();

      fireEvent.blur(highlightModeButton);
      await act(async () => {
        vi.advanceTimersByTime(2500);
      });
      expect(screen.queryByTestId('reader-text-options-popup')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps keyboard shortcuts working after the drawer auto-hides', async () => {
    vi.useFakeTimers();
    try {
      renderDetail('/sermons/sermon-1?q=only+believe');

      await waitFor(() => {
        expect(getReaderWords().length).toBeGreaterThan(0);
      });
      await selectReaderWordAndOpenOptionsPopup(0);

      await act(async () => {
        vi.advanceTimersByTime(2500);
      });
      expect(screen.queryByTestId('reader-text-options-popup')).not.toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'h' });
      await waitFor(() => {
        expect(screen.getByTestId('location-path')).toHaveTextContent('highlightMode=sentence');
      });

      fireEvent.keyDown(window, { key: 'p' });
      await waitFor(() => {
        expect(screen.getByTestId('location-path')).toHaveTextContent('slide=1');
      });
      expect(getReaderFullscreenSlideView()).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not render highlighted text options popup before text selection exists', async () => {
    renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    expect(screen.queryByTestId('reader-text-options-popup')).not.toBeInTheDocument();
  });

  it('starts and exits fullscreen presentation from highlighted text options popup and updates URL state', async () => {
    renderDetail('/sermons/sermon-1?q=only+believe');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);

    fireEvent.click(screen.getByTestId('reader-slide-view-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('slide=1');
      expect(screen.getByTestId('location-path')).toHaveTextContent('slideStart=0');
      expect(screen.getByTestId('location-path')).toHaveTextContent('slideEnd=');
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('slidePage=');
    });
    expect(getReaderFullscreenSlideView()).toBeInTheDocument();
    expect(getReaderFullscreenSlideText()).toHaveTextContent('First');
    expect(screen.queryByTestId('sermon-detail-content')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'p' });
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('slide=1');
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('slideStart=');
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('slideEnd=');
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('slidePage=');
    });
    expect(screen.queryByTestId('reader-fullscreen-slide-view')).not.toBeInTheDocument();
  });

  it('toggles fullscreen presentation from configurable keyboard shortcut', async () => {
    shortcutBindingsMock = {
      ...shortcutBindingsMock,
      toggle_slide_view: 'x',
    };

    renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);

    fireEvent.keyDown(window, { key: 'x' });
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('slide=1');
    });
    expect(getReaderFullscreenSlideView()).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'X', shiftKey: true });
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('slide=1');
    });
    expect(screen.queryByTestId('reader-fullscreen-slide-view')).not.toBeInTheDocument();
  });

  it('shows hint and keeps presentation mode off when shortcut is pressed without selection', async () => {
    renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });

    fireEvent.keyDown(window, { key: 'p' });
    expect(getReaderSlideViewHint()).toHaveTextContent('Highlight text first to start presentation.');
    expect(screen.queryByTestId('reader-fullscreen-slide-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('location-path')).not.toHaveTextContent('slide=1');
  });

  it('adds highlighted passages to the presentation queue with g and auto-opens without query churn', async () => {
    fetchSermonByIdMock.mockResolvedValue(multiParagraphSermonDetailFixture);
    renderDetail('/sermons/sermon-1?highlightMode=paragraph');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });

    await selectReaderWordAndOpenOptionsPopup(0);
    expect(screen.getByTestId('reader-slide-queue-hint')).toHaveTextContent('Queued: 0');

    fireEvent.keyDown(window, { key: 'g' });
    await waitFor(() => {
      expect(getReaderFullscreenSlideView()).toBeInTheDocument();
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 1 / 1');
      expect(getReaderFullscreenSlideText()).toHaveTextContent('First I am looking forward to this week');
    });

    const openedPath = screen.getByTestId('location-path').textContent ?? '';
    fireEvent.keyDown(window, { key: 'p' });
    await waitFor(() => {
      expect(screen.queryByTestId('reader-fullscreen-slide-view')).not.toBeInTheDocument();
    });

    await selectReaderWordAndOpenOptionsPopup(8);
    expect(screen.getByTestId('reader-slide-queue-hint')).toHaveTextContent('Queued: 1');

    fireEvent.keyDown(window, { key: 'g' });
    await waitFor(() => {
      expect(getReaderFullscreenSlideView()).toBeInTheDocument();
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 1 / 2');
      expect(screen.getByTestId('location-path').textContent ?? '').toBe(openedPath);
    });

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 2 / 2');
      expect(getReaderFullscreenSlideText()).toHaveTextContent('Later i am looking forward to that');
      expect(screen.getByTestId('location-path').textContent ?? '').toBe(openedPath);
    });
  });

  it('keeps queue deduplicated and preserves mode-at-capture labels', async () => {
    renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);

    fireEvent.keyDown(window, { key: 'g' });
    await waitFor(() => {
      expect(getReaderFullscreenSlideView()).toBeInTheDocument();
      expect(screen.getByTestId('reader-fullscreen-slide-part-indicator')).toHaveTextContent('Selection 1 / 1');
    });

    fireEvent.keyDown(window, { key: 'p' });
    await waitFor(() => {
      expect(screen.queryByTestId('reader-fullscreen-slide-view')).not.toBeInTheDocument();
    });

    await selectReaderWordAndOpenOptionsPopup(0);
    fireEvent.keyDown(window, { key: 'g' });
    await waitFor(() => {
      expect(screen.getByTestId('reader-slide-view-hint')).toHaveTextContent('already in presentation queue');
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 1 / 1');
    });

    fireEvent.keyDown(window, { key: 'p' });
    await waitFor(() => {
      expect(screen.queryByTestId('reader-fullscreen-slide-view')).not.toBeInTheDocument();
    });

    await selectReaderWordAndOpenOptionsPopup(0);
    fireEvent.click(getHighlightModeButton('Sentence'));
    await waitFor(() => {
      expect(getHighlightModeButton('Sentence')).toHaveAttribute('aria-pressed', 'true');
    });
    fireEvent.keyDown(window, { key: 'g' });
    await waitFor(() => {
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 1 / 2');
    });

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByTestId('reader-fullscreen-slide-part-indicator')).toHaveTextContent('Sentence 2 / 2');
    });
  });

  it('shows add-to-queue hint and keeps presentation off when g is pressed without selection', async () => {
    renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });

    fireEvent.keyDown(window, { key: 'g' });
    expect(getReaderSlideViewHint()).toHaveTextContent('Highlight text first to add to presentation queue.');
    expect(screen.queryByTestId('reader-fullscreen-slide-view')).not.toBeInTheDocument();
  });

  it('paginates fullscreen presentation slides by paragraph with arrow and space shortcuts', async () => {
    fetchSermonByIdMock.mockResolvedValue(longSlideSermonDetailFixture);
    renderDetail('/sermons/sermon-1?highlightMode=paragraph');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);

    fireEvent.click(screen.getByTestId('reader-slide-view-toggle'));
    await waitFor(() => {
      expect(getReaderFullscreenSlideView()).toBeInTheDocument();
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 1 /');
      expect(screen.getByTestId('reader-fullscreen-slide-part-indicator')).toHaveTextContent('Paragraph 1 / 1');
    });

    const pageIndicator = screen.getByTestId('reader-fullscreen-slide-page-indicator');
    const parsed = pageIndicator.textContent?.match(/Slide\s+(\d+)\s*\/\s*(\d+)/);
    expect(parsed).not.toBeNull();
    const totalPages = Number.parseInt(parsed?.[2] ?? '1', 10);
    expect(totalPages).toBeGreaterThan(1);

    const openedPath = screen.getByTestId('location-path').textContent ?? '';

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 2 /');
      expect(screen.getByTestId('location-path').textContent ?? '').toBe(openedPath);
    });

    fireEvent.keyDown(window, { key: ' ' });
    const expectedAfterSpace = Math.min(3, totalPages);
    await waitFor(() => {
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent(`Slide ${expectedAfterSpace} /`);
      expect(screen.getByTestId('location-path').textContent ?? '').toBe(openedPath);
    });

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    const expectedAfterLeft = Math.max(1, expectedAfterSpace - 1);
    await waitFor(() => {
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent(`Slide ${expectedAfterLeft} /`);
      expect(screen.getByTestId('location-path').textContent ?? '').toBe(openedPath);
    });

    fireEvent.keyDown(window, { key: ' ', shiftKey: true });
    await waitFor(() => {
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent(`Slide ${Math.max(1, expectedAfterLeft - 1)} /`);
      expect(screen.getByTestId('location-path').textContent ?? '').toBe(openedPath);
    });
  });

  it('auto-appends next sentence when pressing next on the last slide in sentence mode', async () => {
    renderDetail('/sermons/sermon-1?highlightMode=sentence');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);

    fireEvent.click(screen.getByTestId('reader-slide-view-toggle'));
    await waitFor(() => {
      expect(getReaderFullscreenSlideView()).toBeInTheDocument();
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 1 / 1');
      expect(getReaderFullscreenSlideText()).toHaveTextContent('First I am looking forward to this week.');
    });

    const openedPath = screen.getByTestId('location-path').textContent ?? '';
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 2 / 2');
      expect(screen.getByTestId('reader-fullscreen-slide-part-indicator')).toHaveTextContent('Sentence 2 / 2');
      expect(getReaderFullscreenSlideText()).toHaveTextContent('Later i am looking forward to that.');
      expect(screen.getByTestId('location-path').textContent ?? '').toBe(openedPath);
    });
  });

  it('auto-appends next paragraph when pressing next on the last slide in paragraph mode', async () => {
    fetchSermonByIdMock.mockResolvedValue(multiParagraphSermonDetailFixture);
    renderDetail('/sermons/sermon-1?highlightMode=paragraph');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);

    fireEvent.click(screen.getByTestId('reader-slide-view-toggle'));
    await waitFor(() => {
      expect(getReaderFullscreenSlideView()).toBeInTheDocument();
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 1 / 1');
      expect(getReaderFullscreenSlideText()).toHaveTextContent('First I am looking forward to this week.');
    });

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 2 / 2');
      expect(screen.getByTestId('reader-fullscreen-slide-part-indicator')).toHaveTextContent('Paragraph 2 / 2');
      expect(getReaderFullscreenSlideText()).toHaveTextContent('Later i am looking forward to that.');
    });
  });

  it('shows end-of-sermon hint and keeps the same slide when there is no next unit to append', async () => {
    fetchSermonByIdMock.mockResolvedValue(multiParagraphSermonDetailFixture);
    renderDetail('/sermons/sermon-1?highlightMode=paragraph');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);

    fireEvent.click(screen.getByTestId('reader-slide-view-toggle'));
    await waitFor(() => {
      expect(getReaderFullscreenSlideView()).toBeInTheDocument();
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 1 / 1');
    });

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 2 / 2');
    });

    const lastPath = screen.getByTestId('location-path').textContent ?? '';
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(getReaderSlideViewHint()).toHaveTextContent('Reached end of sermon.');
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 2 / 2');
      expect(getReaderFullscreenSlideText()).toHaveTextContent('Later i am looking forward to that.');
      expect(screen.getByTestId('location-path').textContent ?? '').toBe(lastPath);
    });
  });

  it('auto-append works from URL-seeded presentation queue and keeps query stable', async () => {
    fetchSermonByIdMock.mockResolvedValue(multiParagraphSermonDetailFixture);
    renderDetail('/sermons/sermon-1?slide=1&slideStart=0&slideEnd=7&highlightMode=paragraph');

    await waitFor(() => {
      expect(getReaderFullscreenSlideView()).toBeInTheDocument();
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 1 / 1');
      expect(getReaderFullscreenSlideText()).toHaveTextContent('First I am looking forward to this week.');
    });

    const openedPath = screen.getByTestId('location-path').textContent ?? '';
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 2 / 2');
      expect(getReaderFullscreenSlideText()).toHaveTextContent('Later i am looking forward to that.');
      expect(screen.getByTestId('location-path').textContent ?? '').toBe(openedPath);
    });
  });

  it('splits oversized paragraph slides into continuation parts', async () => {
    fetchSermonByIdMock.mockResolvedValue(longSlideSermonDetailFixture);
    renderDetail('/sermons/sermon-1?highlightMode=paragraph');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);

    fireEvent.click(screen.getByTestId('reader-slide-view-toggle'));
    await waitFor(() => {
      expect(getReaderFullscreenSlideView()).toBeInTheDocument();
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 1 /');
      expect(screen.getByTestId('reader-fullscreen-slide-part-indicator')).toHaveTextContent('Paragraph 1 / 1');
      expect(screen.getByTestId('reader-fullscreen-slide-part-indicator')).toHaveTextContent('Part 1/');
    });

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).not.toHaveTextContent('Slide 1 / 1');
      expect(screen.getByTestId('reader-fullscreen-slide-part-indicator')).toHaveTextContent('Part 2/');
    });
  });

  it('exits fullscreen presentation with Escape and clears slide query params', async () => {
    renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);

    fireEvent.keyDown(window, { key: 'p' });
    await waitFor(() => {
      expect(getReaderFullscreenSlideView()).toBeInTheDocument();
      expect(screen.getByTestId('location-path')).toHaveTextContent('slide=1');
    });

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('reader-fullscreen-slide-view')).not.toBeInTheDocument();
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('slide=1');
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('slideStart=');
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('slideEnd=');
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('slidePage=');
    });
  });

  it('hydrates fullscreen presentation state from URL selection and ignores legacy slidePage', async () => {
    fetchSermonByIdMock.mockResolvedValue(longSlideSermonDetailFixture);
    renderDetail('/sermons/sermon-1?slide=1&slideStart=0&slideEnd=60&slidePage=2');

    await waitFor(() => {
      expect(getReaderFullscreenSlideView()).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('reader-fullscreen-slide-page-indicator')).toHaveTextContent('Slide 1 /');
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('slidePage=');
    });

    expect(screen.queryByTestId('sermon-detail-content')).not.toBeInTheDocument();
    expect(getReaderFullscreenSlideText().textContent?.trim().length).toBeGreaterThan(0);

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('reader-fullscreen-slide-view')).not.toBeInTheDocument();
      expect(screen.getByTestId('sermon-detail-content')).toBeInTheDocument();
      expect(getSelectedReaderWords().length).toBeGreaterThan(0);
    });
  });

  it('uses configured reader primary keys while preserving legacy aliases', async () => {
    shortcutBindingsMock = {
      ...shortcutBindingsMock,
      reader_extend_selection: 'x',
      reader_shrink_selection: 'z',
    };

    renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });

    const firstWord = getReaderWordByIndex(0);
    expect(firstWord).not.toBeNull();
    fireEvent.click(firstWord!);
    expect(getSelectedReaderWordIndexes()).toEqual([0]);

    fireEvent.keyDown(window, { key: 'x' });
    expect(getSelectedReaderWordIndexes()).toEqual([0, 1]);

    fireEvent.keyDown(window, { key: 'z' });
    expect(getSelectedReaderWordIndexes()).toEqual([0]);

    fireEvent.keyDown(window, { key: ' ' });
    expect(getSelectedReaderWordIndexes()).toEqual([0, 1]);

    fireEvent.keyDown(window, { key: ' ', shiftKey: true });
    expect(getSelectedReaderWordIndexes()).toEqual([0]);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(getSelectedReaderWordIndexes()).toEqual([0, 1]);
  });

  it('applies sentence-mode click and keyboard navigation by sentence units', async () => {
    renderDetail('/sermons/sermon-1?highlightMode=sentence');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);
    expect(getHighlightModeButton('Sentence')).toHaveAttribute('aria-pressed', 'true');

    const firstWord = getReaderWordByIndex(0);
    expect(firstWord).not.toBeNull();
    fireEvent.click(firstWord!);

    expect(getSelectedReaderWordIndexes()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(getSelectedReaderWords()).toHaveLength(getReaderWords().length);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(getSelectedReaderWordIndexes()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps selection context when changing highlight mode from word to sentence to paragraph', async () => {
    const scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
    renderDetail('/sermons/sermon-1?reading=1&highlightMode=word');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });

    const selectedWord = getReaderWordByIndex(3);
    expect(selectedWord).not.toBeNull();
    fireEvent.click(selectedWord!);
    await waitFor(() => {
      expect(getReaderTextOptionsPopup()).toBeInTheDocument();
      expect(getHighlightModeButton('Word')).toHaveAttribute('aria-pressed', 'true');
    });
    expect(getSelectedReaderWordIndexes()).toEqual([3]);

    fireEvent.click(getHighlightModeButton('Sentence'));
    await waitFor(() => {
      expect(getHighlightModeButton('Sentence')).toHaveAttribute('aria-pressed', 'true');
    });
    expect(getSelectedReaderWordIndexes()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

    fireEvent.click(getHighlightModeButton('Paragraph'));
    await waitFor(() => {
      expect(getHighlightModeButton('Paragraph')).toHaveAttribute('aria-pressed', 'true');
    });

    const totalWords = getReaderWords().length;
    expect(getSelectedReaderWords()).toHaveLength(totalWords);
    expect(getSelectedReaderWordIndexes()).toEqual(Array.from({ length: totalWords }, (_, index) => index));
    scrollBySpy.mockRestore();
  });

  it('applies paragraph-mode click and keyboard navigation by paragraph units', async () => {
    fetchSermonByIdMock.mockResolvedValue(multiParagraphSermonDetailFixture);
    renderDetail('/sermons/sermon-1?highlightMode=paragraph');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });
    await selectReaderWordAndOpenOptionsPopup(0);
    expect(getHighlightModeButton('Paragraph')).toHaveAttribute('aria-pressed', 'true');

    const totalWords = getReaderWords().length;
    const firstWord = getReaderWordByIndex(0);
    expect(firstWord).not.toBeNull();
    fireEvent.click(firstWord!);

    expect(getSelectedReaderWordIndexes()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(getSelectedReaderWords()).toHaveLength(totalWords);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(getSelectedReaderWordIndexes()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('clears selected reader words when sermon id changes', async () => {
    fetchAdjacentSermonsMock.mockResolvedValue({
      prev: null,
      next: { id: 'sermon-2', title: 'Next', date: '1965-10-11' },
    });

    renderDetail('/sermons/sermon-1?q=only+believe');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next sermon hit' })).toBeEnabled();
      expect(getReaderWords().length).toBeGreaterThan(0);
    });

    const firstWord = getReaderWordByIndex(0);
    expect(firstWord).not.toBeNull();
    fireEvent.click(firstWord!);
    expect(getSelectedReaderWordIndexes()).toEqual([0]);

    fireEvent.click(screen.getByRole('button', { name: 'Next sermon hit' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/sermons/sermon-2?q=only+believe');
    });
    await waitFor(() => {
      expect(getSelectedReaderWords()).toHaveLength(0);
    });
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

  it('scrolls highlighted text toward viewport when selected word is outside reading band', async () => {
    const scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
    });

    renderDetail('/sermons/sermon-1?reading=1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });

    const firstWord = getReaderWordByIndex(0);
    expect(firstWord).not.toBeNull();
    const wordRectSpy = vi
      .spyOn(firstWord!, 'getBoundingClientRect')
      .mockReturnValue(createMockDomRect(240, 860, 48, 24));

    fireEvent.click(firstWord!);

    await waitFor(() => {
      expect(scrollBySpy).toHaveBeenCalled();
    });

    const firstCall = scrollBySpy.mock.calls[0]?.[0] as ScrollToOptions;
    expect(firstCall).toEqual(expect.objectContaining({ left: 0, behavior: 'auto' }));
    expect((firstCall.top as number) > 0).toBe(true);

    wordRectSpy.mockRestore();
    scrollBySpy.mockRestore();
  });

  it('scrolls highlighted text toward viewport when selected word is outside reading band with reading mode off', async () => {
    const scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
    });

    renderDetail('/sermons/sermon-1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });

    const firstWord = getReaderWordByIndex(0);
    expect(firstWord).not.toBeNull();
    const wordRectSpy = vi
      .spyOn(firstWord!, 'getBoundingClientRect')
      .mockReturnValue(createMockDomRect(240, 860, 48, 24));

    fireEvent.click(firstWord!);

    await waitFor(() => {
      expect(scrollBySpy).toHaveBeenCalled();
    });

    const firstCall = scrollBySpy.mock.calls[0]?.[0] as ScrollToOptions;
    expect(firstCall).toEqual(expect.objectContaining({ left: 0, behavior: 'auto' }));
    expect((firstCall.top as number) > 0).toBe(true);

    wordRectSpy.mockRestore();
    scrollBySpy.mockRestore();
  });

  it('does not scroll highlighted text when selected word is already in the reading band', async () => {
    const scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
    });

    renderDetail('/sermons/sermon-1?reading=1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(0);
    });

    const firstWord = getReaderWordByIndex(0);
    expect(firstWord).not.toBeNull();
    const wordRectSpy = vi
      .spyOn(firstWord!, 'getBoundingClientRect')
      .mockReturnValue(createMockDomRect(240, 220, 48, 24));

    fireEvent.click(firstWord!);
    expect(scrollBySpy).not.toHaveBeenCalled();

    wordRectSpy.mockRestore();
    scrollBySpy.mockRestore();
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

  it('preserves highlight mode query state while toggling reading mode', async () => {
    renderDetail('/sermons/sermon-1?q=only+believe&highlightMode=sentence');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Toggle reading mode' })).toBeInTheDocument();
    });
    await selectReaderWordAndOpenOptionsPopup(0);
    expect(getHighlightModeButton('Sentence')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle reading mode' }));
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('highlightMode=sentence');
      expect(screen.getByTestId('location-path')).toHaveTextContent('reading=1');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Toggle reading mode' }));
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('highlightMode=sentence');
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('reading=1');
    });
  });

  it('keeps the selected word context anchored when toggling reading mode', async () => {
    const scrollTargets: string[] = [];
    const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function mock(this: HTMLElement) {
      const wordIndex = this.getAttribute('data-reader-word-index');
      if (wordIndex != null) {
        scrollTargets.push(`word:${wordIndex}`);
        return;
      }

      const paragraphNumber = this.getAttribute('data-paragraph-number');
      if (paragraphNumber != null) {
        scrollTargets.push(`paragraph:${paragraphNumber}`);
      }
    });

    renderDetail('/sermons/sermon-1?reading=1');

    await waitFor(() => {
      expect(getReaderWords().length).toBeGreaterThan(3);
    });

    const selectedWord = getReaderWordByIndex(3);
    expect(selectedWord).not.toBeNull();
    fireEvent.click(selectedWord!);
    expect(getSelectedReaderWordIndexes()).toEqual([3]);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle reading mode' }));
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('reading=1');
    });

    await waitFor(() => {
      expect(scrollTargets).toContain('word:3');
    });
    expect(getSelectedReaderWordIndexes()).toContain(3);
    scrollIntoViewSpy.mockRestore();
  });

  it('anchors to nearest visible paragraph when toggling reading mode without a selection', async () => {
    fetchSermonByIdMock.mockResolvedValue(multiParagraphSermonDetailFixture);
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
    });

    const scrollTargets: string[] = [];
    const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function mock(this: HTMLElement) {
      const paragraphNumber = this.getAttribute('data-paragraph-number');
      if (paragraphNumber != null) {
        scrollTargets.push(`paragraph:${paragraphNumber}`);
      }
    });

    renderDetail('/sermons/sermon-1?reading=1');

    await waitFor(() => {
      expect(screen.getAllByTestId('sermon-paragraph-text')).toHaveLength(2);
    });

    const paragraph4 = document.querySelector<HTMLElement>('[data-paragraph-number="4"]');
    const paragraph5 = document.querySelector<HTMLElement>('[data-paragraph-number="5"]');
    expect(paragraph4).not.toBeNull();
    expect(paragraph5).not.toBeNull();

    const paragraph4RectSpy = vi
      .spyOn(paragraph4!, 'getBoundingClientRect')
      .mockReturnValue(createMockDomRect(200, 80, 640, 120));
    const paragraph5RectSpy = vi
      .spyOn(paragraph5!, 'getBoundingClientRect')
      .mockReturnValue(createMockDomRect(200, 440, 640, 120));

    fireEvent.click(screen.getByRole('button', { name: 'Toggle reading mode' }));
    await waitFor(() => {
      expect(screen.getByTestId('location-path')).not.toHaveTextContent('reading=1');
    });
    await waitFor(() => {
      expect(scrollTargets).toContain('paragraph:5');
    });

    paragraph4RectSpy.mockRestore();
    paragraph5RectSpy.mockRestore();
    scrollIntoViewSpy.mockRestore();
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


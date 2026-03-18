import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import type { ShortcutBindings } from '@/lib/keyboardShortcuts';

const setThemeMock = vi.fn();
let themeMock: 'system' | 'light' | 'dark' = 'system';
let instantSearchEnabledMock = true;
let smoothHitScrollingEnabledMock = true;
const setInstantSearchEnabledMock = vi.fn();
const setHitSmoothScrollEnabledMock = vi.fn();
const shortcutBindingsMock: ShortcutBindings = {
  focus_search: '/',
  open_books: 'b',
  open_settings: ',',
  result_next: 'n',
  result_prev: 'm',
  toggle_reading_mode: 'r',
  cycle_highlight_mode: 'h',
  reader_extend_selection: 'ArrowRight',
  reader_shrink_selection: 'ArrowLeft',
};
const setShortcutBindingMock = vi.fn(() => ({ ok: true }));
const resetShortcutBindingMock = vi.fn(() => ({ ok: true }));
const resetAllShortcutBindingsMock = vi.fn();
const navigateMock = vi.fn();
const removeSearchHistoryEntryMock = vi.fn();
const clearSearchHistoryMock = vi.fn();
let searchHistoryMock: string[] = ['Pillar of Fire', 'Seven Seals'];

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: themeMock,
    setTheme: setThemeMock,
  }),
}));

vi.mock('@/lib/preferences', () => ({
  getInstantSearchEnabled: () => instantSearchEnabledMock,
  setInstantSearchEnabled: (enabled: boolean) => {
    instantSearchEnabledMock = enabled;
    setInstantSearchEnabledMock(enabled);
  },
  getHitSmoothScrollEnabled: () => smoothHitScrollingEnabledMock,
  setHitSmoothScrollEnabled: (enabled: boolean) => {
    smoothHitScrollingEnabledMock = enabled;
    setHitSmoothScrollEnabledMock(enabled);
  },
}));

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    bindings: shortcutBindingsMock,
    syncStatus: 'synced',
    syncWarning: null,
    setShortcutBinding: setShortcutBindingMock,
    resetShortcutBinding: resetShortcutBindingMock,
    resetAllShortcutBindings: resetAllShortcutBindingsMock,
    registerSearchInputResolver: () => () => undefined,
    getSearchInputElement: () => null,
    registerResultListController: () => () => undefined,
    getResultListController: () => null,
  }),
}));

vi.mock('@/hooks/useSearchHistory', () => ({
  useSearchHistory: () => ({
    history: searchHistoryMock,
    addEntry: vi.fn(),
    removeEntry: removeSearchHistoryEntryMock,
    clear: clearSearchHistoryMock,
  }),
}));

describe('Settings', () => {
  it('renders search history entries', () => {
    searchHistoryMock = ['Pillar of Fire', 'Seven Seals'];

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Search history' })).toBeInTheDocument();
    expect(screen.getByText('Pillar of Fire')).toBeInTheDocument();
    expect(screen.getByText('Seven Seals')).toBeInTheDocument();
  });

  it('runs a historical query from settings', () => {
    navigateMock.mockReset();
    searchHistoryMock = ['Pillar of Fire'];

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Use search history query Pillar of Fire' }));
    expect(navigateMock).toHaveBeenCalledWith('/search?q=Pillar+of+Fire');
  });

  it('removes a single search history entry', () => {
    removeSearchHistoryEntryMock.mockReset();
    searchHistoryMock = ['Pillar of Fire'];

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove search history query Pillar of Fire' }));
    expect(removeSearchHistoryEntryMock).toHaveBeenCalledWith('Pillar of Fire');
  });

  it('clears all search history entries', () => {
    clearSearchHistoryMock.mockReset();
    searchHistoryMock = ['Pillar of Fire', 'Seven Seals'];

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear all search history' }));
    expect(clearSearchHistoryMock).toHaveBeenCalledTimes(1);
  });

  it('updates theme via selector', () => {
    themeMock = 'system';
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'dark' } });
    expect(setThemeMock).toHaveBeenCalledWith('dark');
  });

  it('toggles instant search preference', () => {
    instantSearchEnabledMock = true;
    setInstantSearchEnabledMock.mockReset();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /turn off instant search/i }));
    expect(setInstantSearchEnabledMock).toHaveBeenCalledWith(false);
  });

  it('toggles smooth hit scrolling preference', () => {
    smoothHitScrollingEnabledMock = true;
    setHitSmoothScrollEnabledMock.mockReset();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /turn off smooth hit scrolling/i }));
    expect(setHitSmoothScrollEnabledMock).toHaveBeenCalledWith(false);
  });

  it('captures and applies a keyboard shortcut edit', () => {
    setShortcutBindingMock.mockClear();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const openBooksShortcutButton = screen.getByRole('button', { name: 'Shortcut for Open books' });
    fireEvent.click(openBooksShortcutButton);
    fireEvent.keyDown(openBooksShortcutButton, { key: 'n' });

    expect(setShortcutBindingMock).toHaveBeenCalledWith('open_books', 'n');
  });

  it('shows editable hit-navigation shortcuts for n and m bindings', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Preferences' })).toBeInTheDocument();
    expect(screen.getByText('Instant search')).toBeInTheDocument();
    expect(screen.getByText('Smooth hit scrolling')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shortcut for Next/previous hit' })).toHaveTextContent('n');
    expect(screen.getByRole('button', { name: 'Shortcut for Next/previous sermon hit' })).toHaveTextContent('m');
  });

  it('renders editable reader shortcuts for R04 and R05 additions', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Shortcut for Cycle highlight mode' })).toHaveTextContent('h');
    expect(screen.getByRole('button', { name: 'Shortcut for Reader extend selection' })).toHaveTextContent('Right');
    expect(screen.getByRole('button', { name: 'Shortcut for Reader shrink selection' })).toHaveTextContent('Left');
  });

  it('captures named-key shortcut updates for reader selection actions', () => {
    setShortcutBindingMock.mockClear();
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const extendShortcutButton = screen.getByRole('button', { name: 'Shortcut for Reader extend selection' });
    fireEvent.click(extendShortcutButton);
    fireEvent.keyDown(extendShortcutButton, { key: 'ArrowRight' });

    expect(setShortcutBindingMock).toHaveBeenCalledWith('reader_extend_selection', 'ArrowRight');
  });

  it('uses back button layout and removes return-to-home link', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.queryByText(/return to home/i)).not.toBeInTheDocument();
  });

  it('renders section headings outside surface cards', () => {
    searchHistoryMock = ['Pillar of Fire'];
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const appearanceHeading = screen.getByRole('heading', { name: 'Appearance' });
    const preferencesHeading = screen.getByRole('heading', { name: 'Preferences' });
    const searchHistoryHeading = screen.getByRole('heading', { name: 'Search history' });
    const keyboardShortcutsHeading = screen.getByRole('heading', { name: 'Keyboard shortcuts' });

    expect(appearanceHeading.closest('.surface-card')).toBeNull();
    expect(preferencesHeading.closest('.surface-card')).toBeNull();
    expect(searchHistoryHeading.closest('.surface-card')).toBeNull();
    expect(keyboardShortcutsHeading.closest('.surface-card')).toBeNull();
  });
});

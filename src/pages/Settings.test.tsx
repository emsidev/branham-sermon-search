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
};
const setShortcutBindingMock = vi.fn(() => ({ ok: true }));
const resetShortcutBindingMock = vi.fn(() => ({ ok: true }));
const resetAllShortcutBindingsMock = vi.fn();

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

describe('Settings', () => {
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
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const appearanceHeading = screen.getByRole('heading', { name: 'Appearance' });
    const preferencesHeading = screen.getByRole('heading', { name: 'Preferences' });
    const keyboardShortcutsHeading = screen.getByRole('heading', { name: 'Keyboard shortcuts' });

    expect(appearanceHeading.closest('.surface-card')).toBeNull();
    expect(preferencesHeading.closest('.surface-card')).toBeNull();
    expect(keyboardShortcutsHeading.closest('.surface-card')).toBeNull();
  });
});

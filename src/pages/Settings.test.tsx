import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import type { ShortcutBindings } from '@/lib/keyboardShortcuts';

const setThemeMock = vi.fn();
let themeMock: 'system' | 'light' | 'dark' = 'system';
let instantSearchEnabledMock = true;
const setInstantSearchEnabledMock = vi.fn();
let shortcutBindingsMock: ShortcutBindings = {
  focus_search: '/',
  open_books: 'b',
  open_settings: ',',
  result_next: 'j',
  result_prev: 'k',
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

    fireEvent.click(screen.getByRole('button', { name: /turn off/i }));
    expect(setInstantSearchEnabledMock).toHaveBeenCalledWith(false);
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
});

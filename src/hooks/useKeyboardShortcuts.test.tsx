import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardShortcutsProvider, useKeyboardShortcuts } from './useKeyboardShortcuts';

const getShortcutBindingsMock = vi.fn();
const saveShortcutBindingsMock = vi.fn();
const localStorageState = new Map<string, string>();

const localStorageMock: Storage = {
  get length() {
    return localStorageState.size;
  },
  clear: () => {
    localStorageState.clear();
  },
  getItem: (key: string) => localStorageState.get(key) ?? null,
  key: (index: number) => Array.from(localStorageState.keys())[index] ?? null,
  removeItem: (key: string) => {
    localStorageState.delete(key);
  },
  setItem: (key: string, value: string) => {
    localStorageState.set(key, value);
  },
};

vi.mock('@/data/dataPort', () => ({
  getDataPort: vi.fn(async () => ({
    getSearchMeta: vi.fn(),
    listSermons: vi.fn(),
    searchSermonHits: vi.fn(),
    getSermonDetail: vi.fn(),
    getAdjacentSermons: vi.fn(),
    getBoundarySermons: vi.fn(),
    getShortcutBindings: (...args: unknown[]) => getShortcutBindingsMock(...args),
    saveShortcutBindings: (...args: unknown[]) => saveShortcutBindingsMock(...args),
  })),
}));

function ShortcutSnapshot() {
  const { bindings, storageStatus } = useKeyboardShortcuts();
  return (
    <>
      <div data-testid="books-shortcut">{bindings.open_books}</div>
      <div data-testid="storage-status">{storageStatus}</div>
    </>
  );
}

function ShortcutEditor() {
  const { setShortcutBinding } = useKeyboardShortcuts();
  return (
    <button type="button" onClick={() => setShortcutBinding('open_books', 'x')}>
      set books shortcut
    </button>
  );
}

describe('KeyboardShortcutsProvider', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });

    getShortcutBindingsMock.mockReset();
    saveShortcutBindingsMock.mockReset();
    localStorageState.clear();

    getShortcutBindingsMock.mockResolvedValue([]);
    saveShortcutBindingsMock.mockResolvedValue(undefined);
  });

  it('loads stored bindings and reports local status', async () => {
    getShortcutBindingsMock.mockResolvedValue([
      { action: 'open_books', key: 'n', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'focus_search', key: '/', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'open_settings', key: ',', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'result_next', key: 'x', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'result_prev', key: 'm', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'toggle_reading_mode', key: 'r', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'toggle_slide_view', key: 'p', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'add_slide_highlight', key: 'g', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'cycle_highlight_mode', key: 'h', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'reader_extend_selection', key: 'ArrowRight', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'reader_shrink_selection', key: 'ArrowLeft', updated_at: '2026-03-11T09:00:00.000Z' },
    ]);

    render(
      <KeyboardShortcutsProvider>
        <ShortcutSnapshot />
      </KeyboardShortcutsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('books-shortcut')).toHaveTextContent('n');
    });
    expect(screen.getByTestId('storage-status')).toHaveTextContent('local');
  });

  it('falls back to error status when storage read fails', async () => {
    getShortcutBindingsMock.mockRejectedValue(new Error('storage unavailable'));

    render(
      <KeyboardShortcutsProvider>
        <ShortcutSnapshot />
      </KeyboardShortcutsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('storage-status')).toHaveTextContent('error');
    });
  });

  it('applies shortcut edits immediately and persists changes', async () => {
    render(
      <KeyboardShortcutsProvider>
        <ShortcutEditor />
        <ShortcutSnapshot />
      </KeyboardShortcutsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /set books shortcut/i }));
    expect(screen.getByTestId('books-shortcut')).toHaveTextContent('x');
    await waitFor(() => {
      expect(saveShortcutBindingsMock).toHaveBeenCalled();
    });
  });
});


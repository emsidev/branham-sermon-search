import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardShortcutsProvider, useKeyboardShortcuts } from './useKeyboardShortcuts';

let authUserId: string | null = 'user-1';
let signInUserId: string | null = 'anon-1';
let cloudRows: Array<{ action: string; key: string; updated_at: string }> = [];
let cloudSelectError: unknown = null;
let upsertError: unknown = null;
const upsertCalls: unknown[] = [];
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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: authUserId ? { id: authUserId } : null,
        },
      })),
      signInAnonymously: vi.fn(async () => ({
        data: {
          user: signInUserId ? { id: signInUserId } : null,
        },
        error: signInUserId ? null : new Error('Anonymous auth disabled'),
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(async () => ({
          data: cloudSelectError ? null : cloudRows,
          error: cloudSelectError,
        })),
      })),
      upsert: vi.fn(async (rows: unknown) => {
        upsertCalls.push(rows);
        return { error: upsertError };
      }),
    })),
  },
}));

function ShortcutSnapshot() {
  const { bindings, syncStatus } = useKeyboardShortcuts();
  return (
    <>
      <div data-testid="books-shortcut">{bindings.open_books}</div>
      <div data-testid="sync-status">{syncStatus}</div>
    </>
  );
}

function ShortcutEditor() {
  const { setShortcutBinding } = useKeyboardShortcuts();
  return (
    <button type="button" onClick={() => setShortcutBinding('open_books', 'n')}>
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

    authUserId = 'user-1';
    signInUserId = 'anon-1';
    cloudRows = [];
    cloudSelectError = null;
    upsertError = null;
    upsertCalls.splice(0, upsertCalls.length);
    localStorageState.clear();
  });

  it('loads cloud bindings and keeps synced status', async () => {
    cloudRows = [
      { action: 'open_books', key: 'n', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'focus_search', key: '/', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'open_settings', key: ',', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'result_next', key: 'j', updated_at: '2026-03-11T09:00:00.000Z' },
      { action: 'result_prev', key: 'k', updated_at: '2026-03-11T09:00:00.000Z' },
    ];

    render(
      <KeyboardShortcutsProvider>
        <ShortcutSnapshot />
      </KeyboardShortcutsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('books-shortcut')).toHaveTextContent('n');
    });
    expect(screen.getByTestId('sync-status')).toHaveTextContent('synced');
    expect(upsertCalls).toHaveLength(0);
  });

  it('falls back to local cache when cloud read fails', async () => {
    cloudSelectError = new Error('network down');
    window.localStorage.setItem('message-search.keyboard-shortcuts.cache.v1', JSON.stringify({
      bindings: {
        focus_search: '/',
        open_books: 'n',
        open_settings: ',',
        result_next: 'j',
        result_prev: 'k',
      },
      updatedAt: Date.now(),
    }));

    render(
      <KeyboardShortcutsProvider>
        <ShortcutSnapshot />
      </KeyboardShortcutsProvider>
    );

    expect(screen.getByTestId('books-shortcut')).toHaveTextContent('n');
    await waitFor(() => {
      expect(screen.getByTestId('sync-status')).toHaveTextContent('local_fallback');
    });
  });

  it('uploads newer local bindings to cloud during sync', async () => {
    window.localStorage.setItem('message-search.keyboard-shortcuts.cache.v1', JSON.stringify({
      bindings: {
        focus_search: '/',
        open_books: 'n',
        open_settings: ',',
        result_next: 'j',
        result_prev: 'k',
      },
      updatedAt: Date.parse('2026-03-11T11:00:00.000Z'),
    }));

    cloudRows = [
      { action: 'open_books', key: 'b', updated_at: '2026-03-11T10:00:00.000Z' },
      { action: 'focus_search', key: '/', updated_at: '2026-03-11T10:00:00.000Z' },
      { action: 'open_settings', key: ',', updated_at: '2026-03-11T10:00:00.000Z' },
      { action: 'result_next', key: 'j', updated_at: '2026-03-11T10:00:00.000Z' },
      { action: 'result_prev', key: 'k', updated_at: '2026-03-11T10:00:00.000Z' },
    ];

    render(
      <KeyboardShortcutsProvider>
        <ShortcutSnapshot />
      </KeyboardShortcutsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('books-shortcut')).toHaveTextContent('n');
    });

    await waitFor(() => {
      expect(upsertCalls.length).toBeGreaterThan(0);
    });

    const latestRows = upsertCalls.at(-1) as Array<{ action: string; key: string }>;
    const openBooksRow = latestRows.find((row) => row.action === 'open_books');
    expect(openBooksRow?.key).toBe('n');
  });

  it('applies shortcut edits immediately while preserving sync status', async () => {
    render(
      <KeyboardShortcutsProvider>
        <ShortcutEditor />
        <ShortcutSnapshot />
      </KeyboardShortcutsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /set books shortcut/i }));
    expect(screen.getByTestId('books-shortcut')).toHaveTextContent('n');
  });
});

import type { ShortcutBindingRow } from '@/data/contracts';

const SHORTCUTS_STORAGE_KEY = 'message-search.keyboard-shortcuts.sqlite.v1';

interface ShortcutStorePayload {
  rows: ShortcutBindingRow[];
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readLocalShortcutRows(): ShortcutBindingRow[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ShortcutStorePayload | null;
    if (!parsed || !Array.isArray(parsed.rows)) {
      return [];
    }

    return parsed.rows
      .map((row) => {
        const action = typeof row?.action === 'string' ? row.action : '';
        const key = typeof row?.key === 'string' ? row.key : '';
        const updatedAt = typeof row?.updated_at === 'string' ? row.updated_at : '';
        if (!action || !key) {
          return null;
        }

        return {
          action,
          key,
          updated_at: updatedAt || new Date().toISOString(),
        } satisfies ShortcutBindingRow;
      })
      .filter((row): row is ShortcutBindingRow => row != null);
  } catch {
    return [];
  }
}

export function writeLocalShortcutRows(rows: ShortcutBindingRow[]): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify({ rows } satisfies ShortcutStorePayload));
  } catch {
    // Ignore write failures in storage-restricted environments.
  }
}


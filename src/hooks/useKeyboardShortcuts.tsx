import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { getDataPort } from '@/data/dataPort';
import type { ShortcutBindingRow } from '@/data/contracts';
import {
  SHORTCUT_ACTIONS,
  SHORTCUT_DEFAULT_BINDINGS,
  coerceShortcutBindings,
  findShortcutConflict,
  formatShortcutKey,
  getShortcutDefinition,
  validateShortcutKey,
  type ShortcutAction,
  type ShortcutBindings,
  type ShortcutStorageStatus,
} from '@/lib/keyboardShortcuts';

const SHORTCUTS_CACHE_STORAGE_KEY = 'message-search.keyboard-shortcuts.cache.v1';
const STORAGE_ERROR_WARNING = 'Local shortcut storage is unavailable. Changes may not persist.';

interface ShortcutCacheSnapshot {
  bindings: ShortcutBindings;
  updatedAt: number;
}

interface ShortcutMutationResult {
  ok: boolean;
  error?: string;
}

export interface ShortcutResultListController {
  hasItems: () => boolean;
  selectNext: () => void;
  selectPrevious: () => void;
  activateSelection: () => void;
}

interface KeyboardShortcutsContextValue {
  bindings: ShortcutBindings;
  storageStatus: ShortcutStorageStatus;
  storageWarning: string | null;
  // Deprecated aliases retained for compatibility with existing tests/components.
  syncStatus: ShortcutStorageStatus;
  syncWarning: string | null;
  setShortcutBinding: (action: ShortcutAction, rawKey: string) => ShortcutMutationResult;
  resetShortcutBinding: (action: ShortcutAction) => ShortcutMutationResult;
  resetAllShortcutBindings: () => void;
  registerSearchInputResolver: (resolver: () => HTMLInputElement | null) => () => void;
  getSearchInputElement: () => HTMLInputElement | null;
  registerResultListController: (controller: ShortcutResultListController | null) => () => void;
  getResultListController: () => ShortcutResultListController | null;
}

function getDefaultBindings(): ShortcutBindings {
  return { ...SHORTCUT_DEFAULT_BINDINGS };
}

function readShortcutCacheSnapshot(): ShortcutCacheSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(SHORTCUTS_CACHE_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as {
      bindings?: Partial<Record<ShortcutAction, string>>;
      updatedAt?: unknown;
    };

    const updatedAt = typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
      ? parsed.updatedAt
      : 0;

    return {
      bindings: coerceShortcutBindings(parsed.bindings ?? {}),
      updatedAt,
    };
  } catch {
    return null;
  }
}

function writeShortcutCacheSnapshot(snapshot: ShortcutCacheSnapshot): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SHORTCUTS_CACHE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage write failures (private mode / blocked storage).
  }
}

function getBindingsUpdatedAtFromRows(rows: ShortcutBindingRow[]): number {
  return rows.reduce((maxValue, row) => {
    const parsedValue = Date.parse(row.updated_at);
    if (Number.isNaN(parsedValue)) {
      return maxValue;
    }

    return Math.max(maxValue, parsedValue);
  }, 0);
}

function buildBindingsFromRows(rows: ShortcutBindingRow[]): ShortcutBindings {
  const candidate: Partial<Record<ShortcutAction, string>> = {};
  rows.forEach((row) => {
    if (row.action in SHORTCUT_DEFAULT_BINDINGS) {
      candidate[row.action as ShortcutAction] = row.key;
    }
  });
  return coerceShortcutBindings(candidate);
}

function toShortcutRows(bindings: ShortcutBindings, updatedAt: number): ShortcutBindingRow[] {
  const updatedAtIso = new Date(updatedAt).toISOString();
  return SHORTCUT_ACTIONS.map((action) => ({
    action,
    key: bindings[action],
    updated_at: updatedAtIso,
  }));
}

function areBindingsEqual(a: ShortcutBindings, b: ShortcutBindings): boolean {
  return SHORTCUT_ACTIONS.every((action) => a[action] === b[action]);
}

const defaultContextValue: KeyboardShortcutsContextValue = {
  bindings: getDefaultBindings(),
  storageStatus: 'local',
  storageWarning: null,
  syncStatus: 'local',
  syncWarning: null,
  setShortcutBinding: () => ({ ok: false, error: 'Keyboard shortcuts provider is unavailable.' }),
  resetShortcutBinding: () => ({ ok: false, error: 'Keyboard shortcuts provider is unavailable.' }),
  resetAllShortcutBindings: () => undefined,
  registerSearchInputResolver: () => () => undefined,
  getSearchInputElement: () => null,
  registerResultListController: () => () => undefined,
  getResultListController: () => null,
};

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue>(defaultContextValue);

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const initialCache = useMemo(() => readShortcutCacheSnapshot(), []);
  const [bindings, setBindings] = useState<ShortcutBindings>(() => initialCache?.bindings ?? getDefaultBindings());
  const [storageStatus, setStorageStatus] = useState<ShortcutStorageStatus>('local');
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const bindingsRef = useRef(bindings);
  const storageStatusRef = useRef<ShortcutStorageStatus>('local');
  const lastLocalUpdatedAtRef = useRef(initialCache?.updatedAt ?? 0);
  const syncInFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const searchInputResolversRef = useRef<Array<() => HTMLInputElement | null>>([]);
  const resultListControllerRef = useRef<ShortcutResultListController | null>(null);

  const applyLocalSnapshot = useCallback((nextBindings: ShortcutBindings, updatedAt: number) => {
    const currentBindings = bindingsRef.current;
    if (!areBindingsEqual(currentBindings, nextBindings)) {
      bindingsRef.current = nextBindings;
      if (mountedRef.current) {
        setBindings(nextBindings);
      }
    }

    lastLocalUpdatedAtRef.current = updatedAt;
    writeShortcutCacheSnapshot({
      bindings: nextBindings,
      updatedAt,
    });
  }, []);

  const markLocalReady = useCallback(() => {
    storageStatusRef.current = 'local';
    if (mountedRef.current) {
      setStorageStatus('local');
      setStorageWarning(null);
    }
  }, []);

  const markStorageError = useCallback(() => {
    storageStatusRef.current = 'error';
    if (mountedRef.current) {
      setStorageStatus('error');
      setStorageWarning(STORAGE_ERROR_WARNING);
    }
  }, []);

  const syncStoredAndLocal = useCallback(async () => {
    if (syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;
    try {
      const dataPort = await getDataPort();
      const storedRows = await dataPort.getShortcutBindings();
      const storedBindings = buildBindingsFromRows(storedRows);
      const storedUpdatedAt = getBindingsUpdatedAtFromRows(storedRows);

      const localSnapshot = readShortcutCacheSnapshot();
      const localBindings = localSnapshot?.bindings ?? bindingsRef.current;
      const localUpdatedAt = localSnapshot?.updatedAt ?? lastLocalUpdatedAtRef.current;

      if (localUpdatedAt > storedUpdatedAt) {
        const effectiveUpdatedAt = localUpdatedAt || Date.now();
        await dataPort.saveShortcutBindings(toShortcutRows(localBindings, effectiveUpdatedAt));
        applyLocalSnapshot(localBindings, effectiveUpdatedAt);
      } else if (storedRows.length > 0) {
        const effectiveUpdatedAt = storedUpdatedAt || Date.now();
        applyLocalSnapshot(storedBindings, effectiveUpdatedAt);
      } else if (localUpdatedAt > 0) {
        const effectiveUpdatedAt = localUpdatedAt || Date.now();
        await dataPort.saveShortcutBindings(toShortcutRows(localBindings, effectiveUpdatedAt));
        applyLocalSnapshot(localBindings, effectiveUpdatedAt);
      } else {
        const defaults = getDefaultBindings();
        const effectiveUpdatedAt = Date.now();
        await dataPort.saveShortcutBindings(toShortcutRows(defaults, effectiveUpdatedAt));
        applyLocalSnapshot(defaults, effectiveUpdatedAt);
      }

      markLocalReady();
    } catch {
      markStorageError();
    } finally {
      syncInFlightRef.current = false;
    }
  }, [applyLocalSnapshot, markLocalReady, markStorageError]);

  const persistBindings = useCallback(async (nextBindings: ShortcutBindings) => {
    const nextUpdatedAt = Date.now();
    applyLocalSnapshot(nextBindings, nextUpdatedAt);

    try {
      const dataPort = await getDataPort();
      await dataPort.saveShortcutBindings(toShortcutRows(nextBindings, nextUpdatedAt));
      markLocalReady();
    } catch {
      markStorageError();
    }
  }, [applyLocalSnapshot, markLocalReady, markStorageError]);

  const setShortcutBinding = useCallback((action: ShortcutAction, rawKey: string): ShortcutMutationResult => {
    const { key: normalizedKey, error } = validateShortcutKey(rawKey, action);
    if (error || !normalizedKey) {
      return { ok: false, error: error ?? 'Invalid shortcut key.' };
    }

    const conflictAction = findShortcutConflict(bindingsRef.current, action, normalizedKey);
    if (conflictAction) {
      const conflictLabel = getShortcutDefinition(conflictAction).label.toLowerCase();
      return {
        ok: false,
        error: `"${formatShortcutKey(normalizedKey)}" is already used by ${conflictLabel}.`,
      };
    }

    if (bindingsRef.current[action] === normalizedKey) {
      return { ok: true };
    }

    const nextBindings = {
      ...bindingsRef.current,
      [action]: normalizedKey,
    } as ShortcutBindings;

    void persistBindings(nextBindings);
    return { ok: true };
  }, [persistBindings]);

  const resetShortcutBinding = useCallback((action: ShortcutAction): ShortcutMutationResult => {
    const defaultKey = SHORTCUT_DEFAULT_BINDINGS[action];
    if (bindingsRef.current[action] === defaultKey) {
      return { ok: true };
    }

    const conflictAction = findShortcutConflict(bindingsRef.current, action, defaultKey);
    if (conflictAction) {
      const conflictLabel = getShortcutDefinition(conflictAction).label.toLowerCase();
      return {
        ok: false,
        error: `Reset failed: default key is currently used by ${conflictLabel}.`,
      };
    }

    const nextBindings = {
      ...bindingsRef.current,
      [action]: defaultKey,
    } as ShortcutBindings;

    void persistBindings(nextBindings);
    return { ok: true };
  }, [persistBindings]);

  const resetAllShortcutBindings = useCallback(() => {
    void persistBindings(getDefaultBindings());
  }, [persistBindings]);

  const registerSearchInputResolver = useCallback((resolver: () => HTMLInputElement | null) => {
    searchInputResolversRef.current = [
      ...searchInputResolversRef.current,
      resolver,
    ];

    return () => {
      searchInputResolversRef.current = searchInputResolversRef.current.filter(
        (candidateResolver) => candidateResolver !== resolver
      );
    };
  }, []);

  const getSearchInputElement = useCallback(() => {
    for (let index = searchInputResolversRef.current.length - 1; index >= 0; index -= 1) {
      const candidate = searchInputResolversRef.current[index]?.();
      if (candidate && candidate.isConnected) {
        return candidate;
      }
    }

    return null;
  }, []);

  const registerResultListController = useCallback((controller: ShortcutResultListController | null) => {
    resultListControllerRef.current = controller;
    return () => {
      if (resultListControllerRef.current === controller) {
        resultListControllerRef.current = null;
      }
    };
  }, []);

  const getResultListController = useCallback(() => {
    return resultListControllerRef.current;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void syncStoredAndLocal();

    return () => {
      mountedRef.current = false;
    };
  }, [syncStoredAndLocal]);

  const value = useMemo<KeyboardShortcutsContextValue>(() => ({
    bindings,
    storageStatus,
    storageWarning,
    syncStatus: storageStatus,
    syncWarning: storageWarning,
    setShortcutBinding,
    resetShortcutBinding,
    resetAllShortcutBindings,
    registerSearchInputResolver,
    getSearchInputElement,
    registerResultListController,
    getResultListController,
  }), [
    bindings,
    storageStatus,
    storageWarning,
    setShortcutBinding,
    resetShortcutBinding,
    resetAllShortcutBindings,
    registerSearchInputResolver,
    getSearchInputElement,
    registerResultListController,
    getResultListController,
  ]);

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts(): KeyboardShortcutsContextValue {
  return useContext(KeyboardShortcutsContext);
}

export function useShortcutSearchInputRegistration(
  searchInputRef: React.RefObject<HTMLInputElement | null>,
  enabled = true,
): void {
  const { registerSearchInputResolver } = useKeyboardShortcuts();

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    return registerSearchInputResolver(() => searchInputRef.current);
  }, [enabled, registerSearchInputResolver, searchInputRef]);
}

export function useShortcutResultListRegistration(controller: ShortcutResultListController | null): void {
  const { registerResultListController } = useKeyboardShortcuts();

  useEffect(() => {
    return registerResultListController(controller);
  }, [controller, registerResultListController]);
}


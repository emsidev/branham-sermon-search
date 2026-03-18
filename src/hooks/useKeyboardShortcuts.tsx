import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  type ShortcutSyncStatus,
} from '@/lib/keyboardShortcuts';

const SHORTCUTS_CACHE_STORAGE_KEY = 'message-search.keyboard-shortcuts.cache.v1';
const CLOUD_SYNC_WARNING = 'Cloud sync unavailable. Saving shortcuts locally until sync is restored.';

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
  syncStatus: ShortcutSyncStatus;
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

function getBindingsUpdatedAtFromCloud(rows: Array<{ updated_at: string }>): number {
  return rows.reduce((maxValue, row) => {
    const parsedValue = Date.parse(row.updated_at);
    if (Number.isNaN(parsedValue)) {
      return maxValue;
    }

    return Math.max(maxValue, parsedValue);
  }, 0);
}

async function ensureAnonymousUserId(): Promise<string> {
  const { data: currentUserResult } = await supabase.auth.getUser();
  if (currentUserResult.user) {
    return currentUserResult.user.id;
  }

  const { data: signInResult, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError || !signInResult.user) {
    throw signInError ?? new Error('Anonymous sign-in failed.');
  }

  return signInResult.user.id;
}

async function fetchCloudShortcutRows(userId: string): Promise<Array<{ action: string; key: string; updated_at: string }>> {
  const { data, error } = await supabase
    .from('user_keyboard_shortcuts')
    .select('action,key,updated_at')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function upsertCloudBindings(userId: string, bindings: ShortcutBindings, updatedAt: number): Promise<void> {
  const updatedAtIso = new Date(updatedAt).toISOString();
  const rows = SHORTCUT_ACTIONS.map((action) => ({
    user_id: userId,
    action,
    key: bindings[action],
    updated_at: updatedAtIso,
  }));

  const { error } = await supabase
    .from('user_keyboard_shortcuts')
    .upsert(rows, { onConflict: 'user_id,action' });

  if (error) {
    throw error;
  }
}

function buildBindingsFromCloudRows(rows: Array<{ action: string; key: string }>): ShortcutBindings {
  const candidate: Partial<Record<ShortcutAction, string>> = {};

  rows.forEach((row) => {
    if (row.action in SHORTCUT_DEFAULT_BINDINGS) {
      candidate[row.action as ShortcutAction] = row.key;
    }
  });

  return coerceShortcutBindings(candidate);
}

function areBindingsEqual(a: ShortcutBindings, b: ShortcutBindings): boolean {
  return SHORTCUT_ACTIONS.every((action) => a[action] === b[action]);
}

const defaultContextValue: KeyboardShortcutsContextValue = {
  bindings: getDefaultBindings(),
  syncStatus: 'synced',
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
  const [syncStatus, setSyncStatus] = useState<ShortcutSyncStatus>('synced');
  const [syncWarning, setSyncWarning] = useState<string | null>(null);

  const bindingsRef = useRef(bindings);
  const syncStatusRef = useRef<ShortcutSyncStatus>('synced');
  const lastLocalUpdatedAtRef = useRef(initialCache?.updatedAt ?? 0);
  const userIdRef = useRef<string | null>(null);
  const cloudSyncInFlightRef = useRef(false);
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

  const markSynced = useCallback(() => {
    syncStatusRef.current = 'synced';
    if (mountedRef.current) {
      setSyncStatus('synced');
      setSyncWarning(null);
    }
  }, []);

  const markFallback = useCallback(() => {
    syncStatusRef.current = 'local_fallback';
    if (mountedRef.current) {
      setSyncStatus('local_fallback');
      setSyncWarning(CLOUD_SYNC_WARNING);
    }
  }, []);

  const syncCloudAndLocal = useCallback(async () => {
    if (cloudSyncInFlightRef.current) {
      return;
    }

    cloudSyncInFlightRef.current = true;
    try {
      const userId = await ensureAnonymousUserId();
      userIdRef.current = userId;

      const cloudRows = await fetchCloudShortcutRows(userId);
      const cloudBindings = buildBindingsFromCloudRows(cloudRows);
      const cloudUpdatedAt = getBindingsUpdatedAtFromCloud(cloudRows);

      const localSnapshot = readShortcutCacheSnapshot();
      const localBindings = localSnapshot?.bindings ?? bindingsRef.current;
      const localUpdatedAt = localSnapshot?.updatedAt ?? lastLocalUpdatedAtRef.current;

      if (localUpdatedAt > cloudUpdatedAt) {
        const effectiveUpdatedAt = localUpdatedAt || Date.now();
        await upsertCloudBindings(userId, localBindings, effectiveUpdatedAt);
        applyLocalSnapshot(localBindings, effectiveUpdatedAt);
      } else if (cloudRows.length > 0) {
        const effectiveUpdatedAt = cloudUpdatedAt || Date.now();
        applyLocalSnapshot(cloudBindings, effectiveUpdatedAt);
      } else if (localUpdatedAt > 0) {
        const effectiveUpdatedAt = localUpdatedAt || Date.now();
        await upsertCloudBindings(userId, localBindings, effectiveUpdatedAt);
        applyLocalSnapshot(localBindings, effectiveUpdatedAt);
      } else {
        const defaults = getDefaultBindings();
        const effectiveUpdatedAt = Date.now();
        await upsertCloudBindings(userId, defaults, effectiveUpdatedAt);
        applyLocalSnapshot(defaults, effectiveUpdatedAt);
      }

      markSynced();
    } catch {
      markFallback();
    } finally {
      cloudSyncInFlightRef.current = false;
    }
  }, [applyLocalSnapshot, markFallback, markSynced]);

  const persistBindings = useCallback(async (nextBindings: ShortcutBindings) => {
    const nextUpdatedAt = Date.now();
    applyLocalSnapshot(nextBindings, nextUpdatedAt);

    if (syncStatusRef.current === 'local_fallback') {
      void syncCloudAndLocal();
      return;
    }

    try {
      const userId = userIdRef.current ?? await ensureAnonymousUserId();
      userIdRef.current = userId;
      await upsertCloudBindings(userId, nextBindings, nextUpdatedAt);
      markSynced();
    } catch {
      markFallback();
    }
  }, [applyLocalSnapshot, markFallback, markSynced, syncCloudAndLocal]);

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
    void syncCloudAndLocal();

    if (typeof window === 'undefined') {
      return () => {
        mountedRef.current = false;
      };
    }

    const handleOnline = () => {
      void syncCloudAndLocal();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
    };
  }, [syncCloudAndLocal]);

  const value = useMemo<KeyboardShortcutsContextValue>(() => ({
    bindings,
    syncStatus,
    syncWarning,
    setShortcutBinding,
    resetShortcutBinding,
    resetAllShortcutBindings,
    registerSearchInputResolver,
    getSearchInputElement,
    registerResultListController,
    getResultListController,
  }), [
    bindings,
    syncStatus,
    syncWarning,
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

import { useCallback, useEffect, useState } from 'react';
import {
  SEARCH_HISTORY_MAX_ENTRIES,
  SEARCH_HISTORY_STORAGE_KEY,
  SEARCH_HISTORY_UPDATED_EVENT,
  addSearchHistoryEntry,
  clearSearchHistory,
  readSearchHistory,
  removeSearchHistoryEntry,
  writeSearchHistory,
} from '@/lib/searchHistory';

export interface UseSearchHistoryResult {
  history: string[];
  addEntry: (query: string) => void;
  removeEntry: (query: string) => void;
  clear: () => void;
}

export function useSearchHistory(maxEntries = SEARCH_HISTORY_MAX_ENTRIES): UseSearchHistoryResult {
  const [history, setHistory] = useState<string[]>(() => readSearchHistory(maxEntries));

  useEffect(() => {
    const syncFromStorage = () => {
      setHistory(readSearchHistory(maxEntries));
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key == null || event.key === SEARCH_HISTORY_STORAGE_KEY) {
        syncFromStorage();
      }
    };

    window.addEventListener(SEARCH_HISTORY_UPDATED_EVENT, syncFromStorage);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener(SEARCH_HISTORY_UPDATED_EVENT, syncFromStorage);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [maxEntries]);

  const addEntry = useCallback((query: string) => {
    setHistory((currentHistory) => {
      const nextHistory = addSearchHistoryEntry(currentHistory, query, maxEntries);
      writeSearchHistory(nextHistory, maxEntries);
      return nextHistory;
    });
  }, [maxEntries]);

  const removeEntry = useCallback((query: string) => {
    setHistory((currentHistory) => {
      const nextHistory = removeSearchHistoryEntry(currentHistory, query, maxEntries);
      writeSearchHistory(nextHistory, maxEntries);
      return nextHistory;
    });
  }, [maxEntries]);

  const clear = useCallback(() => {
    setHistory([]);
    clearSearchHistory();
  }, []);

  return {
    history,
    addEntry,
    removeEntry,
    clear,
  };
}

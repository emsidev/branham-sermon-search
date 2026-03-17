import React, { useCallback, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useSearchHistory } from '@/hooks/useSearchHistory';

type QueryChangePhase = 'change' | 'composition-end';

export interface UnifiedSearchInputChangeMeta {
  isComposing: boolean;
  phase: QueryChangePhase;
}

export interface UnifiedSearchInputExecuteMeta {
  source: 'submit' | 'recent';
}

export interface UnifiedSearchInputProps {
  query: string;
  shortcutLabel: string;
  instantSearchEnabled: boolean;
  matchCase: boolean;
  wholeWord: boolean;
  fuzzy: boolean;
  onQueryChange: (value: string, meta: UnifiedSearchInputChangeMeta) => void;
  onExecuteQuery: (value: string, meta: UnifiedSearchInputExecuteMeta) => boolean | void;
  onToggleMatchCase: () => void;
  onToggleWholeWord: () => void;
  onToggleFuzzy: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  placeholder?: string;
  containerClassName?: string;
  inputClassName?: string;
  shortcutClassName?: string;
  toggleContainerClassName?: string;
  showSubmitButton?: boolean;
  submitButtonLabel?: string;
  viewTransitionName?: string;
}

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export default function UnifiedSearchInput({
  query,
  shortcutLabel,
  instantSearchEnabled,
  matchCase,
  wholeWord,
  fuzzy,
  onQueryChange,
  onExecuteQuery,
  onToggleMatchCase,
  onToggleWholeWord,
  onToggleFuzzy,
  inputRef,
  placeholder = 'search sermons ...',
  containerClassName,
  inputClassName,
  shortcutClassName = 'px-4 text-lg font-mono text-muted-foreground',
  toggleContainerClassName = 'mr-2 flex items-center gap-1',
  showSubmitButton = false,
  submitButtonLabel = 'search',
  viewTransitionName,
}: UnifiedSearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isComposingRef = useRef(false);
  const { history, addEntry: addSearchHistoryEntry } = useSearchHistory();
  const showSearchHistory = isFocused && query.trim().length === 0 && history.length > 0;
  const strictModeDisabled = fuzzy;

  const tryRecordHistory = useCallback((value: string) => {
    const normalizedQuery = normalizeQuery(value);
    if (!normalizedQuery) {
      return;
    }

    addSearchHistoryEntry(normalizedQuery);
  }, [addSearchHistoryEntry]);

  const executeQuery = useCallback((value: string, source: UnifiedSearchInputExecuteMeta['source']) => {
    const result = onExecuteQuery(value, { source });
    if (result === false) {
      return;
    }

    tryRecordHistory(value);
  }, [onExecuteQuery, tryRecordHistory]);

  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    executeQuery(query, 'submit');
  }, [executeQuery, query]);

  const handleSearchInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    onQueryChange(nextValue, {
      isComposing: isComposingRef.current || event.nativeEvent.isComposing,
      phase: 'change',
    });
  }, [onQueryChange]);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback((event: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    onQueryChange(event.currentTarget.value, {
      isComposing: false,
      phase: 'composition-end',
    });
  }, [onQueryChange]);

  const handleSearchInputBlur = useCallback(() => {
    setIsFocused(false);
    if (instantSearchEnabled) {
      tryRecordHistory(query);
    }
  }, [instantSearchEnabled, query, tryRecordHistory]);

  const handleSearchInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      setIsFocused(false);
      inputRef?.current?.blur();
      return;
    }

    if (!event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const loweredKey = event.key.toLowerCase();
    if (loweredKey === 'c') {
      if (strictModeDisabled) {
        return;
      }
      event.preventDefault();
      onToggleMatchCase();
      return;
    }
    if (loweredKey === 'w') {
      if (strictModeDisabled) {
        return;
      }
      event.preventDefault();
      onToggleWholeWord();
      return;
    }
    if (loweredKey === 'f') {
      event.preventDefault();
      onToggleFuzzy();
    }
  }, [inputRef, onToggleFuzzy, onToggleMatchCase, onToggleWholeWord, strictModeDisabled]);

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={containerClassName}
        style={{ viewTransitionName }}
      >
        <span className={shortcutClassName}>{shortcutLabel}</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsFocused(true)}
          onBlur={handleSearchInputBlur}
          onChange={handleSearchInputChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleSearchInputKeyDown}
          placeholder={placeholder}
          className={inputClassName}
          aria-label="Search sermons"
        />

        <div className={toggleContainerClassName}>
          <button
            type="button"
            onClick={onToggleMatchCase}
            disabled={strictModeDisabled}
            className={`rounded border px-2 py-1 text-[11px] font-mono transition-colors ${
              matchCase
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            } ${strictModeDisabled ? 'cursor-not-allowed opacity-40' : ''}`}
            aria-label="Toggle match case"
            title={strictModeDisabled ? 'Disabled while fuzzy mode is enabled' : 'Match case (Alt+C)'}
          >
            Aa
          </button>
          <button
            type="button"
            onClick={onToggleWholeWord}
            disabled={strictModeDisabled}
            className={`rounded border px-2 py-1 text-[11px] font-mono transition-colors ${
              wholeWord
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            } ${strictModeDisabled ? 'cursor-not-allowed opacity-40' : ''}`}
            aria-label="Toggle whole word"
            title={strictModeDisabled ? 'Disabled while fuzzy mode is enabled' : 'Whole word (Alt+W)'}
          >
            W
          </button>
          <button
            type="button"
            onClick={onToggleFuzzy}
            className={`rounded border px-2 py-1 text-[11px] font-mono transition-colors ${
              fuzzy
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Toggle fuzzy search"
            title="Fuzzy search (Alt+F)"
          >
            Fz
          </button>
        </div>

        {showSubmitButton && (
          <button
            type="submit"
            className="inline-flex h-full items-center gap-2 rounded-md bg-foreground px-4 font-mono text-sm text-background transition-opacity hover:opacity-90"
          >
            <Search className="h-4 w-4" />
            {submitButtonLabel}
          </button>
        )}

        {showSearchHistory && (
          <div
            className="absolute left-0 right-0 top-full z-40 mt-1 rounded-lg border border-border bg-popover p-2 shadow-xl"
            data-testid="search-history-dropdown"
          >
            <p className="mb-2 px-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Recent searches
            </p>
            <div className="flex flex-col gap-1">
              {history.map((historyQuery, index) => (
                <button
                  key={`${historyQuery.toLowerCase()}-${index}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => executeQuery(historyQuery, 'recent')}
                  className="rounded-md px-2 py-1.5 text-left font-mono text-sm text-foreground hover:bg-muted"
                  aria-label={`Use recent search ${historyQuery}`}
                >
                  {historyQuery}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

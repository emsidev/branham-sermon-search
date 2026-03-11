import { useCallback, useMemo, useState } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import {
  SHORTCUT_DEFINITIONS,
  formatShortcutKey,
  type ShortcutAction,
} from '@/lib/keyboardShortcuts';
import { getInstantSearchEnabled, setInstantSearchEnabled } from '@/lib/preferences';

type ThemeOption = 'system' | 'light' | 'dark';

export default function Settings() {
  const [instantSearchEnabled, setInstantSearchEnabledState] = useState(() => getInstantSearchEnabled());
  const [capturingAction, setCapturingAction] = useState<ShortcutAction | null>(null);
  const [shortcutErrors, setShortcutErrors] = useState<Partial<Record<ShortcutAction, string>>>({});
  const { theme, setTheme } = useTheme();
  const {
    bindings,
    syncStatus,
    syncWarning,
    setShortcutBinding,
    resetShortcutBinding,
    resetAllShortcutBindings,
  } = useKeyboardShortcuts();

  const selectedTheme = useMemo<ThemeOption>(() => {
    if (theme === 'light' || theme === 'dark') {
      return theme;
    }
    return 'system';
  }, [theme]);

  const handleInstantSearchToggle = useCallback(() => {
    setInstantSearchEnabledState((currentValue) => {
      const nextValue = !currentValue;
      setInstantSearchEnabled(nextValue);
      return nextValue;
    });
  }, []);

  const setShortcutError = useCallback((action: ShortcutAction, message: string) => {
    setShortcutErrors((currentValue) => ({
      ...currentValue,
      [action]: message,
    }));
  }, []);

  const clearShortcutError = useCallback((action: ShortcutAction) => {
    setShortcutErrors((currentValue) => {
      if (!currentValue[action]) {
        return currentValue;
      }

      const nextValue = { ...currentValue };
      delete nextValue[action];
      return nextValue;
    });
  }, []);

  const handleShortcutCaptureStart = useCallback((action: ShortcutAction) => {
    setCapturingAction(action);
    clearShortcutError(action);
  }, [clearShortcutError]);

  const handleShortcutCaptureKeyDown = useCallback((action: ShortcutAction, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (capturingAction !== action) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.ctrlKey || event.metaKey || event.altKey) {
      setShortcutError(action, 'Modifier combinations are not supported.');
      return;
    }

    if (event.key === 'Escape') {
      setCapturingAction(null);
      clearShortcutError(action);
      return;
    }

    const result = setShortcutBinding(action, event.key);
    if (!result.ok) {
      setShortcutError(action, result.error ?? 'Shortcut update failed.');
      return;
    }

    clearShortcutError(action);
    setCapturingAction(null);
  }, [capturingAction, clearShortcutError, setShortcutBinding, setShortcutError]);

  const handleShortcutCaptureBlur = useCallback((action: ShortcutAction) => {
    if (capturingAction === action) {
      setCapturingAction(null);
    }
  }, [capturingAction]);

  const handleShortcutReset = useCallback((action: ShortcutAction) => {
    const result = resetShortcutBinding(action);
    if (!result.ok) {
      setShortcutError(action, result.error ?? 'Shortcut reset failed.');
      return;
    }

    clearShortcutError(action);
  }, [clearShortcutError, resetShortcutBinding, setShortcutError]);

  const handleShortcutResetAll = useCallback(() => {
    setCapturingAction(null);
    setShortcutErrors({});
    resetAllShortcutBindings();
  }, [resetAllShortcutBindings]);

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto w-full max-w-[760px]">
        <h1 className="font-mono text-3xl font-semibold text-foreground">settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Customize your table search experience.</p>

        <div className="mt-6 space-y-4">
          <section className="surface-card p-4">
            <h2 className="font-mono text-sm font-semibold text-foreground">Appearance</h2>
            <label className="mt-3 block text-xs font-mono text-muted-foreground" htmlFor="theme-select">
              Theme
            </label>
            <select
              id="theme-select"
              value={selectedTheme}
              onChange={(event) => setTheme(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/35"
              aria-label="Theme"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </section>

          <section className="surface-card p-4">
            <h2 className="font-mono text-sm font-semibold text-foreground">Search features</h2>
            <div className="mt-3 font-mono text-sm text-muted-foreground">
              <span aria-hidden>*</span>{' '}
              Instant search {instantSearchEnabled ? 'on' : 'off'} -{' '}
              <button
                type="button"
                onClick={handleInstantSearchToggle}
                className="underline underline-offset-2 hover:text-foreground"
              >
                {instantSearchEnabled ? 'turn off' : 'turn on'}
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              When off, search runs only when you press Enter.
            </p>
          </section>

          <section className="surface-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-mono text-sm font-semibold text-foreground">Keyboard shortcuts</h2>
              <button
                type="button"
                onClick={handleShortcutResetAll}
                className="text-xs font-mono text-link underline underline-offset-2 hover:text-foreground"
              >
                reset all defaults
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Click a shortcut key to capture a new single-key binding.
            </p>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">Action</th>
                    <th className="px-2 py-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">Key</th>
                    <th className="px-2 py-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {SHORTCUT_DEFINITIONS.map((definition) => (
                    <tr key={definition.action} className="border-b border-border-subtle align-top">
                      <td className="px-2 py-3 font-mono text-sm text-foreground">{definition.label}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-shortcut-capture="true"
                            onClick={() => handleShortcutCaptureStart(definition.action)}
                            onKeyDown={(event) => handleShortcutCaptureKeyDown(definition.action, event)}
                            onBlur={() => handleShortcutCaptureBlur(definition.action)}
                            className={`rounded border px-3 py-1.5 font-mono text-sm ${capturingAction === definition.action ? 'border-link text-link' : 'border-border bg-background text-foreground hover:border-ring/50'}`}
                            aria-label={`Shortcut for ${definition.label}`}
                          >
                            {capturingAction === definition.action ? 'press key...' : formatShortcutKey(bindings[definition.action])}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShortcutReset(definition.action)}
                            className="text-xs font-mono text-link underline underline-offset-2 hover:text-foreground"
                          >
                            reset
                          </button>
                        </div>
                        {shortcutErrors[definition.action] && (
                          <p className="mt-1 font-mono text-xs text-destructive">
                            {shortcutErrors[definition.action]}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-3 text-sm text-muted-foreground">{definition.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 font-mono text-xs text-muted-foreground">
              Sync status: {syncStatus === 'synced' ? 'synced' : 'local fallback'}
            </p>
            {syncWarning && (
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">{syncWarning}</p>
            )}
          </section>
        </div>

        <Link
          to="/"
          className="mt-8 inline-block font-mono text-sm text-link underline underline-offset-4"
        >
          return to home
        </Link>
      </div>
    </div>
  );
}

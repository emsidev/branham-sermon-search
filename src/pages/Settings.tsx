import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { getInstantSearchEnabled, setInstantSearchEnabled } from '@/lib/preferences';

type ThemeOption = 'system' | 'light' | 'dark';

export default function Settings() {
  const [instantSearchEnabled, setInstantSearchEnabledState] = useState(() => getInstantSearchEnabled());
  const { theme, setTheme } = useTheme();

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
              <span aria-hidden>⚡</span>{' '}
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

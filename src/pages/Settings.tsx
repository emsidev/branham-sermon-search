import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInstantSearchEnabled, setInstantSearchEnabled } from '@/lib/preferences';

export default function Settings() {
  const [instantSearchEnabled, setInstantSearchEnabledState] = useState(() => getInstantSearchEnabled());

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
        <h1 className="text-3xl font-bold font-mono text-foreground">Settings</h1>
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          <div className="px-4 py-3 font-mono text-sm text-muted-foreground">
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
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          When off, search runs only when you press Enter.
        </p>

        <Link
          to="/"
          className="mt-8 inline-block font-mono text-sm text-[hsl(var(--link))] underline underline-offset-4"
        >
          return to home
        </Link>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { getResolvedDataPortMode, type ResolvedDataPortMode } from '@/data/dataPort';

export default function DataStorageBanner() {
  const [mode, setMode] = useState<ResolvedDataPortMode | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getResolvedDataPortMode().then((value) => {
      if (!cancelled) {
        setMode(value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (mode !== 'web-sqlite-unavailable') {
    return null;
  }

  return (
    <div className="border-b border-amber-400/40 bg-amber-100/70 px-4 py-2 text-xs font-mono text-amber-900 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-200">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 sm:flex-row">
        <div className="text-center sm:text-left">
          <p>Local storage is unavailable in this tab. This tab is running without offline sermon data.</p>
          <p className="mt-1 text-[11px] opacity-85">
            Browser mode cannot auto-install the SQLite DB. Use the desktop installer for automatic download and offline use.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded border border-amber-500/40 bg-transparent px-2 py-1 text-[11px] hover:bg-amber-200/50 dark:hover:bg-amber-900/40"
          >
            Retry check
          </button>
        </div>
      </div>
    </div>
  );
}

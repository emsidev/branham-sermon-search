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
    <div className="border-b border-amber-400/40 bg-amber-100/70 px-4 py-2 text-center text-xs font-mono text-amber-900 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-200">
      Local storage is unavailable in this tab. This tab is running without offline sermon data.
    </div>
  );
}

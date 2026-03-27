import { useEffect, useState } from 'react';
import { getResolvedDataPortMode, type ResolvedDataPortMode } from '@/data/dataPort';

const DEFAULT_CONTENT_SQLITE_DOWNLOAD_URL = 'https://github.com/emsidev/branham-sermon-search/releases/download/content-db/content.sqlite';

interface ContentManifest {
  downloadUrl?: string;
  url?: string;
}

export default function DataStorageBanner() {
  const [mode, setMode] = useState<ResolvedDataPortMode | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>(DEFAULT_CONTENT_SQLITE_DOWNLOAD_URL);

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

  useEffect(() => {
    if (mode !== 'web-sqlite-unavailable') {
      return;
    }

    let cancelled = false;
    void fetch('/data/content-manifest.json', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as ContentManifest;
      })
      .then((manifest) => {
        if (cancelled || !manifest) {
          return;
        }

        const candidate = manifest.downloadUrl ?? manifest.url;
        if (!candidate) {
          return;
        }

        if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
          setDownloadUrl(candidate);
        }
      })
      .catch(() => {
        // Keep default download URL when manifest lookup fails.
      });

    return () => {
      cancelled = true;
    };
  }, [mode]);

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
          <button
            type="button"
            onClick={() => window.open(downloadUrl, '_blank', 'noopener,noreferrer')}
            className="rounded border border-amber-500/40 bg-transparent px-2 py-1 text-[11px] hover:bg-amber-200/50 dark:hover:bg-amber-900/40"
          >
            Download DB file
          </button>
        </div>
      </div>
    </div>
  );
}

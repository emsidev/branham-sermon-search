import { Outlet, matchPath, useLocation } from 'react-router-dom';
import GlobalFooter from '@/components/layout/GlobalFooter';
import GlobalNavbar from '@/components/layout/GlobalNavbar';
import { Progress } from '@/components/ui/progress';
import { useDesktopBootstrapStatus } from '@/hooks/useDesktopBootstrapStatus';

export default function AppChrome() {
  const location = useLocation();
  const {
    isDesktop,
    status: bootstrapStatus,
    startDownload,
    isStartingDownload,
  } = useDesktopBootstrapStatus();
  const isSermonDetailRoute = Boolean(matchPath({ path: '/sermons/:id', end: true }, location.pathname));
  const isReadingModeEnabled = new URLSearchParams(location.search).get('reading') === '1';
  const shouldHideGlobalChrome = isSermonDetailRoute && isReadingModeEnabled;
  const shouldShowGlobalNavbar = !shouldHideGlobalChrome;
  const shouldShowGlobalFooter = !shouldHideGlobalChrome;
  const shouldShowDownloadBanner = isDesktop && bootstrapStatus.phase !== 'ready';
  const isBridgeUnavailableError = bootstrapStatus.phase === 'error'
    && Boolean(bootstrapStatus.error?.toLowerCase().includes('desktop bridge unavailable'));
  const downloadProgress = bootstrapStatus.totalBytes && bootstrapStatus.totalBytes > 0
    ? Math.min(100, Math.round((bootstrapStatus.receivedBytes / bootstrapStatus.totalBytes) * 100))
    : 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {shouldShowGlobalNavbar && <GlobalNavbar />}
      {shouldShowDownloadBanner && (
        <div className="border-b border-border bg-bg-muted px-4 py-3">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <div role="status" aria-live="polite" className="min-w-0 flex-1">
              {bootstrapStatus.phase === 'needs-download' && (
                <p className="font-mono text-xs text-foreground">Download sermons</p>
              )}
              {bootstrapStatus.phase === 'downloading' && (
                <div className="space-y-2">
                  <p className="font-mono text-xs text-foreground">Downloading sermons</p>
                  <Progress
                    value={downloadProgress}
                    aria-label="Downloading sermons progress"
                    className="h-2 max-w-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {bootstrapStatus.totalBytes
                      ? `${downloadProgress}%`
                      : `${Math.max(0, Math.round(bootstrapStatus.receivedBytes / 1024 / 1024))} MB`}
                  </p>
                </div>
              )}
              {bootstrapStatus.phase === 'error' && (
                <p className="text-xs text-muted-foreground">
                  {bootstrapStatus.error ?? 'Failed to download sermons. Please try again.'}
                </p>
              )}
            </div>
            <button
              type="button"
              className="rounded border border-border bg-background px-3 py-1 font-mono text-xs text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void startDownload();
              }}
              disabled={bootstrapStatus.phase === 'downloading' || isStartingDownload || isBridgeUnavailableError}
            >
              {bootstrapStatus.phase === 'downloading' || isStartingDownload
                ? 'Downloading...'
                : isBridgeUnavailableError
                  ? 'Unavailable'
                  : 'Download'}
            </button>
          </div>
        </div>
      )}
      <main className="flex-1">
        <Outlet />
      </main>
      {shouldShowGlobalFooter && <GlobalFooter />}
    </div>
  );
}

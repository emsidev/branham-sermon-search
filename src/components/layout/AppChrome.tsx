import { Outlet, matchPath, useLocation } from 'react-router-dom';
import GlobalFooter from '@/components/layout/GlobalFooter';
import GlobalNavbar from '@/components/layout/GlobalNavbar';
import { useDesktopBootstrapStatus } from '@/hooks/useDesktopBootstrapStatus';

export default function AppChrome() {
  const location = useLocation();
  const {
    isDesktop,
    status: bootstrapStatus,
    retryDownload,
    isRetrying,
  } = useDesktopBootstrapStatus();
  const isSermonDetailRoute = Boolean(matchPath({ path: '/sermons/:id', end: true }, location.pathname));
  const isReadingModeEnabled = new URLSearchParams(location.search).get('reading') === '1';
  const shouldHideGlobalChrome = isSermonDetailRoute && isReadingModeEnabled;
  const shouldShowGlobalNavbar = !shouldHideGlobalChrome;
  const shouldShowGlobalFooter = !shouldHideGlobalChrome;
  const shouldShowDownloadBanner = isDesktop
    && (bootstrapStatus.phase === 'checking' || bootstrapStatus.phase === 'downloading');
  const shouldShowErrorBanner = isDesktop
    && bootstrapStatus.phase === 'error'
    && bootstrapStatus.usingFallbackData;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {shouldShowGlobalNavbar && <GlobalNavbar />}
      {shouldShowDownloadBanner && (
        <div
          className="border-b border-border bg-bg-muted px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <p className="font-mono text-xs text-foreground">Downloading sermons...</p>
          {bootstrapStatus.phase === 'downloading' && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {bootstrapStatus.totalBytes
                ? `${Math.min(100, Math.round((bootstrapStatus.receivedBytes / bootstrapStatus.totalBytes) * 100))}%`
                : `${Math.max(0, Math.round(bootstrapStatus.receivedBytes / 1024 / 1024))} MB`}
            </p>
          )}
        </div>
      )}
      {shouldShowErrorBanner && (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Sermons database unavailable offline. Connect to the internet, then retry download.
          </p>
          <button
            type="button"
            className="rounded border border-border bg-background px-3 py-1 font-mono text-xs text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              void retryDownload();
            }}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying...' : 'Retry download'}
          </button>
        </div>
      )}
      <main className="flex-1">
        <Outlet />
      </main>
      {shouldShowGlobalFooter && <GlobalFooter />}
    </div>
  );
}

import { Outlet, matchPath, useLocation } from 'react-router-dom';
import GlobalFooter from '@/components/layout/GlobalFooter';
import GlobalNavbar from '@/components/layout/GlobalNavbar';

export default function AppChrome() {
  const location = useLocation();
  const isSermonDetailRoute = Boolean(matchPath({ path: '/sermons/:id', end: true }, location.pathname));
  const isReadingModeEnabled = new URLSearchParams(location.search).get('reading') === '1';
  const shouldHideGlobalChrome = isSermonDetailRoute && isReadingModeEnabled;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {!shouldHideGlobalChrome && <GlobalNavbar />}
      <main className="flex-1">
        <Outlet />
      </main>
      {!shouldHideGlobalChrome && <GlobalFooter />}
    </div>
  );
}

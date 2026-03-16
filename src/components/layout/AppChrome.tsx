import { Outlet } from 'react-router-dom';
import GlobalFooter from '@/components/layout/GlobalFooter';
import GlobalNavbar from '@/components/layout/GlobalNavbar';

export default function AppChrome() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <GlobalNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <GlobalFooter />
    </div>
  );
}

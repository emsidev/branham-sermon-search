import { NavLink } from 'react-router-dom';

function formatBuildDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function footerLinkClassName({ isActive }: { isActive: boolean }): string {
  return [
    'text-sm font-mono underline underline-offset-4 transition-colors',
    isActive ? 'text-foreground' : 'text-foreground/90 hover:text-foreground',
  ].join(' ');
}

export default function GlobalFooter() {
  const buildDate = typeof __APP_BUILD_DATE__ === 'string' ? __APP_BUILD_DATE__ : '';
  const appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
  const buildDateLabel = buildDate ? formatBuildDate(buildDate) : 'unknown';

  return (
    <footer className="border-t border-border-subtle bg-background">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col justify-between gap-10 px-6 py-10 md:flex-row md:items-start">
        <div className="space-y-3 text-muted-foreground">
          <p className="font-mono text-sm text-foreground/90">
            A fast, modern browser for the table search
          </p>
          <p className="font-mono text-sm">
            built {buildDateLabel} {'\u00B7'} v{appVersion}
          </p>
          <p className="max-w-[540px] text-sm">
            This site is an independent search interface for sermon study.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-4 md:gap-y-2">
          <NavLink to="/about" className={footerLinkClassName}>
            about
          </NavLink>
          <NavLink to="/books" className={footerLinkClassName}>
            books
          </NavLink>
          <NavLink to="/settings" className={footerLinkClassName}>
            settings
          </NavLink>
          <NavLink to="/search" className={footerLinkClassName}>
            search
          </NavLink>
        </nav>
      </div>
    </footer>
  );
}

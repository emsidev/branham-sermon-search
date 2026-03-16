import { NavLink } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatShortcutKey } from '@/lib/keyboardShortcuts';

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return [
    'inline-flex items-center gap-1.5 text-sm font-mono transition-colors',
    isActive ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground hover:text-foreground',
  ].join(' ');
}

export default function GlobalNavbar() {
  const { bindings } = useKeyboardShortcuts();

  return (
    <header className="border-b border-border-subtle">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-6 px-6 py-3">
        <NavLink to="/" className="shrink-0 font-mono text-sm font-medium text-foreground hover:text-link">
          the table search
        </NavLink>

        <nav className="flex shrink-0 items-center gap-6">
          <NavLink to="/books" className={navLinkClassName}>
            books <kbd className="rounded border border-border bg-muted px-1 text-[11px]">{formatShortcutKey(bindings.open_books)}</kbd>
          </NavLink>
          <NavLink to="/settings" className={navLinkClassName}>
            settings <kbd className="rounded border border-border bg-muted px-1 text-[11px]">{formatShortcutKey(bindings.open_settings)}</kbd>
          </NavLink>
          <NavLink to="/about" className={navLinkClassName}>
            about
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

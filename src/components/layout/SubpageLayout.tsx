import { useContext } from 'react';
import type React from 'react';
import { UNSAFE_NavigationContext, useNavigate } from 'react-router-dom';

interface SubpageLayoutProps {
  title: string;
  description?: string;
  backFallbackTo?: string;
  children: React.ReactNode;
}

interface NavigationContextValue {
  navigator?: {
    index?: number;
  };
}

function hasBrowserHistoryEntry(navigatorIndex?: number): boolean {
  if (typeof navigatorIndex === 'number') {
    return navigatorIndex > 0;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const historyState = window.history.state as { idx?: number } | null;
  return typeof historyState?.idx === 'number' && historyState.idx > 0;
}

export default function SubpageLayout({
  title,
  description,
  backFallbackTo = '/',
  children,
}: SubpageLayoutProps) {
  const navigate = useNavigate();
  const navigationContext = useContext(UNSAFE_NavigationContext) as NavigationContextValue | null;
  const navigatorIndex = navigationContext?.navigator?.index;

  const handleBack = () => {
    if (hasBrowserHistoryEntry(navigatorIndex)) {
      navigate(-1);
      return;
    }

    navigate(backFallbackTo, { replace: true });
  };

  return (
    <section className="mx-auto w-full max-w-[860px] px-6 py-16">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-mono text-5xl font-medium tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="mt-3 text-2xl text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleBack}
          className="font-mono text-2xl text-muted-foreground transition-colors hover:text-foreground"
        >
          {'\u2190'} back
        </button>
      </header>

      <div className="mt-10">
        {children}
      </div>
    </section>
  );
}

import { ArrowRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CardLinkSurface } from '@/components/cards/CardSurface';
import { CardPill } from '@/components/cards/CardPill';

interface BookMatchCardProps {
  to: string;
  linkState?: unknown;
  title: string;
  summary?: string | null;
  sermonCode?: string | null;
  location?: string | null;
  year?: number | null;
  tags?: string[] | null;
  subtitle?: string;
  imageSrc?: string;
  imageAlt?: string;
  isExact?: boolean;
}

function getFallbackInitial(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return '?';
  }
  return trimmed.charAt(0).toUpperCase();
}

export default function BookMatchCard({
  to,
  linkState,
  title,
  summary,
  sermonCode,
  location,
  year,
  tags,
  subtitle = 'Book',
  imageSrc = '/placeholder.svg',
  imageAlt,
  isExact = true,
}: BookMatchCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const fallbackInitial = useMemo(() => getFallbackInitial(title), [title]);
  const shownTags = (tags ?? []).filter(Boolean).slice(0, 4);

  return (
    <CardLinkSurface
      to={to}
      state={linkState}
      className="surface-card-book-match p-4 sm:p-6"
      data-testid="exact-title-card"
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {!imageFailed ? (
            <img
              src={imageSrc}
              alt={imageAlt ?? `${title} placeholder`}
              className="h-full w-full object-cover"
              data-testid="book-match-image"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span data-testid="book-match-fallback" className="font-mono text-lg text-fg-subtle">{fallbackInitial}</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-fg-muted">{subtitle}</span>
            {isExact && <CardPill variant="accent">exact</CardPill>}
          </div>

          <h2 className="truncate font-mono text-base font-medium text-foreground">{title}</h2>
          {summary ? (
            <p
              data-testid="book-match-summary"
              className="mt-1 text-sm leading-relaxed text-foreground/85"
            >
              {summary}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {sermonCode ? <CardPill>{sermonCode}</CardPill> : null}
            {location ? <CardPill>{location}</CardPill> : null}
            {year ? <CardPill>{String(year)}</CardPill> : null}
            {shownTags.map((tag) => (
              <CardPill key={tag}>{tag}</CardPill>
            ))}
          </div>
        </div>

        <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle transition-colors group-hover:text-fg" />
      </div>
    </CardLinkSurface>
  );
}

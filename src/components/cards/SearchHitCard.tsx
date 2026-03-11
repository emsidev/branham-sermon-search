import { CardLinkSurface } from '@/components/cards/CardSurface';
import { CardPill } from '@/components/cards/CardPill';
import { formatDate } from '@/lib/utils';

interface SearchHitCardProps {
  to: string;
  linkState?: unknown;
  onNavigate?: () => void;
  title: string;
  snippet: React.ReactNode;
  sermonCode?: string | null;
  location?: string | null;
  date: string;
  matchLabel: string;
  tags?: string[] | null;
  isExact?: boolean;
  selected?: boolean;
}

function parseYear(dateStr: string): number | null {
  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

export default function SearchHitCard({
  to,
  linkState,
  onNavigate,
  title,
  snippet,
  sermonCode,
  location,
  date,
  matchLabel,
  tags,
  isExact = false,
  selected = false,
}: SearchHitCardProps) {
  const year = parseYear(date);
  const shownTags = (tags ?? []).filter(Boolean).slice(0, 4);

  return (
    <CardLinkSurface
      to={to}
      state={linkState}
      onClick={() => onNavigate?.()}
      selected={selected}
      className={`px-5 py-4 ${isExact ? 'surface-card-exact' : ''}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="truncate font-mono text-base font-medium text-foreground">{title}</h2>
          {isExact && <CardPill variant="accent">exact</CardPill>}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">{snippet}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {sermonCode ? <CardPill>{sermonCode}</CardPill> : null}
        {location ? <CardPill>{location}</CardPill> : null}
        {year ? <CardPill>{String(year)}</CardPill> : null}
        <CardPill>{formatDate(date)}</CardPill>
        <CardPill>{matchLabel}</CardPill>
        {shownTags.map((tag) => (
          <CardPill key={tag}>{tag}</CardPill>
        ))}
      </div>
    </CardLinkSurface>
  );
}

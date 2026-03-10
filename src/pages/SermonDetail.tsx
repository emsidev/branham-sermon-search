import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Share2, Check, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fetchSermonById, fetchAdjacentSermons, type SermonDetail as Sermon } from '@/hooks/useSermons';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import SermonBreadcrumb from '@/components/SermonBreadcrumb';
import { extractHitChunkIndex, extractQueryTerms, formatMatchSourceLabel, resolveHighlightTermsForText, splitTextByTerms } from '@/lib/search';

interface AdjacentSermon {
  id: string;
  title: string;
  date: string;
}

export default function SermonDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [adjacent, setAdjacent] = useState<{ prev: AdjacentSermon | null; next: AdjacentSermon | null }>({ prev: null, next: null });
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);
  const { play } = useAudioPlayer();

  const searchQuery = searchParams.get('q')?.trim() ?? '';
  const matchSource = searchParams.get('source');
  const paragraphParam = searchParams.get('paragraph');
  const hitId = searchParams.get('hit');

  const highlightTerms = useMemo(() => extractQueryTerms(searchQuery, 12), [searchQuery]);
  const targetChunkIndex = useMemo(() => extractHitChunkIndex(hitId), [hitId]);
  const targetParagraphNumber = useMemo(() => {
    const parsedParagraph = paragraphParam ? Number.parseInt(paragraphParam, 10) : null;
    return Number.isFinite(parsedParagraph ?? NaN) ? parsedParagraph : null;
  }, [paragraphParam]);
  const matchContext = useMemo(() => {
    if (!matchSource && targetParagraphNumber == null) {
      return '';
    }

    return formatMatchSourceLabel(matchSource, targetParagraphNumber);
  }, [matchSource, targetParagraphNumber]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchSermonById(id).then(data => {
      setSermon(data);
      setLoading(false);
      if (data?.date) {
        fetchAdjacentSermons(data.date).then(setAdjacent);
      }
    });
  }, [id]);

  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [id, searchQuery]);

  useEffect(() => {
    if (!sermon || hasAutoScrolledRef.current) {
      return;
    }

    if (targetParagraphNumber != null) {
      const paragraphElement = contentRef.current?.querySelector<HTMLElement>(
        `[data-paragraph-number="${targetParagraphNumber}"]`
      );

      if (paragraphElement) {
        if (highlightTerms.length > 0) {
          const paragraphMatches = paragraphElement.querySelectorAll<HTMLElement>('[data-search-match="true"]');
          const desiredIndex = targetChunkIndex && targetChunkIndex > 0
            ? targetChunkIndex - 1
            : 0;
          const highlightedMatch = paragraphMatches[desiredIndex] ?? paragraphMatches[0];
          if (highlightedMatch) {
            highlightedMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            hasAutoScrolledRef.current = true;
            return;
          }
        }

        paragraphElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hasAutoScrolledRef.current = true;
        return;
      }
    }

    if (!highlightTerms.length) {
      return;
    }

    const matches = contentRef.current?.querySelectorAll<HTMLElement>('[data-search-match="true"]');
    if (!matches || matches.length === 0) {
      return;
    }

    const desiredIndex = targetChunkIndex && targetChunkIndex > 0
      ? targetChunkIndex - 1
      : 0;
    const targetMatch = matches[desiredIndex] ?? matches[0];
    targetMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    hasAutoScrolledRef.current = true;
  }, [sermon, highlightTerms, targetChunkIndex, targetParagraphNumber]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[860px] mx-auto px-6 lg:px-0 py-8 space-y-6">
          <div className="skeleton-shimmer h-4 w-48 rounded" />
          <div className="skeleton-shimmer h-8 w-3/4 rounded" />
          <div className="skeleton-shimmer h-32 w-full rounded" />
          <div className="skeleton-shimmer h-64 w-full rounded" />
        </div>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-mono">Sermon not found.</p>
          <Link to="/" className="mt-2 inline-block text-sm font-mono text-link hover:underline">
            {'<- Back to browse'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div ref={contentRef} className="mx-auto max-w-[900px] space-y-8 px-6 py-8 lg:px-0">
        <SermonBreadcrumb year={sermon.year} title={sermon.title} />

        <section className="space-y-4 border-b border-border-subtle pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="rounded-md border border-border bg-bg-muted px-2 py-1 text-foreground">
                  {sermon.sermon_code}
                </span>
                <span>{formatLongDate(sermon.date)}</span>
              </div>
              <h1 className="text-2xl font-bold font-mono leading-tight text-foreground">
                {highlightTerms.length
                  ? renderHighlightedText(sermon.title, highlightTerms)
                  : sermon.title}
              </h1>
              {sermon.summary ? (
                <p data-testid="sermon-summary" className="max-w-[72ch] text-sm leading-relaxed text-foreground/85">
                  {sermon.summary}
                </p>
              ) : null}
            </div>

            <div className="shrink-0">
              <div className="inline-flex overflow-hidden rounded-lg border border-border bg-background text-xs font-mono">
                {sermon.audio_url && (
                  <button
                    onClick={() => play(sermon.audio_url, sermon.title)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-foreground hover:bg-hover-row"
                  >
                    <Play className="h-3 w-3" />
                    Play
                  </button>
                )}
                {sermon.pdf_source_path && (
                  <a
                    href={sermon.pdf_source_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-foreground hover:bg-hover-row ${sermon.audio_url ? 'border-l border-border' : ''}`}
                  >
                    <FileText className="h-3 w-3" />
                    PDF
                  </a>
                )}
                <button
                  onClick={handleShare}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-foreground hover:bg-hover-row ${sermon.audio_url || sermon.pdf_source_path ? 'border-l border-border' : ''}`}
                >
                  {shared ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                  {shared ? 'Copied!' : 'Share'}
                </button>
              </div>
            </div>
          </div>

          {highlightTerms.length > 0 && (
            <p className="text-xs font-mono text-muted-foreground" title={hitId || undefined}>
              Search match{matchContext ? `: ${matchContext}` : ''}
            </p>
          )}

          <div
            data-testid="sermon-meta-strip"
            className="flex flex-wrap items-start gap-x-8 gap-y-3 rounded-lg border border-border bg-card/40 px-4 py-3"
          >
            <MetaField label="Date" value={formatLongDate(sermon.date)} />
            {sermon.location ? <MetaField label="Location" value={sermon.location} /> : null}
            {sermon.scripture ? <MetaField label="Scripture" value={sermon.scripture} /> : null}
            {formatDuration(sermon.duration_seconds) ? (
              <MetaField label="Duration" value={formatDuration(sermon.duration_seconds)!} />
            ) : null}
            {sermon.tags && sermon.tags.length > 0 ? (
              <div className="min-w-[120px]">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tags</p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {sermon.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-border bg-bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {(sermon.paragraphs.length > 0 || sermon.text_content) && (
          <section className="">
            {sermon.paragraphs.length > 0 ? (
              <div className="space-y-6">
                {sermon.paragraphs.map((paragraph) => {
                  const printedDiff = (
                    paragraph.printed_paragraph_number != null &&
                    paragraph.printed_paragraph_number !== paragraph.paragraph_number
                  );

                  return (
                    <section
                      key={paragraph.paragraph_number}
                      data-paragraph-number={paragraph.paragraph_number}
                      className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4 sm:grid-cols-[2.75rem_minmax(0,1fr)] sm:gap-5"
                    >
                      <p className="pt-1 text-right font-mono text-[11px] leading-4 text-muted-foreground">
                        <span className="font-bold text-2xl">{paragraph.paragraph_number}</span>
                        {printedDiff ? (
                          <span className="block text-[10px] text-muted-foreground/80">
                            PDF {paragraph.printed_paragraph_number}
                          </span>
                        ) : null}
                      </p>
                      <div className="whitespace-pre-wrap text-[1.02rem] leading-8 text-foreground/90">
                        {highlightTerms.length
                          ? renderHighlightedText(paragraph.paragraph_text, highlightTerms)
                          : paragraph.paragraph_text}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-[1.02rem] leading-8 text-foreground/90">
                {highlightTerms.length
                  ? renderHighlightedText(sermon.text_content, highlightTerms)
                  : sermon.text_content}
              </div>
            )}
          </section>
        )}

        <div className="flex items-center justify-between border-t border-border pt-6">
          {adjacent.prev ? (
            <Link
              to={`/sermons/${adjacent.prev.id}`}
              className="flex items-center gap-1 text-xs font-mono text-link hover:underline"
            >
              <ChevronLeft className="h-3 w-3" />
              <span className="max-w-[200px] truncate">{adjacent.prev.title}</span>
            </Link>
          ) : <div />}
          {adjacent.next ? (
            <Link
              to={`/sermons/${adjacent.next.id}`}
              className="flex items-center gap-1 text-xs font-mono text-link hover:underline"
            >
              <span className="max-w-[200px] truncate">{adjacent.next.title}</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[120px]">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function formatLongDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function renderHighlightedText(text: string, terms: string[]): React.ReactNode {
  const effectiveTerms = resolveHighlightTermsForText(text, terms);
  const parts = splitTextByTerms(text, effectiveTerms);
  return parts.map((part, idx) => {
    if (part.matched) {
      return (
        <mark
          key={idx}
          data-search-match="true"
          className="rounded-sm bg-yellow-200/70 px-0.5 text-foreground"
        >
          {part.text}
        </mark>
      );
    }

    return <React.Fragment key={idx}>{part.text}</React.Fragment>;
  });
}

function formatDuration(durationSeconds: number | null): string | null {
  if (durationSeconds == null || durationSeconds < 0) {
    return null;
  }

  const totalSeconds = Math.floor(durationSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Share2, Check } from 'lucide-react';
import { fetchSermonById, fetchAdjacentSermons, type SermonDetail as Sermon } from '@/hooks/useSermons';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import SermonBreadcrumb from '@/components/SermonBreadcrumb';
import MetadataCard from '@/components/MetadataCard';
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
        `[data-paragraph-number=\"${targetParagraphNumber}\"]`
      );

      if (paragraphElement) {
        if (highlightTerms.length > 0) {
          const paragraphMatches = paragraphElement.querySelectorAll<HTMLElement>('[data-search-match=\"true\"]');
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
          <Link to="/" className="text-[hsl(var(--link))] text-sm font-mono hover:underline mt-2 inline-block">
            {'<- Back to browse'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div ref={contentRef} className="max-w-[860px] mx-auto px-6 lg:px-0 py-8 space-y-6">
        <SermonBreadcrumb year={sermon.year} title={sermon.title} />

        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold font-mono text-foreground leading-tight">
            {highlightTerms.length
              ? renderHighlightedText(sermon.title, highlightTerms)
              : sermon.title}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            {sermon.audio_url && (
              <button
                onClick={() => play(sermon.audio_url, sermon.title)}
                className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-mono text-foreground hover:bg-[hsl(var(--hover-row))]"
              >
                <Play className="h-3 w-3" /> Play
              </button>
            )}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-mono text-foreground hover:bg-[hsl(var(--hover-row))]"
            >
              {shared ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
              {shared ? 'Copied!' : 'Share'}
            </button>
          </div>
        </div>

        {highlightTerms.length > 0 && (
          <p className="text-xs font-mono text-muted-foreground" title={hitId || undefined}>
            Search match{matchContext ? `: ${matchContext}` : ''}
          </p>
        )}

        <MetadataCard
          date={sermon.date}
          location={sermon.location}
          scripture={sermon.scripture}
          duration={formatDuration(sermon.duration_seconds)}
          tags={sermon.tags}
        />

        {sermon.pdf_source_path && (
          <a
            href={sermon.pdf_source_path}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-[hsl(var(--link))] hover:underline"
          >
            Open PDF source {'->'}
          </a>
        )}

        {(sermon.paragraphs.length > 0 || sermon.text_content) && (
          <div className="border-t border-border pt-6">
            <h2 className="text-sm font-bold font-mono text-foreground mb-4">Sermon Text</h2>
            {sermon.paragraphs.length > 0 ? (
              <div className="space-y-4">
                {sermon.paragraphs.map((paragraph) => {
                  const printedDiff = (
                    paragraph.printed_paragraph_number != null &&
                    paragraph.printed_paragraph_number !== paragraph.paragraph_number
                  );

                  return (
                    <section
                      key={paragraph.paragraph_number}
                      data-paragraph-number={paragraph.paragraph_number}
                      className="rounded border border-border/60 bg-card/30 px-4 py-3"
                    >
                      <p className="mb-2 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                        Paragraph {paragraph.paragraph_number}
                        {printedDiff ? ` [PDF ${paragraph.printed_paragraph_number}]` : ''}
                      </p>
                      <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {highlightTerms.length
                          ? renderHighlightedText(paragraph.paragraph_text, highlightTerms)
                          : paragraph.paragraph_text}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {highlightTerms.length
                  ? renderHighlightedText(sermon.text_content, highlightTerms)
                  : sermon.text_content}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-border pt-6 flex items-center justify-between">
          {adjacent.prev ? (
            <Link
              to={`/sermons/${adjacent.prev.id}`}
              className="flex items-center gap-1 text-xs font-mono text-[hsl(var(--link))] hover:underline"
            >
              <ChevronLeft className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{adjacent.prev.title}</span>
            </Link>
          ) : <div />}
          {adjacent.next ? (
            <Link
              to={`/sermons/${adjacent.next.id}`}
              className="flex items-center gap-1 text-xs font-mono text-[hsl(var(--link))] hover:underline"
            >
              <span className="truncate max-w-[200px]">{adjacent.next.title}</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          ) : <div />}
        </div>
      </div>
    </div>
  );
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
          className="bg-yellow-200/70 text-foreground px-0.5 rounded-sm"
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

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Share2, Check } from 'lucide-react';
import { fetchSermonById, fetchAdjacentSermons, type Sermon } from '@/hooks/useSermons';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import SermonBreadcrumb from '@/components/SermonBreadcrumb';
import MetadataCard from '@/components/MetadataCard';

interface AdjacentSermon {
  id: string;
  title: string;
  date: string;
}

export default function SermonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [adjacent, setAdjacent] = useState<{ prev: AdjacentSermon | null; next: AdjacentSermon | null }>({ prev: null, next: null });
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState(false);
  const { play } = useAudioPlayer();

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
            ← Back to browse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-[860px] mx-auto px-6 lg:px-0 py-8 space-y-6">
        {/* Breadcrumb */}
        <SermonBreadcrumb year={sermon.year} title={sermon.title} />

        {/* Title + actions */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold font-mono text-foreground leading-tight">{sermon.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            {sermon.audio_url && (
              <button
                onClick={() => play(sermon.audio_url!, sermon.title)}
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

        {/* Metadata */}
        <MetadataCard
          date={sermon.date}
          location={sermon.location}
          scripture={sermon.scripture}
          duration={sermon.duration}
          tags={sermon.tags}
        />

        {/* Source link */}
        {sermon.source_url && (
          <a
            href={sermon.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-[hsl(var(--link))] hover:underline"
          >
            View on churchages.net →
          </a>
        )}

        {/* Transcript */}
        {sermon.transcript && (
          <div className="border-t border-border pt-6">
            <h2 className="text-sm font-bold font-mono text-foreground mb-4">Transcript</h2>
            <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {sermon.transcript}
            </div>
          </div>
        )}

        {/* Adjacent navigation */}
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

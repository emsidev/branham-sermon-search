import React from 'react';
import { Play, Pause, X } from 'lucide-react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { Slider } from '@/components/ui/slider';

const RATES = [0.75, 1, 1.25, 1.5];

function formatTime(s: number): string {
  if (!s || !isFinite(s)) return '0:00';
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AudioPlayerBar() {
  const { url, title, isPlaying, currentTime, duration, playbackRate, toggle, seek, setRate, stop } = useAudioPlayer();

  if (!url) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background">
      <div className="max-w-[860px] mx-auto px-4 py-3 flex items-center gap-4">
        <button onClick={toggle} className="shrink-0 text-foreground" aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs font-mono text-foreground truncate">{title}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{formatTime(currentTime)}</span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={([v]) => seek(v)}
              className="flex-1"
            />
            <span className="text-[10px] font-mono text-muted-foreground w-10">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <select
            value={playbackRate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            className="text-[10px] font-mono bg-transparent border border-border rounded px-1 py-0.5 text-muted-foreground"
          >
            {RATES.map(r => (
              <option key={r} value={r}>{r}×</option>
            ))}
          </select>
          <button onClick={stop} className="text-muted-foreground hover:text-foreground" aria-label="Close player">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

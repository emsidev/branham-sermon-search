import { cn } from '@/lib/utils';

interface SermonProgressBarProps {
  progressPercent: number;
  hidden?: boolean;
  className?: string;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(Math.min(100, Math.max(0, value)));
}

export default function SermonProgressBar({
  progressPercent,
  hidden = false,
  className,
}: SermonProgressBarProps) {
  if (hidden) {
    return null;
  }

  const safeProgressPercent = clampPercent(progressPercent);

  return (
    <div
      data-testid="sermon-progress-bar"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        className,
      )}
    >
      <div
        role="progressbar"
        aria-label="Sermon reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeProgressPercent}
        aria-valuetext={`${safeProgressPercent}%`}
        className="h-1 w-full bg-muted/50"
      >
        <div
          data-testid="sermon-progress-indicator"
          className="h-full bg-black transition-[width] duration-200 dark:bg-white"
          style={{ width: `${safeProgressPercent}%` }}
        />
      </div>
    </div>
  );
}

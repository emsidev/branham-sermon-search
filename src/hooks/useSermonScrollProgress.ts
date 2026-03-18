import { useEffect, useState, type RefObject } from 'react';
import { calculateSermonScrollProgressPercent } from '@/lib/sermonScrollProgress';

interface UseSermonScrollProgressOptions {
  targetRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
}

interface UseSermonScrollProgressResult {
  progressPercent: number;
}

export function useSermonScrollProgress({
  targetRef,
  enabled = true,
}: UseSermonScrollProgressOptions): UseSermonScrollProgressResult {
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setProgressPercent(0);
      return;
    }

    let frameId: number | null = null;

    const update = () => {
      const target = targetRef.current;
      if (!target) {
        setProgressPercent(0);
        return;
      }

      const rect = target.getBoundingClientRect();
      const nextPercent = calculateSermonScrollProgressPercent({
        scrollY: window.scrollY ?? 0,
        viewportHeight: window.innerHeight ?? 0,
        targetTop: rect.top + (window.scrollY ?? 0),
        targetHeight: rect.height,
      });

      setProgressPercent((currentValue) => (currentValue === nextPercent ? currentValue : nextPercent));
    };

    const scheduleUpdate = () => {
      if (frameId != null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        update();
      });
    };

    update();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (frameId != null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [enabled, targetRef]);

  return { progressPercent };
}

import type React from 'react';

export type S02HitNavigationCommand = 'next' | 'prev' | 'next_sermon' | 'prev_sermon' | null;

export interface S02HitNavigationKeyContext {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  target: EventTarget | null;
}

export interface UseS02HitNavigationOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  enabled: boolean;
  initialIndex?: number;
  scrollBehavior?: ScrollBehavior;
  resetKey?: string | number | null;
  hitCycleKey?: string;
  sermonCycleKey?: string;
  onNextSermon?: () => void;
  onPrevSermon?: () => void;
}

export interface UseS02HitNavigationResult {
  activeIndex: number;
  totalHits: number;
  goNext: () => number;
  goPrev: () => number;
  goTo: (index: number) => number;
  handleKeyDown: (event: KeyboardEvent) => void;
}

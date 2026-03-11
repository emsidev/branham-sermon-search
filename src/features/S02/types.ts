import type React from 'react';

export type S02HitNavigationCommand = 'next' | 'prev' | null;

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
}

export interface UseS02HitNavigationResult {
  activeIndex: number;
  totalHits: number;
  goNext: () => number;
  goPrev: () => number;
  handleKeyDown: (event: KeyboardEvent) => void;
}

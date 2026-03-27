import type { DataPort } from '@/data/contracts';

export function getDesktopBridgeDataPort(): DataPort | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.desktopData ?? null;
}


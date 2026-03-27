import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type BootstrapStatus,
  READY_BOOTSTRAP_STATUS,
} from '@/data/desktopBootstrap';

function isDesktopRuntimeAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.desktopRuntime?.isElectron);
}

function getDesktopBootstrapBridge() {
  if (!isDesktopRuntimeAvailable()) {
    return null;
  }

  return window.desktopBootstrap ?? null;
}

export function useDesktopBootstrapStatus(): {
  isDesktop: boolean;
  status: BootstrapStatus;
  retryDownload: () => Promise<void>;
  isRetrying: boolean;
} {
  const [status, setStatus] = useState<BootstrapStatus>(READY_BOOTSTRAP_STATUS);
  const [isRetrying, setIsRetrying] = useState(false);
  const isDesktop = useMemo(() => isDesktopRuntimeAvailable(), []);

  useEffect(() => {
    const bridge = getDesktopBootstrapBridge();
    if (!bridge) {
      setStatus(READY_BOOTSTRAP_STATUS);
      return;
    }

    let cancelled = false;
    void bridge.getStatus()
      .then((nextStatus) => {
        if (!cancelled) {
          setStatus(nextStatus);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({
            phase: 'error',
            receivedBytes: 0,
            totalBytes: null,
            error: 'Failed to read desktop bootstrap status.',
            usingFallbackData: true,
          });
        }
      });

    const unsubscribe = bridge.subscribe((nextStatus) => {
      if (!cancelled) {
        setStatus(nextStatus);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const retryDownload = useCallback(async () => {
    const bridge = getDesktopBootstrapBridge();
    if (!bridge) {
      return;
    }

    setIsRetrying(true);
    try {
      const nextStatus = await bridge.retryDownload();
      setStatus(nextStatus);
    } finally {
      setIsRetrying(false);
    }
  }, []);

  return {
    isDesktop,
    status,
    retryDownload,
    isRetrying,
  };
}

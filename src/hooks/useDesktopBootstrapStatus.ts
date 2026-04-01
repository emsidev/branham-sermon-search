import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type BootstrapStatus,
  READY_BOOTSTRAP_STATUS,
} from '@/data/desktopBootstrap';

const DESKTOP_BRIDGE_UNAVAILABLE_MESSAGE =
  'Desktop bridge unavailable. Please reinstall or update the desktop app.';

function hasElectronUserAgent(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /electron/i.test(navigator.userAgent);
}

function isDesktopRuntimeAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(window.desktopRuntime?.isElectron) || hasElectronUserAgent();
}

function getDesktopBootstrapBridge() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.desktopBootstrap ?? null;
}

export function useDesktopBootstrapStatus(): {
  isDesktop: boolean;
  status: BootstrapStatus;
  startDownload: () => Promise<void>;
  isStartingDownload: boolean;
} {
  const [status, setStatus] = useState<BootstrapStatus>(READY_BOOTSTRAP_STATUS);
  const [isStartingDownload, setIsStartingDownload] = useState(false);
  const isDesktop = useMemo(() => isDesktopRuntimeAvailable(), []);

  useEffect(() => {
    const bridge = getDesktopBootstrapBridge();
    if (!bridge) {
      if (isDesktop) {
        setStatus({
          phase: 'error',
          receivedBytes: 0,
          totalBytes: null,
          error: DESKTOP_BRIDGE_UNAVAILABLE_MESSAGE,
          usingFallbackData: true,
        });
      } else {
        setStatus(READY_BOOTSTRAP_STATUS);
      }
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
            error: DESKTOP_BRIDGE_UNAVAILABLE_MESSAGE,
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
  }, [isDesktop]);

  const startDownload = useCallback(async () => {
    const bridge = getDesktopBootstrapBridge();
    if (!bridge) {
      if (isDesktop) {
        setStatus({
          phase: 'error',
          receivedBytes: 0,
          totalBytes: null,
          error: DESKTOP_BRIDGE_UNAVAILABLE_MESSAGE,
          usingFallbackData: true,
        });
      }
      return;
    }

    setIsStartingDownload(true);
    try {
      const nextStatus = await bridge.startDownload();
      setStatus(nextStatus);
    } finally {
      setIsStartingDownload(false);
    }
  }, [isDesktop]);

  return {
    isDesktop,
    status,
    startDownload,
    isStartingDownload,
  };
}

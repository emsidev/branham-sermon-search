import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDesktopBootstrapStatus } from './useDesktopBootstrapStatus';

function clearDesktopGlobals(): void {
  Object.defineProperty(window, 'desktopRuntime', {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(window, 'desktopBootstrap', {
    configurable: true,
    value: undefined,
  });
}

describe('useDesktopBootstrapStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearDesktopGlobals();
  });

  it('marks desktop as error when Electron UA is present but bridge is missing', async () => {
    clearDesktopGlobals();
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Electron/37.0.0');

    const { result } = renderHook(() => useDesktopBootstrapStatus());

    expect(result.current.isDesktop).toBe(true);
    await waitFor(() => {
      expect(result.current.status.phase).toBe('error');
      expect(result.current.status.error).toContain('Desktop bridge unavailable');
    });
  });

  it('reads bootstrap status when desktop bridge is available', async () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Electron/37.0.0');

    const getStatus = vi.fn().mockResolvedValue({
      phase: 'needs-download',
      receivedBytes: 0,
      totalBytes: null,
      error: null,
      usingFallbackData: true,
    });

    Object.defineProperty(window, 'desktopBootstrap', {
      configurable: true,
      value: {
        getStatus,
        startDownload: vi.fn(),
        subscribe: () => () => undefined,
      },
    });

    const { result } = renderHook(() => useDesktopBootstrapStatus());

    await waitFor(() => {
      expect(result.current.status.phase).toBe('needs-download');
    });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });
});

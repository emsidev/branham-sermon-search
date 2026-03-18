import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';
import { useSermonScrollProgress } from './useSermonScrollProgress';

function setWindowScrollY(value: number): void {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value,
  });
}

describe('useSermonScrollProgress', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    setWindowScrollY(100);
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 800,
    });
  });

  it('returns 0 when target is missing', () => {
    const { result } = renderHook(() => useSermonScrollProgress({
      targetRef: { current: null } as React.RefObject<HTMLElement | null>,
    }));

    expect(result.current.progressPercent).toBe(0);
  });

  it('updates progress on scroll and resize events', async () => {
    const target = document.createElement('div');
    const targetRef = { current: target } as React.RefObject<HTMLElement | null>;

    vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => ({
      x: 0,
      y: 300 - (window.scrollY ?? 0),
      width: 900,
      height: 1800,
      top: 300 - (window.scrollY ?? 0),
      right: 900,
      bottom: (300 - (window.scrollY ?? 0)) + 1800,
      left: 0,
      toJSON: () => ({}),
    }));

    const { result } = renderHook(() => useSermonScrollProgress({ targetRef }));

    await waitFor(() => {
      expect(result.current.progressPercent).toBe(0);
    });

    act(() => {
      setWindowScrollY(1000);
      window.dispatchEvent(new Event('scroll'));
    });

    await waitFor(() => {
      expect(result.current.progressPercent).toBe(70);
    });

    act(() => {
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        writable: true,
        value: 1000,
      });
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(result.current.progressPercent).toBe(70);
    });
  });

  it('resets to 0 when disabled', async () => {
    const target = document.createElement('div');
    const targetRef = { current: target } as React.RefObject<HTMLElement | null>;
    vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => ({
      x: 0,
      y: 300 - (window.scrollY ?? 0),
      width: 900,
      height: 1800,
      top: 300 - (window.scrollY ?? 0),
      right: 900,
      bottom: (300 - (window.scrollY ?? 0)) + 1800,
      left: 0,
      toJSON: () => ({}),
    }));

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useSermonScrollProgress({ targetRef, enabled }),
      { initialProps: { enabled: true } },
    );

    act(() => {
      setWindowScrollY(1000);
      window.dispatchEvent(new Event('scroll'));
    });

    await waitFor(() => {
      expect(result.current.progressPercent).toBe(70);
    });

    rerender({ enabled: false });
    expect(result.current.progressPercent).toBe(0);
  });
});

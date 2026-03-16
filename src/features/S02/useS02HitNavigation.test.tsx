import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';
import { useS02HitNavigation } from './useS02HitNavigation';

function buildHitContainer(hitCount: number): HTMLDivElement {
  const container = document.createElement('div');
  for (let index = 0; index < hitCount; index += 1) {
    const mark = document.createElement('mark');
    mark.dataset.searchMatch = 'true';
    mark.textContent = `hit-${index + 1}`;
    container.appendChild(mark);
  }

  return container;
}

function createKeyboardEvent(
  key: string,
  options?: {
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    target?: EventTarget | null;
  },
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey: options?.shiftKey ?? false,
    altKey: options?.altKey ?? false,
    ctrlKey: options?.ctrlKey ?? false,
    metaKey: options?.metaKey ?? false,
    bubbles: true,
    cancelable: true,
  });

  Object.defineProperty(event, 'target', {
    value: options?.target ?? document.body,
    configurable: true,
  });

  return event;
}

describe('useS02HitNavigation', () => {
  beforeEach(() => {
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {};
    }
  });

  it('discovers hit marks and applies initial index', async () => {
    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    const containerRef = {
      current: buildHitContainer(3),
    } as React.RefObject<HTMLElement | null>;

    const { result } = renderHook(() => useS02HitNavigation({
      containerRef,
      enabled: true,
      initialIndex: 1,
      scrollBehavior: 'auto',
    }));

    await waitFor(() => {
      expect(result.current.totalHits).toBe(3);
      expect(result.current.activeIndex).toBe(1);
    });

    expect(scrollSpy).toHaveBeenCalledTimes(1);
    scrollSpy.mockRestore();
  });

  it('navigates next/prev with wrap-around behavior', async () => {
    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    const containerRef = {
      current: buildHitContainer(3),
    } as React.RefObject<HTMLElement | null>;

    const { result } = renderHook(() => useS02HitNavigation({
      containerRef,
      enabled: true,
      initialIndex: 1,
      scrollBehavior: 'auto',
    }));

    await waitFor(() => {
      expect(result.current.activeIndex).toBe(1);
    });

    act(() => {
      result.current.goNext();
    });
    expect(result.current.activeIndex).toBe(2);

    act(() => {
      result.current.goNext();
    });
    expect(result.current.activeIndex).toBe(0);

    act(() => {
      result.current.goPrev();
    });
    expect(result.current.activeIndex).toBe(2);

    act(() => {
      result.current.goTo(1);
    });
    expect(result.current.activeIndex).toBe(1);

    act(() => {
      result.current.goTo(99);
    });
    expect(result.current.activeIndex).toBe(2);

    expect(scrollSpy).toHaveBeenCalled();
    scrollSpy.mockRestore();
  });

  it('handles N/Shift+N and M/Shift+M while guarding typing/modifier contexts', async () => {
    const containerRef = {
      current: buildHitContainer(2),
    } as React.RefObject<HTMLElement | null>;
    const onNextSermon = vi.fn();
    const onPrevSermon = vi.fn();

    const { result } = renderHook(() => useS02HitNavigation({
      containerRef,
      enabled: true,
      initialIndex: 0,
      scrollBehavior: 'auto',
      onNextSermon,
      onPrevSermon,
    }));

    await waitFor(() => {
      expect(result.current.activeIndex).toBe(0);
    });

    const nextEvent = createKeyboardEvent('n', { target: document.body });
    act(() => {
      result.current.handleKeyDown(nextEvent);
    });
    expect(nextEvent.defaultPrevented).toBe(true);
    expect(result.current.activeIndex).toBe(1);

    const prevEvent = createKeyboardEvent('N', {
      shiftKey: true,
      target: document.body,
    });
    act(() => {
      result.current.handleKeyDown(prevEvent);
    });
    expect(prevEvent.defaultPrevented).toBe(true);
    expect(result.current.activeIndex).toBe(0);

    const nextSermonEvent = createKeyboardEvent('m', { target: document.body });
    act(() => {
      result.current.handleKeyDown(nextSermonEvent);
    });
    expect(nextSermonEvent.defaultPrevented).toBe(true);
    expect(onNextSermon).toHaveBeenCalledTimes(1);

    const prevSermonEvent = createKeyboardEvent('M', {
      shiftKey: true,
      target: document.body,
    });
    act(() => {
      result.current.handleKeyDown(prevSermonEvent);
    });
    expect(prevSermonEvent.defaultPrevented).toBe(true);
    expect(onPrevSermon).toHaveBeenCalledTimes(1);

    const input = document.createElement('input');
    const typingEvent = createKeyboardEvent('n', { target: input });
    act(() => {
      result.current.handleKeyDown(typingEvent);
    });
    expect(typingEvent.defaultPrevented).toBe(false);
    expect(result.current.activeIndex).toBe(0);

    const modifiedEvent = createKeyboardEvent('n', {
      ctrlKey: true,
      target: document.body,
    });
    act(() => {
      result.current.handleKeyDown(modifiedEvent);
    });
    expect(modifiedEvent.defaultPrevented).toBe(false);
    expect(result.current.activeIndex).toBe(0);
    expect(onNextSermon).toHaveBeenCalledTimes(1);
    expect(onPrevSermon).toHaveBeenCalledTimes(1);
  });

  it('honors enabled state and resets when hit list changes', async () => {
    const container = buildHitContainer(2);
    const containerRef = {
      current: container,
    } as React.RefObject<HTMLElement | null>;

    const { result, rerender } = renderHook(
      ({ enabled, initialIndex }: { enabled: boolean; initialIndex: number }) => useS02HitNavigation({
        containerRef,
        enabled,
        initialIndex,
        scrollBehavior: 'auto',
      }),
      {
        initialProps: { enabled: false, initialIndex: 1 },
      },
    );

    expect(result.current.totalHits).toBe(0);
    expect(result.current.activeIndex).toBe(-1);

    rerender({ enabled: true, initialIndex: 1 });
    await waitFor(() => {
      expect(result.current.totalHits).toBe(2);
      expect(result.current.activeIndex).toBe(1);
    });

    container.lastElementChild?.remove();
    await waitFor(() => {
      expect(result.current.totalHits).toBe(1);
      expect(result.current.activeIndex).toBe(0);
    });

    rerender({ enabled: false, initialIndex: 0 });
    await waitFor(() => {
      expect(result.current.totalHits).toBe(0);
      expect(result.current.activeIndex).toBe(-1);
    });
  });
});

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSearchPopupController } from './useSearchPopupController';

describe('useSearchPopupController', () => {
  it('starts closed by default', () => {
    const { result } = renderHook(() => useSearchPopupController({ shortcutKey: 'f' }));
    expect(result.current.isOpen).toBe(false);
    expect(result.current.shouldFocusInput).toBe(false);
  });

  it('opens from toolbar and requests focus', () => {
    const onOpenFromToolbar = vi.fn();
    const { result } = renderHook(() => useSearchPopupController({
      shortcutKey: 'f',
      onOpenFromToolbar,
    }));

    act(() => {
      result.current.openFromToolbar();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.shouldFocusInput).toBe(true);
    expect(onOpenFromToolbar).toHaveBeenCalledTimes(1);
  });

  it('opens from shortcut and requests focus', () => {
    const onOpenFromShortcut = vi.fn();
    const { result } = renderHook(() => useSearchPopupController({
      shortcutKey: 'f',
      onOpenFromShortcut,
    }));

    act(() => {
      result.current.openFromShortcut();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.shouldFocusInput).toBe(true);
    expect(onOpenFromShortcut).toHaveBeenCalledTimes(1);
  });

  it('consumes focus request and closes cleanly', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useSearchPopupController({
      shortcutKey: 'f',
      onClose,
    }));

    act(() => {
      result.current.openFromToolbar();
    });
    expect(result.current.shouldFocusInput).toBe(true);

    act(() => {
      result.current.consumeInputFocusRequest();
    });
    expect(result.current.shouldFocusInput).toBe(false);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles shortcut keydown and prevents default browser behavior', () => {
    const onOpenFromShortcut = vi.fn();
    const { result } = renderHook(() => useSearchPopupController({
      shortcutKey: 'f',
      onOpenFromShortcut,
    }));

    const preventDefault = vi.fn();
    const event = {
      key: 'f',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      defaultPrevented: false,
      preventDefault,
      target: document.body,
    } as unknown as KeyboardEvent;

    act(() => {
      result.current.handleGlobalKeyDown(event);
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);
    expect(onOpenFromShortcut).toHaveBeenCalledTimes(1);
  });

  it('does not open when typing guard blocks the event', () => {
    const onOpenFromShortcut = vi.fn();
    const { result } = renderHook(() => useSearchPopupController({
      shortcutKey: 'f',
      isTypingTarget: () => true,
      onOpenFromShortcut,
    }));

    const event = {
      key: 'f',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      defaultPrevented: false,
      preventDefault: vi.fn(),
      target: document.body,
    } as unknown as KeyboardEvent;

    act(() => {
      result.current.handleGlobalKeyDown(event);
    });

    expect(result.current.isOpen).toBe(false);
    expect(onOpenFromShortcut).not.toHaveBeenCalled();
  });
});


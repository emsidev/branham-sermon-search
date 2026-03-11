import { useCallback, useState } from 'react';
import { shouldTriggerS04Shortcut } from './shortcutGuards';
import type {
  S04SearchPopupControllerOptions,
  S04SearchPopupControllerResult,
} from './types';

export function useS04SearchPopupController(
  options: S04SearchPopupControllerOptions,
): S04SearchPopupControllerResult {
  const {
    shortcutKey,
    isTypingTarget,
    isShortcutCaptureTarget,
    onOpenFromToolbar,
    onOpenFromShortcut,
    onClose: onCloseLifecycle,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [shouldFocusInput, setShouldFocusInput] = useState(false);

  const openFromToolbar = useCallback(() => {
    setIsOpen(true);
    setShouldFocusInput(true);
    onOpenFromToolbar?.();
  }, [onOpenFromToolbar]);

  const openFromShortcut = useCallback(() => {
    setIsOpen(true);
    setShouldFocusInput(true);
    onOpenFromShortcut?.();
  }, [onOpenFromShortcut]);

  const close = useCallback(() => {
    setIsOpen(false);
    setShouldFocusInput(false);
    onCloseLifecycle?.();
  }, [onCloseLifecycle]);

  const consumeInputFocusRequest = useCallback(() => {
    setShouldFocusInput(false);
  }, []);

  const handleGlobalKeyDown = useCallback((event: KeyboardEvent) => {
    if (!shouldTriggerS04Shortcut(event, shortcutKey, { isTypingTarget, isShortcutCaptureTarget })) {
      return;
    }

    event.preventDefault();
    openFromShortcut();
  }, [isShortcutCaptureTarget, isTypingTarget, openFromShortcut, shortcutKey]);

  return {
    isOpen,
    shouldFocusInput,
    openFromToolbar,
    openFromShortcut,
    close,
    consumeInputFocusRequest,
    handleGlobalKeyDown,
  };
}

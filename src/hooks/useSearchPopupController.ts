import { useCallback, useState } from 'react';
import {
  shouldTriggerSearchPopupShortcut,
  type SearchPopupShortcutCaptureTargetGuard,
  type SearchPopupTypingTargetGuard,
} from '@/lib/searchPopupShortcuts';

export interface UseSearchPopupControllerOptions {
  shortcutKey: string;
  isTypingTarget?: SearchPopupTypingTargetGuard;
  isShortcutCaptureTarget?: SearchPopupShortcutCaptureTargetGuard;
  onOpenFromToolbar?: () => void;
  onOpenFromShortcut?: () => void;
  onClose?: () => void;
}

export interface UseSearchPopupControllerResult {
  isOpen: boolean;
  shouldFocusInput: boolean;
  openFromToolbar: () => void;
  openFromShortcut: () => void;
  close: () => void;
  consumeInputFocusRequest: () => void;
  handleGlobalKeyDown: (event: KeyboardEvent) => void;
}

export function useSearchPopupController(
  options: UseSearchPopupControllerOptions,
): UseSearchPopupControllerResult {
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
    if (!shouldTriggerSearchPopupShortcut(event, shortcutKey, { isTypingTarget, isShortcutCaptureTarget })) {
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

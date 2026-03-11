import type { ReactNode } from 'react';

export interface S04SearchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
  className?: string;
}

export type S04TypingTargetGuard = (target: EventTarget | null) => boolean;
export type S04ShortcutCaptureTargetGuard = (target: EventTarget | null) => boolean;

export interface S04SearchPopupControllerOptions {
  shortcutKey: string;
  isTypingTarget?: S04TypingTargetGuard;
  isShortcutCaptureTarget?: S04ShortcutCaptureTargetGuard;
  onOpenFromToolbar?: () => void;
  onOpenFromShortcut?: () => void;
  onClose?: () => void;
}

export interface S04SearchPopupControllerResult {
  isOpen: boolean;
  shouldFocusInput: boolean;
  openFromToolbar: () => void;
  openFromShortcut: () => void;
  close: () => void;
  consumeInputFocusRequest: () => void;
  handleGlobalKeyDown: (event: KeyboardEvent) => void;
}

import { formatShortcutKey } from '@/lib/keyboardShortcuts';

interface ReadingModeToggleButtonProps {
  enabled: boolean;
  shortcutKey: string;
  onToggle: () => void;
  className?: string;
}

export default function ReadingModeToggleButton({
  enabled,
  shortcutKey,
  onToggle,
  className,
}: ReadingModeToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label="Toggle reading mode"
      className={className}
    >
      Reading {enabled ? 'on' : 'off'}
      <kbd className="rounded border border-border bg-muted px-1 text-[11px]">{formatShortcutKey(shortcutKey)}</kbd>
    </button>
  );
}

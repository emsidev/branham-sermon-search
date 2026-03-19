ALTER TABLE public.user_keyboard_shortcuts
  DROP CONSTRAINT IF EXISTS user_keyboard_shortcuts_action_valid;

ALTER TABLE public.user_keyboard_shortcuts
  ADD CONSTRAINT user_keyboard_shortcuts_action_valid CHECK (
    action IN (
      'focus_search',
      'open_books',
      'open_settings',
      'result_next',
      'result_prev',
      'toggle_reading_mode',
      'toggle_slide_view',
      'cycle_highlight_mode',
      'reader_extend_selection',
      'reader_shrink_selection'
    )
  );

ALTER TABLE public.user_keyboard_shortcuts
  DROP CONSTRAINT IF EXISTS user_keyboard_shortcuts_key_valid;

ALTER TABLE public.user_keyboard_shortcuts
  ADD CONSTRAINT user_keyboard_shortcuts_key_valid CHECK (
    (
      char_length(key) = 1
      AND key = lower(key)
      AND key !~ '\s'
    )
    OR key IN ('ArrowRight', 'ArrowLeft', 'Space')
  );

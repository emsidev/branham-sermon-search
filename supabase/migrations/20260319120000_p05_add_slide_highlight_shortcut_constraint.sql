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
      'add_slide_highlight',
      'cycle_highlight_mode',
      'reader_extend_selection',
      'reader_shrink_selection'
    )
  );

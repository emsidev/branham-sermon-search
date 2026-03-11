CREATE TABLE IF NOT EXISTS public.user_keyboard_shortcuts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_keyboard_shortcuts_action_key UNIQUE (user_id, action),
  CONSTRAINT user_keyboard_shortcuts_user_key UNIQUE (user_id, key),
  CONSTRAINT user_keyboard_shortcuts_action_valid CHECK (
    action IN ('focus_search', 'open_books', 'open_settings', 'result_next', 'result_prev')
  ),
  CONSTRAINT user_keyboard_shortcuts_key_valid CHECK (
    char_length(key) = 1
    AND key = lower(key)
    AND key !~ '\s'
  )
);

CREATE INDEX IF NOT EXISTS idx_user_keyboard_shortcuts_user_id
  ON public.user_keyboard_shortcuts(user_id);

DROP TRIGGER IF EXISTS trg_user_keyboard_shortcuts_updated_at ON public.user_keyboard_shortcuts;
CREATE TRIGGER trg_user_keyboard_shortcuts_updated_at
BEFORE UPDATE ON public.user_keyboard_shortcuts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_keyboard_shortcuts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their keyboard shortcuts" ON public.user_keyboard_shortcuts;
CREATE POLICY "Users can select their keyboard shortcuts"
  ON public.user_keyboard_shortcuts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their keyboard shortcuts" ON public.user_keyboard_shortcuts;
CREATE POLICY "Users can insert their keyboard shortcuts"
  ON public.user_keyboard_shortcuts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their keyboard shortcuts" ON public.user_keyboard_shortcuts;
CREATE POLICY "Users can update their keyboard shortcuts"
  ON public.user_keyboard_shortcuts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their keyboard shortcuts" ON public.user_keyboard_shortcuts;
CREATE POLICY "Users can delete their keyboard shortcuts"
  ON public.user_keyboard_shortcuts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_keyboard_shortcuts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_keyboard_shortcuts_id_seq TO authenticated;

ALTER TABLE public.game_players
  ADD COLUMN IF NOT EXISTS is_captain boolean NOT NULL DEFAULT false;

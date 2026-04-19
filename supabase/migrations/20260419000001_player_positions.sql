ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS preferred_positions text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.players
  DROP CONSTRAINT IF EXISTS players_positions_check;

ALTER TABLE public.players
  ADD CONSTRAINT players_positions_check
  CHECK (preferred_positions <@ ARRAY['GK','CB','CM','W','ST']::text[]);

-- Prevent duplicate aliases per player (normalised form must be unique)
ALTER TABLE public.player_aliases
  ADD CONSTRAINT player_aliases_player_alias_unique UNIQUE (player_id, alias);

-- Remove duplicate aliases before adding uniqueness constraint.
-- Keeps the earliest row (by created_at) when duplicates exist.
DELETE FROM public.player_aliases
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY player_id, alias
        ORDER BY created_at ASC
      ) AS rn
    FROM public.player_aliases
  ) ranked
  WHERE rn > 1
);

-- Prevent duplicate aliases per player (normalised form must be unique)
ALTER TABLE public.player_aliases
  ADD CONSTRAINT player_aliases_player_alias_unique UNIQUE (player_id, alias);

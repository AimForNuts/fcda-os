ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS nationality text NOT NULL DEFAULT 'PT';

UPDATE public.players
SET nationality = 'PT'
WHERE nationality IS NULL OR btrim(nationality) = '';

ALTER TABLE public.players
  ALTER COLUMN nationality SET DEFAULT 'PT',
  ALTER COLUMN nationality SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'players_nationality_iso_check'
      AND conrelid = 'public.players'::regclass
  ) THEN
    ALTER TABLE public.players
      ADD CONSTRAINT players_nationality_iso_check
      CHECK (nationality ~ '^[A-Z]{2}$');
  END IF;
END $$;

DROP VIEW IF EXISTS public.player_stats;

CREATE OR REPLACE VIEW public.players_public AS
SELECT
  p.id,
  p.shirt_number,
  CASE
    WHEN auth.uid() IS NOT NULL AND public.is_approved()
    THEN p.sheet_name
    ELSE 'Jogador ' || COALESCE(p.shirt_number::text, '?')
  END AS display_name,
  p.current_rating,
  p.profile_id,
  CASE
    WHEN auth.uid() IS NOT NULL AND public.is_approved()
    THEN p.avatar_path
    ELSE NULL
  END AS avatar_path,
  CASE
    WHEN auth.uid() IS NOT NULL AND public.is_approved()
    THEN p.description
    ELSE NULL
  END AS description,
  p.nationality
FROM public.players p;

GRANT SELECT ON public.players_public TO anon, authenticated;

CREATE VIEW public.player_stats AS
SELECT
  pp.id,
  pp.display_name,
  pp.shirt_number,
  pp.profile_id,
  pp.avatar_path,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
  ), 0) AS total_all,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND g.counts_for_stats AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
  ), 0) AS total_comp,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
      AND ((gp.team = 'a' AND g.score_a > g.score_b) OR (gp.team = 'b' AND g.score_b > g.score_a))
  ), 0) AS wins_all,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
      AND g.score_a = g.score_b
  ), 0) AS draws_all,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
      AND ((gp.team = 'a' AND g.score_a < g.score_b) OR (gp.team = 'b' AND g.score_b < g.score_a))
  ), 0) AS losses_all,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND g.counts_for_stats AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
      AND ((gp.team = 'a' AND g.score_a > g.score_b) OR (gp.team = 'b' AND g.score_b > g.score_a))
  ), 0) AS wins_comp,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND g.counts_for_stats AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
      AND g.score_a = g.score_b
  ), 0) AS draws_comp,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND g.counts_for_stats AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
      AND ((gp.team = 'a' AND g.score_a < g.score_b) OR (gp.team = 'b' AND g.score_b < g.score_a))
  ), 0) AS losses_comp,
  pp.nationality
FROM public.players_public pp
LEFT JOIN public.game_players gp ON gp.player_id = pp.id
LEFT JOIN public.games g ON g.id = gp.game_id
GROUP BY pp.id, pp.display_name, pp.shirt_number, pp.profile_id, pp.avatar_path, pp.nationality;

GRANT SELECT ON public.player_stats TO anon, authenticated;

DROP FUNCTION IF EXISTS public.search_players(text);

CREATE FUNCTION search_players(q text)
RETURNS TABLE (
  id           uuid,
  sheet_name   text,
  shirt_number integer,
  nationality  text,
  avatar_path  text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, sheet_name, shirt_number, nationality, avatar_path
  FROM players
  WHERE unaccent(sheet_name) ILIKE '%' || unaccent(q) || '%'
  ORDER BY sheet_name
  LIMIT 20;
$$;

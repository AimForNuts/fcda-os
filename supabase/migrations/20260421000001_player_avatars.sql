ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS avatar_path text,
  ADD COLUMN IF NOT EXISTS avatar_updated_at timestamptz;

INSERT INTO storage.buckets (id, name, public)
VALUES ('player-avatars', 'player-avatars', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

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
  END AS avatar_path
FROM public.players p;

GRANT SELECT ON public.players_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.player_stats AS
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
  ), 0) AS losses_comp
FROM public.players_public pp
LEFT JOIN public.game_players gp ON gp.player_id = pp.id
LEFT JOIN public.games g ON g.id = gp.game_id
GROUP BY pp.id, pp.display_name, pp.shirt_number, pp.profile_id, pp.avatar_path;

GRANT SELECT ON public.player_stats TO anon, authenticated;

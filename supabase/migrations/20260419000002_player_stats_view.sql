-- ============================================================
-- FCDA OS — Migration: Player Stats View
-- ============================================================

-- player_stats: computes per-player game statistics
-- Win = player's team score > opponent
-- Draw = equal scores
-- Loss = player's team score < opponent
-- Games with null scores are excluded
-- COALESCE returns 0 for players with no finished games

CREATE OR REPLACE VIEW public.player_stats AS
SELECT
  pp.id,
  pp.display_name,
  pp.shirt_number,
  pp.profile_id,
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
GROUP BY pp.id, pp.display_name, pp.shirt_number, pp.profile_id;

GRANT SELECT ON public.player_stats TO anon, authenticated;

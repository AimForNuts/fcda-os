ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS description text;

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
  END AS description
FROM public.players p;

GRANT SELECT ON public.players_public TO anon, authenticated;

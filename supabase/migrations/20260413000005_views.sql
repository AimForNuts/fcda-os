-- ============================================================
-- FCDA OS — Migration 005: Views
-- ============================================================

-- players_public: used by unauthenticated and pending-user queries.
-- Returns anonymised display_name for guests/pending; real sheet_name
-- for authenticated approved users.
-- is_approved() is SECURITY DEFINER so the profiles sub-select
-- succeeds even when called by the anon role.

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
  p.profile_id
FROM public.players p;

-- Grant select on the view to the anon and authenticated roles
GRANT SELECT ON public.players_public TO anon, authenticated;

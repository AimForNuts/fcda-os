-- ============================================================
-- FCDA OS — Migration 004: Row Level Security
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_aliases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log         ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ---- user_roles ----
CREATE POLICY "user_roles_select_authenticated" ON public.user_roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role('admin'));

CREATE POLICY "user_roles_delete_admin" ON public.user_roles
  FOR DELETE USING (public.has_role('admin'));

-- ---- players ----
-- Approved authenticated users can read players directly (with real names)
-- Unauthenticated / pending users must go through players_public view
CREATE POLICY "players_select_approved" ON public.players
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND public.is_approved()
  );

-- Mods and admins can insert players (needed for guest players in lineup)
CREATE POLICY "players_insert_mod" ON public.players
  FOR INSERT WITH CHECK (
    public.has_role('mod') OR public.has_role('admin')
  );

CREATE POLICY "players_update_mod" ON public.players
  FOR UPDATE USING (
    public.has_role('mod') OR public.has_role('admin')
  );

-- ---- player_aliases ----
CREATE POLICY "player_aliases_select_approved" ON public.player_aliases
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND public.is_approved()
  );

CREATE POLICY "player_aliases_insert_mod" ON public.player_aliases
  FOR INSERT WITH CHECK (
    public.has_role('mod') OR public.has_role('admin')
  );

CREATE POLICY "player_aliases_update_mod" ON public.player_aliases
  FOR UPDATE USING (
    public.has_role('mod') OR public.has_role('admin')
  );

CREATE POLICY "player_aliases_delete_admin" ON public.player_aliases
  FOR DELETE USING (public.has_role('admin'));

-- ---- games ----
CREATE POLICY "games_select_public" ON public.games
  FOR SELECT USING (true);

CREATE POLICY "games_insert_mod" ON public.games
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (public.has_role('mod') OR public.has_role('admin'))
  );

CREATE POLICY "games_update_mod" ON public.games
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (public.has_role('mod') OR public.has_role('admin'))
  );

CREATE POLICY "games_delete_mod" ON public.games
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (public.has_role('mod') OR public.has_role('admin'))
  );

-- ---- game_players ----
CREATE POLICY "game_players_select_public" ON public.game_players
  FOR SELECT USING (true);

CREATE POLICY "game_players_insert_mod" ON public.game_players
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (public.has_role('mod') OR public.has_role('admin'))
  );

CREATE POLICY "game_players_delete_mod" ON public.game_players
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (public.has_role('mod') OR public.has_role('admin'))
  );

-- ---- rating_submissions ----
CREATE POLICY "rating_submissions_select" ON public.rating_submissions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      submitted_by = auth.uid() OR public.has_role('admin')
    )
  );

CREATE POLICY "rating_submissions_insert_player" ON public.rating_submissions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_approved()
  );

CREATE POLICY "rating_submissions_update_admin" ON public.rating_submissions
  FOR UPDATE USING (public.has_role('admin'));

-- ---- rating_history ----
CREATE POLICY "rating_history_select_approved" ON public.rating_history
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND public.is_approved()
  );

-- No direct client inserts — only via service role in Route Handlers

-- ---- feedback ----
CREATE POLICY "feedback_select" ON public.feedback
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      submitted_by = auth.uid() OR public.has_role('admin')
    )
  );

CREATE POLICY "feedback_insert_player" ON public.feedback
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_approved()
  );

CREATE POLICY "feedback_update_admin" ON public.feedback
  FOR UPDATE USING (public.has_role('admin'));

-- ---- audit_log ----
CREATE POLICY "audit_log_select_admin" ON public.audit_log
  FOR SELECT USING (public.has_role('admin'));

-- No direct client inserts — only via service role

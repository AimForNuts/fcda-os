-- Match discussion comments

CREATE TABLE IF NOT EXISTS public.match_comments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id          uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  author_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content          text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 2000),
  mention_user_ids uuid[] NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS match_comments_game_created_idx
  ON public.match_comments (game_id, created_at);

CREATE INDEX IF NOT EXISTS match_comments_author_idx
  ON public.match_comments (author_id);

DROP TRIGGER IF EXISTS match_comments_updated_at ON public.match_comments;

CREATE TRIGGER match_comments_updated_at
  BEFORE UPDATE ON public.match_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.match_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_comments_select_authenticated" ON public.match_comments;

CREATE POLICY "match_comments_select_authenticated" ON public.match_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "match_comments_insert_authenticated" ON public.match_comments;

CREATE POLICY "match_comments_insert_authenticated" ON public.match_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS "match_comments_update_own" ON public.match_comments;

CREATE POLICY "match_comments_update_own" ON public.match_comments
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "match_comments_delete_own" ON public.match_comments;

CREATE POLICY "match_comments_delete_own" ON public.match_comments
  FOR DELETE USING (auth.uid() = author_id);

CREATE OR REPLACE FUNCTION public.get_match_comment_counts(p_game_ids uuid[])
RETURNS TABLE(game_id uuid, comment_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mc.game_id, count(*)::bigint AS comment_count
  FROM public.match_comments mc
  WHERE mc.game_id = ANY(p_game_ids)
  GROUP BY mc.game_id;
$$;

REVOKE ALL ON FUNCTION public.get_match_comment_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_match_comment_counts(uuid[]) TO anon, authenticated;

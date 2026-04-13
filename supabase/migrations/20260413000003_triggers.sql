-- ============================================================
-- FCDA OS — Migration 003: Triggers
-- ============================================================

-- update_updated_at: sets updated_at to now() before every UPDATE
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- handle_new_user: creates a profiles row when a new auth user is created
-- Reads display_name from user signup metadata; falls back to email prefix.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

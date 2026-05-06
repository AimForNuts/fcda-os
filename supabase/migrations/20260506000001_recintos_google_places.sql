-- ============================================================
-- FCDA OS — Recintos with Google Places metadata
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recintos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  google_place_id   text UNIQUE,
  formatted_address text,
  latitude          double precision,
  longitude         double precision,
  maps_url          text,
  last_used_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS recintos_name_normalized_key
  ON public.recintos (lower(btrim(name)));

CREATE INDEX IF NOT EXISTS recintos_last_used_at_idx
  ON public.recintos (last_used_at DESC NULLS LAST, updated_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recintos_updated_at ON public.recintos;

CREATE TRIGGER recintos_updated_at
  BEFORE UPDATE ON public.recintos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS recinto_id uuid REFERENCES public.recintos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS games_recinto_id_idx
  ON public.games (recinto_id);

WITH latest_locations AS (
  SELECT DISTINCT ON (lower(btrim(location)))
    location,
    created_at
  FROM public.games
  WHERE btrim(location) <> ''
  ORDER BY lower(btrim(location)), created_at DESC
)
INSERT INTO public.recintos (name, last_used_at)
SELECT location, created_at
FROM latest_locations
ON CONFLICT (lower(btrim(name))) DO UPDATE
SET last_used_at = GREATEST(
  COALESCE(public.recintos.last_used_at, '-infinity'::timestamptz),
  COALESCE(EXCLUDED.last_used_at, '-infinity'::timestamptz)
);

UPDATE public.games AS g
SET recinto_id = r.id
FROM public.recintos AS r
WHERE g.recinto_id IS NULL
  AND lower(btrim(g.location)) = lower(btrim(r.name));

ALTER TABLE public.recintos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recintos_select_public" ON public.recintos
  FOR SELECT USING (true);

CREATE POLICY "recintos_insert_mod" ON public.recintos
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (public.has_role('mod') OR public.has_role('admin'))
  );

CREATE POLICY "recintos_update_mod" ON public.recintos
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (public.has_role('mod') OR public.has_role('admin'))
  );

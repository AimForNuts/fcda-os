-- ============================================================
-- FCDA OS — Migration 002: Functions
-- SECURITY DEFINER functions bypass RLS for internal logic
-- ============================================================

-- has_role: check if the calling user has a given role
-- SECURITY DEFINER: runs as function owner, bypasses RLS on user_roles
-- This breaks the circular dependency: RLS policies call has_role,
-- which itself reads user_roles without being blocked by RLS.
CREATE OR REPLACE FUNCTION public.has_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = p_role
  )
$$;

-- is_approved: check if the calling user's account is approved
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT approved FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

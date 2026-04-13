-- ============================================================
-- FCDA OS — Migration 001: Schema
-- All table definitions (no RLS, no triggers, no functions)
-- ============================================================

-- profiles extends auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text NOT NULL,
  approved      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- user roles (many per user)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('player', 'mod', 'admin')),
  assigned_by uuid REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- football players (may not have an account)
CREATE TABLE IF NOT EXISTS public.players (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_name     text NOT NULL,
  shirt_number   int,
  current_rating numeric(4,2),
  profile_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- player aliases for WhatsApp name matching
CREATE TABLE IF NOT EXISTS public.player_aliases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  alias         text NOT NULL,   -- normalised: lowercase, diacritics stripped
  alias_display text NOT NULL,   -- original casing
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_aliases_alias_idx ON public.player_aliases (alias);

-- games / matches
CREATE TABLE IF NOT EXISTS public.games (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date             timestamptz NOT NULL,
  location         text NOT NULL,
  status           text NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'finished', 'cancelled')),
  counts_for_stats boolean NOT NULL DEFAULT true,
  score_a          int,
  score_b          int,
  created_by       uuid NOT NULL REFERENCES public.profiles(id),
  finished_by      uuid REFERENCES public.profiles(id),
  finished_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- players in a game
CREATE TABLE IF NOT EXISTS public.game_players (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id  uuid NOT NULL REFERENCES public.players(id),
  team       text CHECK (team IN ('a', 'b')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, player_id)
);

-- player ratings submitted after a game (pending admin review)
CREATE TABLE IF NOT EXISTS public.rating_submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id          uuid NOT NULL REFERENCES public.games(id),
  submitted_by     uuid NOT NULL REFERENCES public.profiles(id),
  rated_player_id  uuid NOT NULL REFERENCES public.players(id),
  rating           numeric(4,2) NOT NULL CHECK (rating >= 0 AND rating <= 10),
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by      uuid REFERENCES public.profiles(id),
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, submitted_by, rated_player_id)
);

-- append-only approved rating history
CREATE TABLE IF NOT EXISTS public.rating_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid NOT NULL REFERENCES public.players(id),
  rating          numeric(4,2) NOT NULL,
  previous_rating numeric(4,2),
  changed_by      uuid NOT NULL REFERENCES public.profiles(id),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- player feedback submissions
CREATE TABLE IF NOT EXISTS public.feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid NOT NULL REFERENCES public.profiles(id),
  content      text NOT NULL,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_by    uuid REFERENCES public.profiles(id),
  closed_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- immutable audit log for mod/admin actions
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action       text NOT NULL,
  performed_by uuid NOT NULL REFERENCES public.profiles(id),
  target_id    uuid,
  target_type  text,
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

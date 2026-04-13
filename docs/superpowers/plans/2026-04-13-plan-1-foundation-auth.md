# FCDA OS — Plan 1: Foundation + Auth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working Next.js 15 app with full auth flow — users can register, log in, and navigate to the pending screen. All database tables, RLS policies, and route guards are deployed and enforced.

**Architecture:** Next.js 15 App Router with Supabase SSR. Session is refreshed via middleware on every request. Route groups `(app)`, `(mod)`, `(admin)` enforce auth and role requirements at the layout level. The DB schema with RLS is deployed to Supabase via versioned SQL migration files.

**Tech Stack:** Next.js 15, TypeScript, Supabase (`@supabase/ssr`), Tailwind CSS, shadcn/ui, react-i18next, Vitest, Zod, react-hook-form

---

## File Map

| File | Purpose |
|------|---------|
| `package.json` | All dependencies |
| `tsconfig.json` | TypeScript config with `@/*` alias |
| `next.config.ts` | Next.js config |
| `vitest.config.ts` | Vitest config |
| `vitest.setup.ts` | Test globals |
| `.env.local.example` | Env var documentation |
| `types/database.ts` | Supabase table/view types |
| `types/index.ts` | App-level shared types |
| `supabase/migrations/20260413000001_schema.sql` | All table definitions |
| `supabase/migrations/20260413000002_functions.sql` | `has_role()` and helpers |
| `supabase/migrations/20260413000003_triggers.sql` | `handle_new_user`, `update_updated_at` |
| `supabase/migrations/20260413000004_rls.sql` | All RLS policies |
| `supabase/migrations/20260413000005_views.sql` | `players_public` view |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client (cookie-aware) |
| `lib/auth/permissions.ts` | `hasRole()`, `isApproved()`, `canAccessMod()`, `canAccessAdmin()` |
| `lib/utils.ts` | `cn()` Tailwind merge helper |
| `middleware.ts` | Session refresh + route protection |
| `i18n/config.ts` | i18n initialisation |
| `i18n/en/common.json` | English strings |
| `i18n/pt-PT/common.json` | Portuguese (PT) strings |
| `components/providers/I18nProvider.tsx` | Client-side i18n context |
| `components/providers/SupabaseProvider.tsx` | Supabase session context (added in Plan 3) |
| `components/layout/Navbar.tsx` | Top navigation (guest + authed states) |
| `app/globals.css` | Global styles + CSS variables |
| `app/layout.tsx` | Root layout (providers) |
| `app/(public)/layout.tsx` | Public layout wrapping Navbar |
| `app/(public)/page.tsx` | Placeholder home page |
| `app/(auth)/layout.tsx` | Auth pages wrapper |
| `app/(auth)/login/page.tsx` | Login form |
| `app/(auth)/register/page.tsx` | Registration form |
| `app/(auth)/pending/page.tsx` | Awaiting approval screen |
| `app/(app)/layout.tsx` | Guard: requires approved account |
| `app/(mod)/layout.tsx` | Guard: requires mod or admin role |
| `app/(admin)/layout.tsx` | Guard: requires admin role |
| `__tests__/lib/auth/permissions.test.ts` | Unit tests for pure permission helpers |

---

## Task 1: Scaffold Next.js 15 project

**Files:** Creates entire project scaffold

- [ ] **Step 1: Initialise project**

Run inside `c:/Users/josep/FCDA_OS` (the directory is otherwise empty — the `docs/` folder won't conflict):

```bash
cd c:/Users/josep/FCDA_OS
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

When prompted: accept all defaults. Do not select `src/` directory. Use `@/*` import alias.

- [ ] **Step 2: Verify the scaffold starts**

```bash
npm run dev
```

Expected: `Ready in Xms` and http://localhost:3000 shows the default Next.js page.

- [ ] **Step 3: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js 15 project"
```

---

## Task 2: Install additional dependencies

**Files:** `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install \
  @supabase/supabase-js \
  @supabase/ssr \
  react-i18next \
  i18next \
  i18next-browser-languagedetector \
  react-hook-form \
  @hookform/resolvers \
  zod \
  lucide-react \
  class-variance-authority \
  clsx \
  tailwind-merge
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D \
  vitest \
  @vitejs/plugin-react \
  @testing-library/react \
  @testing-library/jest-dom \
  jsdom \
  @types/node
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install project dependencies"
```

---

## Task 3: Configure TypeScript and Vitest

**Files:** `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`

- [ ] **Step 1: Update `tsconfig.json`**

Replace the contents of `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to `package.json`**

Open `package.json` and add to the `"scripts"` block:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Verify Vitest runs**

```bash
npm run test:run
```

Expected: `No test files found` (no tests yet). Exit code 0.

- [ ] **Step 6: Commit**

```bash
git add tsconfig.json vitest.config.ts vitest.setup.ts package.json
git commit -m "chore: configure TypeScript and Vitest"
```

---

## Task 4: Initialise shadcn/ui

**Files:** `components/ui/` (generated), `tailwind.config.ts`, `app/globals.css`

- [ ] **Step 1: Run shadcn init**

```bash
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

- [ ] **Step 2: Add required components**

```bash
npx shadcn@latest add button input label form card badge toast dropdown-menu separator avatar
```

- [ ] **Step 3: Verify components exist**

```bash
ls components/ui/
```

Expected: `button.tsx`, `input.tsx`, `label.tsx`, `form.tsx`, `card.tsx`, `badge.tsx`, `toast.tsx`, `dropdown-menu.tsx`, `separator.tsx`, `avatar.tsx`

- [ ] **Step 4: Commit**

```bash
git add components/ui/ tailwind.config.ts app/globals.css components.json
git commit -m "chore: initialise shadcn/ui with base components"
```

---

## Task 5: Environment variables

**Files:** `.env.local.example`, `.gitignore`

- [ ] **Step 1: Create `.env.local.example`**

```bash
# Supabase
# Find these in: Supabase Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Used only in server-side code and migrations
# Find in: Supabase Dashboard → Project Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 2: Verify `.gitignore` excludes `.env.local`**

Check that `.gitignore` contains `.env*.local`. If not, add it:

```
.env*.local
.env.local
```

- [ ] **Step 3: Create your local `.env.local`**

Copy `.env.local.example` to `.env.local` and fill in your Supabase project values from the Supabase Dashboard → Project Settings → API.

- [ ] **Step 4: Commit**

```bash
git add .env.local.example .gitignore
git commit -m "chore: add environment variable template"
```

---

## Task 6: Database types

**Files:** `types/database.ts`, `types/index.ts`

- [ ] **Step 1: Create `types/database.ts`**

```typescript
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          approved: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          approved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          approved?: boolean
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'player' | 'mod' | 'admin'
          assigned_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'player' | 'mod' | 'admin'
          assigned_by?: string | null
          created_at?: string
        }
        Update: never
      }
      players: {
        Row: {
          id: string
          sheet_name: string
          shirt_number: number | null
          current_rating: number | null
          profile_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sheet_name: string
          shirt_number?: number | null
          current_rating?: number | null
          profile_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          sheet_name?: string
          shirt_number?: number | null
          current_rating?: number | null
          profile_id?: string | null
          updated_at?: string
        }
      }
      player_aliases: {
        Row: {
          id: string
          player_id: string
          alias: string
          alias_display: string
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          alias: string
          alias_display: string
          created_at?: string
        }
        Update: never
      }
      games: {
        Row: {
          id: string
          date: string
          location: string
          status: 'scheduled' | 'finished' | 'cancelled'
          counts_for_stats: boolean
          score_a: number | null
          score_b: number | null
          created_by: string
          finished_by: string | null
          finished_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          location: string
          status?: 'scheduled' | 'finished' | 'cancelled'
          counts_for_stats?: boolean
          score_a?: number | null
          score_b?: number | null
          created_by: string
          finished_by?: string | null
          finished_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          date?: string
          location?: string
          status?: 'scheduled' | 'finished' | 'cancelled'
          counts_for_stats?: boolean
          score_a?: number | null
          score_b?: number | null
          finished_by?: string | null
          finished_at?: string | null
          updated_at?: string
        }
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          player_id: string
          team: 'a' | 'b' | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          team?: 'a' | 'b' | null
          created_at?: string
        }
        Update: never
      }
      rating_submissions: {
        Row: {
          id: string
          game_id: string
          submitted_by: string
          rated_player_id: string
          rating: number
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          submitted_by: string
          rated_player_id: string
          rating: number
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
      }
      rating_history: {
        Row: {
          id: string
          player_id: string
          rating: number
          previous_rating: number | null
          changed_by: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          rating: number
          previous_rating?: number | null
          changed_by: string
          notes?: string | null
          created_at?: string
        }
        Update: never
      }
      feedback: {
        Row: {
          id: string
          submitted_by: string
          content: string
          status: 'open' | 'closed'
          closed_by: string | null
          closed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          submitted_by: string
          content: string
          status?: 'open' | 'closed'
          closed_by?: string | null
          closed_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'open' | 'closed'
          closed_by?: string | null
          closed_at?: string | null
        }
      }
      audit_log: {
        Row: {
          id: string
          action: string
          performed_by: string
          target_id: string | null
          target_type: string | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          action: string
          performed_by: string
          target_id?: string | null
          target_type?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: never
      }
    }
    Views: {
      players_public: {
        Row: {
          id: string
          shirt_number: number | null
          display_name: string
          current_rating: number | null
          profile_id: string | null
        }
      }
    }
    Functions: {
      has_role: {
        Args: { p_role: string }
        Returns: boolean
      }
    }
  }
}
```

- [ ] **Step 2: Create `types/index.ts`**

```typescript
import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserRole = Database['public']['Tables']['user_roles']['Row']['role']
export type Player = Database['public']['Tables']['players']['Row']
export type PlayerAlias = Database['public']['Tables']['player_aliases']['Row']
export type Game = Database['public']['Tables']['games']['Row']
export type GamePlayer = Database['public']['Tables']['game_players']['Row']
export type RatingSubmission = Database['public']['Tables']['rating_submissions']['Row']
export type RatingHistory = Database['public']['Tables']['rating_history']['Row']
export type Feedback = Database['public']['Tables']['feedback']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']
export type PlayerPublic = Database['public']['Views']['players_public']['Row']

export type GameStatus = Game['status']
export type RatingSubmissionStatus = RatingSubmission['status']
export type FeedbackStatus = Feedback['status']

/** Resolved session context passed down to Server Components */
export type SessionContext = {
  userId: string
  profile: Profile
  roles: UserRole[]
}
```

- [ ] **Step 3: Commit**

```bash
git add types/
git commit -m "chore: add Supabase database types and app types"
```

---

## Task 7: Database migration — Schema

**Files:** `supabase/migrations/20260413000001_schema.sql`

- [ ] **Step 1: Create `supabase/migrations/20260413000001_schema.sql`**

```sql
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
```

- [ ] **Step 2: Apply the migration**

Open the **Supabase Dashboard → SQL Editor** for your project. Paste the entire contents of `20260413000001_schema.sql` and run it.

Expected: All tables created with no errors.

- [ ] **Step 3: Verify in dashboard**

Go to **Table Editor** → confirm these tables exist:
`profiles`, `user_roles`, `players`, `player_aliases`, `games`, `game_players`, `rating_submissions`, `rating_history`, `feedback`, `audit_log`

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat(db): add initial schema migration"
```

---

## Task 8: Database migration — Functions

**Files:** `supabase/migrations/20260413000002_functions.sql`

- [ ] **Step 1: Create `supabase/migrations/20260413000002_functions.sql`**

```sql
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
```

- [ ] **Step 2: Apply the migration**

In Supabase Dashboard → SQL Editor, run `20260413000002_functions.sql`.

Expected: Functions created with no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260413000002_functions.sql
git commit -m "feat(db): add has_role and is_approved functions"
```

---

## Task 9: Database migration — Triggers

**Files:** `supabase/migrations/20260413000003_triggers.sql`

- [ ] **Step 1: Create `supabase/migrations/20260413000003_triggers.sql`**

```sql
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
```

- [ ] **Step 2: Apply the migration**

In Supabase Dashboard → SQL Editor, run `20260413000003_triggers.sql`.

Expected: Triggers created with no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260413000003_triggers.sql
git commit -m "feat(db): add updated_at and new user triggers"
```

---

## Task 10: Database migration — RLS Policies

**Files:** `supabase/migrations/20260413000004_rls.sql`

- [ ] **Step 1: Create `supabase/migrations/20260413000004_rls.sql`**

```sql
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
-- Authenticated users can read any profile
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ---- user_roles ----
-- Authenticated users can read roles (needed for role checks in UI)
CREATE POLICY "user_roles_select_authenticated" ON public.user_roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can insert roles
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role('admin'));

-- Only admins can delete roles
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

-- Mods and admins can update players
CREATE POLICY "players_update_mod" ON public.players
  FOR UPDATE USING (
    public.has_role('mod') OR public.has_role('admin')
  );

-- ---- player_aliases ----
-- Approved authenticated users can read aliases
CREATE POLICY "player_aliases_select_approved" ON public.player_aliases
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND public.is_approved()
  );

-- Mods and admins can manage aliases
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
-- Anyone (including guests) can read games
CREATE POLICY "games_select_public" ON public.games
  FOR SELECT USING (true);

-- Mods and admins can create, update, delete games
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
-- Anyone can read game rosters (names shown conditionally in app layer)
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
-- Players can only read their own submissions; admins can read all
CREATE POLICY "rating_submissions_select" ON public.rating_submissions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      submitted_by = auth.uid() OR public.has_role('admin')
    )
  );

-- Approved players can submit ratings
CREATE POLICY "rating_submissions_insert_player" ON public.rating_submissions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_approved()
  );

-- Admins can update (approve/reject) submissions
CREATE POLICY "rating_submissions_update_admin" ON public.rating_submissions
  FOR UPDATE USING (public.has_role('admin'));

-- ---- rating_history ----
-- Approved authenticated users can read rating history
CREATE POLICY "rating_history_select_approved" ON public.rating_history
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND public.is_approved()
  );

-- Only service role can insert (application logic via API route with service client)
-- No direct client inserts allowed

-- ---- feedback ----
-- Players can only see their own feedback; admins see all
CREATE POLICY "feedback_select" ON public.feedback
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      submitted_by = auth.uid() OR public.has_role('admin')
    )
  );

-- Approved players can submit feedback
CREATE POLICY "feedback_insert_player" ON public.feedback
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_approved()
  );

-- Admins can update (close) feedback
CREATE POLICY "feedback_update_admin" ON public.feedback
  FOR UPDATE USING (public.has_role('admin'));

-- ---- audit_log ----
-- Only admins can read the audit log
CREATE POLICY "audit_log_select_admin" ON public.audit_log
  FOR SELECT USING (public.has_role('admin'));

-- Only service role can insert audit log entries (no client insert policy)
```

- [ ] **Step 2: Apply the migration**

In Supabase Dashboard → SQL Editor, run `20260413000004_rls.sql`.

Expected: All policies created with no errors.

- [ ] **Step 3: Verify RLS is enabled**

In Supabase Dashboard → Table Editor → click any table → "RLS enabled" indicator should show.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260413000004_rls.sql
git commit -m "feat(db): add RLS policies for all tables"
```

---

## Task 11: Database migration — Views

**Files:** `supabase/migrations/20260413000005_views.sql`

- [ ] **Step 1: Create `supabase/migrations/20260413000005_views.sql`**

```sql
-- ============================================================
-- FCDA OS — Migration 005: Views
-- ============================================================

-- players_public: used by unauthenticated and pending-user queries.
-- Returns anonymised display_name for guests; real sheet_name for
-- authenticated approved users.
-- SECURITY DEFINER on the function wrapper ensures the profiles
-- sub-select succeeds even when called by the anon role.

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
```

- [ ] **Step 2: Apply the migration**

In Supabase Dashboard → SQL Editor, run `20260413000005_views.sql`.

Expected: View created, grants applied.

- [ ] **Step 3: Verify the first admin bootstrap note**

> **Important — first admin user:**
> When you first deploy, no user has the `admin` role. After your own account is registered and you see the pending screen, go to Supabase Dashboard → SQL Editor and run:
>
> ```sql
> -- Replace with your actual user UUID from auth.users
> UPDATE public.profiles SET approved = true WHERE id = 'your-user-uuid';
>
> INSERT INTO public.user_roles (user_id, role)
> VALUES ('your-user-uuid', 'admin'),
>        ('your-user-uuid', 'mod'),
>        ('your-user-uuid', 'player');
> ```
>
> After this, your account has full access and you can approve/assign roles to others through the UI.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260413000005_views.sql
git commit -m "feat(db): add players_public view"
```

---

## Task 12: Supabase client helpers

**Files:** `lib/supabase/client.ts`, `lib/supabase/server.ts`

- [ ] **Step 1: Create `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create `lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Server-side Supabase client. Uses the calling user's session from cookies.
 * Use this in Server Components and Route Handlers.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component — cookies can't be set.
            // The middleware handles session refresh instead.
          }
        },
      },
    }
  )
}

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 * Use ONLY in Route Handlers for privileged operations (e.g. inserting audit_log).
 * Never expose to the browser.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/
git commit -m "feat: add Supabase browser and server clients"
```

---

## Task 13: Permissions helpers + unit tests

**Files:** `lib/auth/permissions.ts`, `__tests__/lib/auth/permissions.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `__tests__/lib/auth/permissions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { canAccessMod, canAccessAdmin, unionPermissions } from '@/lib/auth/permissions'
import type { UserRole } from '@/types'

describe('canAccessMod', () => {
  it('returns true for mod role', () => {
    expect(canAccessMod(['mod'])).toBe(true)
  })

  it('returns true for admin role', () => {
    expect(canAccessMod(['admin'])).toBe(true)
  })

  it('returns true for both mod and admin', () => {
    expect(canAccessMod(['mod', 'admin'])).toBe(true)
  })

  it('returns true for player + mod combination', () => {
    expect(canAccessMod(['player', 'mod'])).toBe(true)
  })

  it('returns false for player role only', () => {
    expect(canAccessMod(['player'])).toBe(false)
  })

  it('returns false for empty roles', () => {
    expect(canAccessMod([])).toBe(false)
  })
})

describe('canAccessAdmin', () => {
  it('returns true for admin role', () => {
    expect(canAccessAdmin(['admin'])).toBe(true)
  })

  it('returns true for admin + other roles', () => {
    expect(canAccessAdmin(['player', 'mod', 'admin'])).toBe(true)
  })

  it('returns false for mod role only', () => {
    expect(canAccessAdmin(['mod'])).toBe(false)
  })

  it('returns false for player role only', () => {
    expect(canAccessAdmin(['player'])).toBe(false)
  })

  it('returns false for empty roles', () => {
    expect(canAccessAdmin([])).toBe(false)
  })
})

describe('unionPermissions', () => {
  it('returns highest permission level for multiple roles', () => {
    const perms = unionPermissions(['player', 'mod'])
    expect(perms.canRead).toBe(true)
    expect(perms.canManageGames).toBe(true)
    expect(perms.canManageUsers).toBe(false)
  })

  it('returns all permissions for admin', () => {
    const perms = unionPermissions(['admin'])
    expect(perms.canRead).toBe(true)
    expect(perms.canManageGames).toBe(true)
    expect(perms.canManageUsers).toBe(true)
  })

  it('returns read-only for player', () => {
    const perms = unionPermissions(['player'])
    expect(perms.canRead).toBe(true)
    expect(perms.canManageGames).toBe(false)
    expect(perms.canManageUsers).toBe(false)
  })

  it('returns no permissions for empty roles', () => {
    const perms = unionPermissions([])
    expect(perms.canRead).toBe(false)
    expect(perms.canManageGames).toBe(false)
    expect(perms.canManageUsers).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- __tests__/lib/auth/permissions.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/auth/permissions'`

- [ ] **Step 3: Create `lib/auth/permissions.ts`**

```typescript
import type { UserRole } from '@/types'

/** Returns true if the role list grants mod-level access (mod or admin). */
export function canAccessMod(roles: UserRole[]): boolean {
  return roles.includes('mod') || roles.includes('admin')
}

/** Returns true if the role list grants admin-level access. */
export function canAccessAdmin(roles: UserRole[]): boolean {
  return roles.includes('admin')
}

export type Permissions = {
  canRead: boolean
  canManageGames: boolean
  canManageUsers: boolean
  canSubmitRatings: boolean
  canSubmitFeedback: boolean
}

/** Derives the union of all permissions for a given role list. */
export function unionPermissions(roles: UserRole[]): Permissions {
  const isPlayer = roles.includes('player') || roles.includes('mod') || roles.includes('admin')
  const isMod = canAccessMod(roles)
  const isAdmin = canAccessAdmin(roles)

  return {
    canRead: isPlayer,
    canManageGames: isMod,
    canManageUsers: isAdmin,
    canSubmitRatings: isPlayer,
    canSubmitFeedback: isPlayer,
  }
}

/**
 * Server-side: fetch the calling user's roles from Supabase.
 * Use in Server Components and Route Handlers.
 */
export async function fetchUserRoles(userId: string): Promise<UserRole[]> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
  return (data?.map((r) => r.role as UserRole)) ?? []
}

/**
 * Server-side: fetch the calling user's profile and check approval.
 * Returns null if no session or profile not found.
 */
export async function fetchSessionContext() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const roles = await fetchUserRoles(user.id)

  return { userId: user.id, profile, roles }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- __tests__/lib/auth/permissions.test.ts
```

Expected: All 15 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/permissions.ts __tests__/
git commit -m "feat: add permissions helpers with unit tests"
```

---

## Task 14: Utility helper

**Files:** `lib/utils.ts`

- [ ] **Step 1: Create `lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merges Tailwind classes safely, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/utils.ts
git commit -m "feat: add cn() Tailwind utility"
```

---

## Task 15: i18n setup

**Files:** `i18n/config.ts`, `i18n/en/common.json`, `i18n/pt-PT/common.json`, `components/providers/I18nProvider.tsx`

- [ ] **Step 1: Create `i18n/en/common.json`**

```json
{
  "nav": {
    "home": "Home",
    "matches": "Matches",
    "stats": "Stats",
    "profile": "Profile",
    "login": "Login",
    "register": "Register",
    "logout": "Logout",
    "admin": "Admin",
    "mod": "Manage"
  },
  "auth": {
    "login": "Sign In",
    "register": "Create Account",
    "email": "Email",
    "password": "Password",
    "displayName": "Full Name",
    "loginSubmit": "Sign In",
    "registerSubmit": "Create Account",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?",
    "pending": {
      "title": "Account Pending Approval",
      "description": "Your account is awaiting admin approval. You'll have full access once approved.",
      "publicNote": "You can still browse the public site while you wait."
    },
    "errors": {
      "invalidCredentials": "Invalid email or password.",
      "emailInUse": "An account with this email already exists.",
      "weakPassword": "Password must be at least 8 characters."
    }
  },
  "common": {
    "loading": "Loading...",
    "error": "Something went wrong.",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm",
    "back": "Back"
  }
}
```

- [ ] **Step 2: Create `i18n/pt-PT/common.json`**

```json
{
  "nav": {
    "home": "Início",
    "matches": "Jogos",
    "stats": "Estatísticas",
    "profile": "Perfil",
    "login": "Entrar",
    "register": "Registar",
    "logout": "Sair",
    "admin": "Administração",
    "mod": "Gerir"
  },
  "auth": {
    "login": "Entrar",
    "register": "Criar Conta",
    "email": "Email",
    "password": "Password",
    "displayName": "Nome Completo",
    "loginSubmit": "Entrar",
    "registerSubmit": "Criar Conta",
    "noAccount": "Não tens conta?",
    "hasAccount": "Já tens conta?",
    "pending": {
      "title": "Conta Pendente de Aprovação",
      "description": "A tua conta está à espera de aprovação pelo administrador. Terás acesso completo assim que for aprovada.",
      "publicNote": "Podes continuar a ver o site público enquanto esperas."
    },
    "errors": {
      "invalidCredentials": "Email ou password inválidos.",
      "emailInUse": "Já existe uma conta com este email.",
      "weakPassword": "A password deve ter pelo menos 8 caracteres."
    }
  },
  "common": {
    "loading": "A carregar...",
    "error": "Ocorreu um erro.",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "confirm": "Confirmar",
    "back": "Voltar"
  }
}
```

- [ ] **Step 3: Create `i18n/config.ts`**

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from './en/common.json'
import ptPTCommon from './pt-PT/common.json'

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
      defaultNS: 'common',
      resources: {
        en: { common: enCommon },
        'pt-PT': { common: ptPTCommon },
      },
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'fcda_language',
      },
    })
}

export default i18n
```

- [ ] **Step 4: Create `components/providers/I18nProvider.tsx`**

```tsx
'use client'

import { type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n/config'

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
```

- [ ] **Step 5: Commit**

```bash
git add i18n/ components/providers/I18nProvider.tsx
git commit -m "feat: add i18n setup with EN and PT-PT locales"
```

---

## Task 16: Middleware

**Files:** `middleware.ts`

- [ ] **Step 1: Create `middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Refresh the session on every request (required by @supabase/ssr)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: do not call supabase.auth.getSession() here — it reads from
  // cookies which can be spoofed. Always use getUser() which validates the token.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isAppRoute =
    pathname.startsWith('/profile') || pathname.startsWith('/feedback')
  const isModRoute = pathname.startsWith('/mod')
  const isAdminRoute = pathname.startsWith('/admin')
  const isProtected = isAppRoute || isModRoute || isAdminRoute

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  if (user && isProtected) {
    // Check approval status
    const { data: profile } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', user.id)
      .single()

    if (!profile?.approved) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/pending'
      return NextResponse.redirect(url)
    }

    // Check role for mod/admin routes
    if (isModRoute || isAdminRoute) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      const userRoles = roles?.map((r) => r.role) ?? []
      const hasAccess = isAdminRoute
        ? userRoles.includes('admin')
        : userRoles.includes('mod') || userRoles.includes('admin')

      if (!hasAccess) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add session middleware with route protection"
```

---

## Task 17: Navbar component

**Files:** `components/layout/Navbar.tsx`

- [ ] **Step 1: Create `components/layout/Navbar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Globe, ShieldCheck, Settings } from 'lucide-react'
import type { Profile, UserRole } from '@/types'
import i18n from '@/i18n/config'

type NavbarProps = {
  profile: Profile | null
  roles: UserRole[]
}

export function Navbar({ profile, roles }: NavbarProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const supabase = createClient()

  const isMod = roles.includes('mod') || roles.includes('admin')
  const isAdmin = roles.includes('admin')

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function toggleLanguage() {
    const next = i18n.language === 'en' ? 'pt-PT' : 'en'
    i18n.changeLanguage(next)
  }

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : '?'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-green-600">FCDA</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/matches" className="text-muted-foreground hover:text-foreground transition-colors">
            {t('nav.matches')}
          </Link>
          <Link href="/stats" className="text-muted-foreground hover:text-foreground transition-colors">
            {t('nav.stats')}
          </Link>
          {isMod && (
            <Link href="/mod/games/new" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="h-3.5 w-3.5" />
              {t('nav.mod')}
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin/users" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t('nav.admin')}
            </Link>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="h-8 w-8 p-0"
            aria-label="Toggle language"
          >
            <Globe className="h-4 w-4" />
          </Button>

          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-green-600 text-white text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile.display_name}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">{t('nav.profile')}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">{t('nav.login')}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/register">{t('nav.register')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/Navbar.tsx
git commit -m "feat: add Navbar component with auth and role-based links"
```

---

## Task 18: Root layout and globals

**Files:** `app/globals.css`, `app/layout.tsx`

- [ ] **Step 1: Update `app/globals.css`**

Replace the entire file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 142.1 76.2% 36.3%;
    --primary-foreground: 355.7 100% 97.3%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 142.1 76.2% 36.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 142.1 70.6% 45.3%;
    --primary-foreground: 144.9 80.4% 10%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 142.4 71.8% 29.2%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 2: Create `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { I18nProvider } from '@/components/providers/I18nProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FCDA — Futebol Clube Dragões da Areosa',
  description: 'O site oficial do Futebol Clube Dragões da Areosa.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add root layout with i18n provider and FCDA theme"
```

---

## Task 19: Public layout and placeholder home page

**Files:** `app/(public)/layout.tsx`, `app/(public)/page.tsx`

- [ ] **Step 1: Create `app/(public)/layout.tsx`**

```tsx
import { Navbar } from '@/components/layout/Navbar'
import { fetchSessionContext } from '@/lib/auth/permissions'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await fetchSessionContext()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        profile={session?.profile ?? null}
        roles={session?.roles ?? []}
      />
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(public)/page.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function HomePage() {
  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-12">
      <div className="flex flex-col items-center text-center gap-6">
        <Badge variant="outline" className="text-green-600 border-green-600">
          Futebol Clube Dragões da Areosa
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          Bem-vindos ao{' '}
          <span className="text-green-600">FCDA</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Acompanha os jogos, vê as estatísticas e gere a equipa.
        </p>

        <Card className="w-full max-w-md mt-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximo Jogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Sem jogos agendados de momento.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(public\)/
git commit -m "feat: add public layout and placeholder home page"
```

---

## Task 20: Auth layout

**Files:** `app/(auth)/layout.tsx`

- [ ] **Step 1: Create `app/(auth)/layout.tsx`**

```tsx
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <Link href="/" className="mb-8 text-2xl font-bold">
        <span className="text-green-600">FCDA</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(auth\)/layout.tsx
git commit -m "feat: add auth layout"
```

---

## Task 21: Login page

**Files:** `app/(auth)/login/page.tsx`

- [ ] **Step 1: Create `app/(auth)/login/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/profile'
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setServerError(t('auth.errors.invalidCredentials'))
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.login')}</CardTitle>
        <CardDescription>FCDA — Futebol Clube Dragões da Areosa</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : t('auth.loginSubmit')}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            {t('auth.noAccount')}{' '}
            <Link href="/auth/register" className="underline">
              {t('auth.register')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(auth\)/login/
git commit -m "feat: add login page"
```

---

## Task 22: Register page

**Files:** `app/(auth)/register/page.tsx`

- [ ] **Step 1: Create `app/(auth)/register/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { display_name: data.displayName },
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        setServerError(t('auth.errors.emailInUse'))
      } else {
        setServerError(error.message)
      }
      return
    }

    // Redirect to pending — the trigger creates the profile with approved=false
    router.push('/auth/pending')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.register')}</CardTitle>
        <CardDescription>FCDA — Futebol Clube Dragões da Areosa</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="displayName">{t('auth.displayName')}</Label>
            <Input
              id="displayName"
              type="text"
              autoComplete="name"
              {...register('displayName')}
            />
            {errors.displayName && (
              <p className="text-xs text-destructive">{errors.displayName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : t('auth.registerSubmit')}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            {t('auth.hasAccount')}{' '}
            <Link href="/auth/login" className="underline">
              {t('auth.login')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(auth\)/register/
git commit -m "feat: add register page"
```

---

## Task 23: Pending approval page

**Files:** `app/(auth)/pending/page.tsx`

- [ ] **Step 1: Create `app/(auth)/pending/page.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

export default function PendingPage() {
  const { t } = useTranslation()

  return (
    <Card className="text-center">
      <CardHeader>
        <div className="flex justify-center mb-2">
          <Clock className="h-12 w-12 text-muted-foreground" />
        </div>
        <CardTitle>{t('auth.pending.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {t('auth.pending.description')}
        </p>
        <p className="text-muted-foreground text-xs">
          {t('auth.pending.publicNote')}
        </p>
        <Button variant="outline" asChild>
          <Link href="/">{t('nav.home')}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(auth\)/pending/
git commit -m "feat: add pending approval page"
```

---

## Task 24: Protected route group layouts

**Files:** `app/(app)/layout.tsx`, `app/(mod)/layout.tsx`, `app/(admin)/layout.tsx`

- [ ] **Step 1: Create `app/(app)/layout.tsx`**

Requires: authenticated + approved. The middleware already redirects if not; this layout provides the Navbar for authenticated pages.

```tsx
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { fetchSessionContext } from '@/lib/auth/permissions'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await fetchSessionContext()

  if (!session) {
    redirect('/auth/login')
  }

  if (!session.profile.approved) {
    redirect('/auth/pending')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={session.profile} roles={session.roles} />
      <main className="flex-1 container max-w-screen-xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(mod)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'

export default async function ModLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await fetchSessionContext()

  if (!session || !session.profile.approved) {
    redirect('/auth/login')
  }

  if (!canAccessMod(session.roles)) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={session.profile} roles={session.roles} />
      <main className="flex-1 container max-w-screen-xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(admin)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await fetchSessionContext()

  if (!session || !session.profile.approved) {
    redirect('/auth/login')
  }

  if (!canAccessAdmin(session.roles)) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={session.profile} roles={session.roles} />
      <main className="flex-1 container max-w-screen-xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/ app/\(mod\)/ app/\(admin\)/
git commit -m "feat: add protected route group layouts with role guards"
```

---

## Task 25: Smoke test the auth flow

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test guest access**

Open http://localhost:3000 — should see the FCDA home page with Login and Register buttons. No errors in console.

- [ ] **Step 3: Test registration**

Navigate to http://localhost:3000/auth/register. Fill in name, email, password. Submit. Should redirect to `/auth/pending`.

- [ ] **Step 4: Verify profile was created**

In Supabase Dashboard → Table Editor → `profiles` — the new row should exist with `approved = false`.

- [ ] **Step 5: Test protected route redirect**

While logged in as the pending user, navigate to http://localhost:3000/profile. Should redirect to `/auth/pending`.

- [ ] **Step 6: Bootstrap the first admin**

In Supabase Dashboard → SQL Editor, run (replace UUID with your user's ID from the `profiles` table):

```sql
UPDATE public.profiles SET approved = true WHERE id = 'your-user-uuid';

INSERT INTO public.user_roles (user_id, role) VALUES
  ('your-user-uuid', 'admin'),
  ('your-user-uuid', 'mod'),
  ('your-user-uuid', 'player');
```

- [ ] **Step 7: Verify admin access**

Log out and log back in. Navigate to http://localhost:3000 — Navbar should show Admin and Manage links.

- [ ] **Step 8: Run all tests**

```bash
npm run test:run
```

Expected: All tests PASS.

- [ ] **Step 9: Final commit**

```bash
git add .
git commit -m "feat: plan 1 complete — foundation and auth flow working"
```

---

## Plan 1 Complete

After all tasks pass, the app has:
- ✅ Next.js 15 App Router project scaffolded
- ✅ All DB tables, functions, triggers, RLS, and views deployed
- ✅ Supabase SSR clients configured
- ✅ Middleware refreshing sessions and protecting routes
- ✅ Register → pending approval flow working
- ✅ First admin bootstrapped via SQL
- ✅ Role-based layout guards for mod and admin routes
- ✅ i18n with EN and PT-PT
- ✅ Unit tests for permissions helpers passing

**Next:** Plan 2 — Public Experience (home with next match, match list, anonymised stats page)

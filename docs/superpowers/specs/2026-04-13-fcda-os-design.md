# FCDA OS — Design Spec

**Project:** Futebol Clube Dragões da Areosa (FCDA)
**Date:** 2026-04-13
**Status:** Approved

---

## 1. Overview

A production-ready web application for FCDA members to view upcoming matches, browse player statistics, and manage game operations. Guests see anonymised content; approved members see full data. Mods manage games; admins moderate users and ratings.

---

## 2. Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR on public pages guarantees player names never reach guests; native Vercel integration |
| Language | TypeScript | Type safety across full stack |
| Auth | Supabase Auth | Native `auth.uid()` integration with RLS; handles email/password, approval flow, and JWT claims |
| Database | Supabase (PostgreSQL + RLS) | Managed Postgres, PostgREST, built-in auth integration |
| UI | Tailwind CSS + shadcn/ui | Clean, composable, mobile-first |
| i18n | react-i18next | EN default, PT-PT switchable |
| Hosting | Vercel | Zero-config Next.js deployment |
| Repo | GitHub | CI/CD via Vercel GitHub integration |

**Why not Better Auth:** Better Auth requires owning the JWT flow end-to-end. Supabase RLS is built around `auth.uid()` and `auth.jwt()` from Supabase Auth. Using Better Auth would require a custom JWT bridge layer — unnecessary complexity with no benefit here.

**Rendering strategy:**
- Public routes → Server Components. Player names fetched server-side only when a valid approved session exists. Guests receive HTML that never contained names.
- Authenticated routes → Server or Client Components behind auth guards in route group layouts.
- Mutations → Next.js Route Handlers (`app/api/...`), always authenticated and role-checked server-side before any DB call.

---

## 3. User Roles & Approval

### Approval States

| State | Description | Access level |
|---|---|---|
| `pending` | Registered, not yet approved | Identical to guest — anonymised public content only |
| `approved` | Admin has approved the account | Full access per roles |

### Roles (additive, a user can hold multiple)

| Role | Permissions |
|---|---|
| `player` | Read all data with names; submit ratings; submit feedback |
| `mod` | All player permissions + create/edit/delete/finish games; manage game lineups |
| `admin` | All player + mod permissions + approve users; manage roles; view/close feedback; review rating submissions |

### Access Matrix

| Capability | Guest | Pending | Player | Mod | Admin |
|---|---|---|---|---|---|
| View next match | ✓ | ✓ | ✓ | ✓ | ✓ |
| View stats (no names) | ✓ | ✓ | — | — | — |
| View stats (with names) | — | — | ✓ | ✓ | ✓ |
| Own profile + stats | — | — | ✓ | ✓ | ✓ |
| Change password/email | — | — | ✓ | ✓ | ✓ |
| Submit rating | — | — | ✓ | ✓ | ✓ |
| Submit feedback | — | — | ✓ | ✓ | ✓ |
| Create/edit/finish game | — | — | — | ✓ | ✓ |
| Approve users / manage roles | — | — | — | — | ✓ |
| View & close feedback | — | — | — | — | ✓ |
| Review rating submissions | — | — | — | — | ✓ |

---

## 4. Database Schema

### profiles
Extends `auth.users`. Created automatically via DB trigger on user registration.

```sql
id              uuid PRIMARY KEY REFERENCES auth.users
display_name    text NOT NULL
approved        boolean DEFAULT false
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### user_roles
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid NOT NULL REFERENCES profiles(id)
role            text NOT NULL CHECK (role IN ('player', 'mod', 'admin'))
assigned_by     uuid REFERENCES profiles(id)
created_at      timestamptz DEFAULT now()
UNIQUE (user_id, role)
```

### players
Represents a football player. May or may not have an FCDA OS account.

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
sheet_name      text NOT NULL        -- canonical name for stat sheets
shirt_number    int
current_rating  numeric(4,2)         -- denormalised latest approved rating
profile_id      uuid REFERENCES profiles(id) NULLABLE  -- null = guest/unregistered
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### player_aliases
Alias strings used for WhatsApp lineup parsing. Stored normalised (lowercase, no diacritics) for matching; original casing stored separately for display.

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
player_id       uuid NOT NULL REFERENCES players(id)
alias           text NOT NULL   -- normalised: lowercase, NFD stripped
alias_display   text NOT NULL   -- original casing
created_at      timestamptz DEFAULT now()

INDEX ON player_aliases (alias)
-- No UNIQUE constraint: duplicates are allowed to exist, flagged at parse time
```

### games
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
date              timestamptz NOT NULL
location          text NOT NULL
status            text NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'finished', 'cancelled'))
counts_for_stats  boolean NOT NULL DEFAULT true
score_a           int          -- set when finished
score_b           int          -- set when finished
created_by        uuid NOT NULL REFERENCES profiles(id)
finished_by       uuid REFERENCES profiles(id)
finished_at       timestamptz
created_at        timestamptz DEFAULT now()
updated_at        timestamptz DEFAULT now()
```

### game_players
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
game_id         uuid NOT NULL REFERENCES games(id)
player_id       uuid NOT NULL REFERENCES players(id)
team            text CHECK (team IN ('a', 'b'))   -- nullable, optional assignment
created_at      timestamptz DEFAULT now()
UNIQUE (game_id, player_id)
```

### rating_submissions
Players submit 0–10 ratings for teammates after a game. Admins review and approve/reject each item.

**Constraints:**
- A player can only submit ratings for a game they participated in (`game_players` membership check in the API handler)
- A player cannot rate themselves (`submitted_by` profile must differ from the `rated_player_id`'s `profile_id`)
- Ratings are only accepted while `games.status = 'finished'` and `games.counts_for_stats = true`

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
game_id         uuid NOT NULL REFERENCES games(id)
submitted_by    uuid NOT NULL REFERENCES profiles(id)
rated_player_id uuid NOT NULL REFERENCES players(id)
rating          numeric(4,2) NOT NULL CHECK (rating >= 0 AND rating <= 10)
status          text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected'))
reviewed_by     uuid REFERENCES profiles(id)
reviewed_at     timestamptz
created_at      timestamptz DEFAULT now()
UNIQUE (game_id, submitted_by, rated_player_id)
```

### rating_history
Append-only log of approved rating changes. Updated when admin approves a rating submission.

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
player_id       uuid NOT NULL REFERENCES players(id)
rating          numeric(4,2) NOT NULL
previous_rating numeric(4,2)
changed_by      uuid NOT NULL REFERENCES profiles(id)
notes           text
created_at      timestamptz DEFAULT now()
```

### feedback
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
submitted_by    uuid NOT NULL REFERENCES profiles(id)
content         text NOT NULL
status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
closed_by       uuid REFERENCES profiles(id)
closed_at       timestamptz
created_at      timestamptz DEFAULT now()
```

### audit_log
Immutable record of all mod/admin actions. Insert-only via service role.

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
action          text NOT NULL   -- e.g. 'game.created', 'user.approved', 'rating.approved'
performed_by    uuid NOT NULL REFERENCES profiles(id)
target_id       uuid            -- the affected record's id
target_type     text            -- e.g. 'game', 'user', 'player'
metadata        jsonb           -- extra context (old values, new values, etc.)
created_at      timestamptz DEFAULT now()
```

### players_public (view)
Used by unauthenticated queries. Replaces `sheet_name` with an anonymised label.
Must be `SECURITY DEFINER` so the `profiles` sub-select executes as the view owner (bypassing anon-user RLS on `profiles`) while still using `auth.uid()` from the calling session's JWT.

```sql
CREATE OR REPLACE VIEW players_public
WITH (security_invoker = false) AS   -- SECURITY DEFINER behaviour
SELECT
  id,
  shirt_number,
  CASE WHEN auth.uid() IS NOT NULL AND (
    SELECT approved FROM profiles WHERE id = auth.uid()
  ) THEN sheet_name
  ELSE 'Jogador ' || COALESCE(shirt_number::text, '?')
  END AS display_name,
  current_rating,
  profile_id
FROM players;
```

### RLS Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Authenticated users only | Via trigger only | Own row only | No |
| `user_roles` | Authenticated only | Admin only | No | Admin only |
| `players` | Service role / via view | Admin only | Admin only | No |
| `player_aliases` | Authenticated only | Mod + Admin | Mod + Admin | Admin only |
| `games` | All (public) | Mod + Admin | Mod + Admin | Mod + Admin |
| `game_players` | All (public) | Mod + Admin | Mod + Admin | Mod + Admin |
| `rating_submissions` | Own rows (player); all (admin) | Approved players | No | No |
| `rating_history` | Authenticated only | Service role only | No | No |
| `feedback` | Own rows (player); all (admin) | Approved players | Admin (close) | No |
| `audit_log` | Admin only | Service role only | No | No |

---

## 5. WhatsApp Lineup Parsing Flow

### Input format
```
Domingo 11:00h
Arca de água 7v7 outdoor
@Player A
@Player B
@João Silva
```

### Parser steps (`lib/whatsapp/parser.ts`)

1. Split by newline, keep lines starting with `@`
2. Strip `@`, trim whitespace → `raw_name[]`
3. Normalise each: lowercase + NFD diacritic stripping → `normalised_name`
4. Query `player_aliases` WHERE `alias = normalised_name`

### Match outcomes

| Result | UI state | Mod action required |
|---|---|---|
| Exactly one player matched | Green chip | None |
| Multiple players matched (duplicate alias) | Amber chip | Mod picks the correct player |
| No match found | Red chip | Mod links to existing player OR adds as guest |

### Alias conflict on save
When a mod saves a new alias, the system checks for existing players with that alias. If found, an inline warning is shown. The mod can proceed (creates a duplicate, flagged at next parse) or cancel.

### Guest players
Players with no DB account get a new `players` row with `profile_id = null`. They accumulate stats normally. If they later register, an admin can link their `players` record to their `profiles` record.

---

## 6. Page Map

### Public (Guest + Pending)
| Route | Page |
|---|---|
| `/` | Home — club name, next match card |
| `/matches` | All matches list |
| `/matches/[id]` | Match detail (anonymised) |
| `/stats` | Stats table (anonymised) |
| `/auth/login` | Login |
| `/auth/register` | Register |
| `/auth/pending` | Awaiting approval message |

### Authenticated (Approved, all roles)
| Route | Page |
|---|---|
| `/matches/[id]` | Match detail with real names |
| `/stats` | Stats table with names + ratings |
| `/profile` | Own stats, rating history, edit profile |
| `/feedback/new` | Submit feedback |

### Mod (mod + admin)
| Route | Page |
|---|---|
| `/mod/games/new` | Create game |
| `/mod/games/[id]/edit` | Edit game |
| `/mod/games/[id]/lineup` | WhatsApp paste + resolve conflicts |
| `/mod/games/[id]/finish` | Finish game + enter score |

### Admin
| Route | Page |
|---|---|
| `/admin/users` | Approve accounts, manage roles |
| `/admin/ratings` | Review rating submissions |
| `/admin/feedback` | View + close feedback |
| `/admin/players` | Manage player records + aliases |

---

## 7. Folder Structure

```
fcda-os/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── matches/page.tsx
│   │   ├── matches/[id]/page.tsx
│   │   └── stats/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── pending/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              -- auth + approval guard
│   │   ├── profile/page.tsx
│   │   └── feedback/new/page.tsx
│   ├── (mod)/
│   │   ├── layout.tsx              -- role guard: mod or admin
│   │   └── mod/games/
│   │       ├── new/page.tsx
│   │       └── [id]/edit/page.tsx
│   │       └── [id]/lineup/page.tsx
│   │       └── [id]/finish/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx              -- role guard: admin only
│   │   └── admin/
│   │       ├── users/page.tsx
│   │       ├── ratings/page.tsx
│   │       ├── feedback/page.tsx
│   │       └── players/page.tsx
│   ├── api/
│   │   ├── auth/[...all]/route.ts
│   │   ├── games/route.ts
│   │   ├── games/[id]/route.ts
│   │   ├── games/[id]/lineup/route.ts
│   │   ├── games/[id]/finish/route.ts
│   │   ├── ratings/route.ts
│   │   ├── feedback/route.ts
│   │   ├── admin/users/route.ts
│   │   └── admin/players/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                         -- shadcn/ui primitives
│   ├── layout/                     -- Navbar, Footer, Sidebar
│   ├── matches/                    -- MatchCard, MatchDetail, ScoreDisplay
│   ├── stats/                      -- StatsTable, RatingBadge, RatingChart
│   ├── lineup/                     -- WhatsAppPasteBox, LineupResolver, PlayerChip
│   ├── admin/                      -- UserRow, FeedbackItem, RatingReviewCard
│   └── profile/                    -- ProfileStats, PasswordForm, EmailForm
├── lib/
│   ├── supabase/
│   │   ├── client.ts               -- browser client
│   │   ├── server.ts               -- server client (reads cookies)
│   │   └── middleware.ts           -- session refresh helper
│   ├── auth/
│   │   └── permissions.ts          -- hasRole(), isApproved(), requireRole()
│   ├── whatsapp/
│   │   └── parser.ts               -- parseLineup(), normaliseAlias()
│   └── utils.ts
├── hooks/
│   ├── useSession.ts
│   └── useRoles.ts
├── i18n/
│   ├── config.ts
│   ├── en/common.json
│   └── pt-PT/common.json
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── middleware.ts                   -- session refresh + route protection
├── .env.local.example
└── next.config.ts
```

---

## 8. MVP Scope

- Auth: register, login, approval flow, role assignment
- Public: home, match list, anonymised stats
- Authenticated: stats with names, own profile, feedback form
- Mod: game create/edit/finish, WhatsApp lineup parsing with conflict resolution
- Admin: user approval, role management, rating review, feedback inbox
- i18n scaffolding (EN + PT-PT strings)
- Supabase RLS on all tables
- Audit log for mod/admin actions

## 9. Phase 2

- Goals + assists tracking per game
- Player profile photos
- Team A/B assignment with per-team stats
- Email notifications (account approved, new game scheduled)
- Rating submission deadline (auto-closes N hours after game finishes)
- Export stats to PDF/CSV
- Public match calendar embed
- PWA / offline support

---

## 10. Risks & Edge Cases

| Risk | Mitigation |
|---|---|
| Pending user bypasses route guard | API route handlers independently verify `approved = true` |
| Guest receives player names via direct API call | Server Components gate on session; `players_public` view as DB-level second layer |
| Duplicate alias at parse time | Amber flag — mod forced to resolve manually before confirming lineup |
| WhatsApp format changes | Parser isolated in `lib/whatsapp/parser.ts` — update without touching other code |
| Admin approves wrong user | `audit_log` records every approval with `performed_by` + timestamp |
| Rating submitted for non-stats game | `rating_history` insert gated on `games.counts_for_stats = true` |
| Mod finishes a game twice | Finish handler checks `status = 'scheduled'` — only valid transition is `scheduled → finished`; already-finished games are rejected |
| Guest player later registers | Admin links existing `players` record to new `profiles` record via `/admin/players` |

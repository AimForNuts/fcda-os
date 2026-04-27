# Hide Player Ratings from Public — Design Spec

**Date:** 2026-04-27  
**Status:** Approved

## Problem

Player ratings (`current_rating`) are currently visible to all logged-in users on the players list page and each player's profile page. Ratings should only be visible to mods and admins.

## Goal

- Hide the "Nota" column from the players list table for non-mod/admin users.
- Hide the "Nota" stat card from player profile pages for non-mod/admin users.
- Ensure rating data is never fetched from the DB for non-privileged users.

## Scope

Three files change:

1. `app/(public)/players/page.tsx` — players list server page
2. `components/player/PlayersTable.tsx` — players table client component
3. `app/(public)/players/[id]/page.tsx` — player profile server page

No changes to DB schema, views, RLS, or other components.

## Design

### Role check

Both server pages already call `fetchSessionContext()`, which returns `session.roles`. Use the existing `canAccessMod(session.roles)` helper from `lib/auth/permissions.ts` to derive `canViewRatings`. This is `true` for `mod` and `admin` roles only.

### Players list page (`app/(public)/players/page.tsx`)

- Compute `const canViewRatings = canAccessMod(session.roles)`.
- When `canViewRatings` is `false`, omit `current_rating` from the Supabase `select` string.
- When mapping `rows`, omit `current_rating` (it won't be present in the response).
- Pass `canViewRatings` as a new prop to `<PlayersTable>`.

### PlayersTable component (`components/player/PlayersTable.tsx`)

- Add `canViewRatings: boolean` to the `Props` type.
- Build the `columns` array conditionally: only push the "Nota" column when `canViewRatings` is `true`.

### Player profile page (`app/(public)/players/[id]/page.tsx`)

- Compute `const canViewRatings = canAccessMod(session.roles)`.
- When `canViewRatings` is `false`, omit `current_rating` from the Supabase `select` string.
- Conditionally render the "Nota" stat card only when `canViewRatings` is `true`.

## Non-goals

- No changes to how ratings are stored, computed, or managed.
- No changes to the admin or mod pages (ratings remain fully visible there).
- No Supabase RLS changes.

# Admin Panel — Design Spec

**Date:** 2026-04-15
**Status:** Approved

---

## 1. Overview

Two admin pages under the existing `(admin)` route group: **Users** (`/admin/users`) and **Players** (`/admin/players`). The `(admin)` layout guard already enforces authentication + `admin` role — pages inside just render content.

**Users page:** approve/unapprove accounts, assign mod/admin roles, link each user to their player record.

**Players page:** edit player details, manage WhatsApp aliases, link guest players to registered profiles.

---

## 2. Architecture

### Route groups & pages

| File | Purpose |
|------|---------|
| `app/(admin)/admin/users/page.tsx` | Server Component — fetches users data, renders `UserTable` |
| `app/(admin)/admin/users/UserTable.tsx` | Client Component — all interactive mutations |
| `app/(admin)/admin/players/page.tsx` | Server Component — fetches players data, renders `PlayerTable` |
| `app/(admin)/admin/players/PlayerTable.tsx` | Client Component — all interactive mutations |

### API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `app/api/admin/users/[id]/route.ts` | `PATCH` | Approve/unapprove + add/remove role |
| `app/api/admin/players/[id]/route.ts` | `PATCH` | Edit details + link/unlink profile |
| `app/api/admin/players/[id]/aliases/route.ts` | `POST` | Add alias |
| `app/api/admin/players/[id]/aliases/[aliasId]/route.ts` | `DELETE` | Remove alias |
| `app/api/admin/users/search/route.ts` | `GET ?q=` | Search profiles by display_name (for linking from Players page) |

The existing `GET /api/players?q=` endpoint is reused for player search when linking from the Users page.

### Patterns

- Server Components fetch initial data using `createServiceClient()` (service role) to bypass RLS and get full admin visibility across `profiles`, `players`, and `user_roles`
- Client Components handle mutations via `fetch` to Route Handlers
- All Route Handlers verify `fetchSessionContext()` + `canAccessAdmin(roles)` before acting
- All mutations insert an `audit_log` row via `createServiceClient()`
- Supabase TS workaround: `.single() as { data: T | null; error: unknown }` and `(supabase.from() as any).update(...)`

---

## 3. Users Page

### Data fetched (Server Component)

```ts
// profiles + approval status
profiles: id, display_name, approved, created_at

// roles per profile
user_roles: user_id, role

// linked player (players.profile_id = profile.id) — nullable
players: id, sheet_name, shirt_number, profile_id

// aliases for linked player
player_aliases: id, player_id, alias_display
```

Fetched as: all profiles → all user_roles → all players where `profile_id IN (profileIds)` → all aliases for those players.

### Display

Pending users sorted to the top; approved users sorted alphabetically below. Each row:

| Field | Notes |
|-------|-------|
| Display name | From `profiles.display_name` |
| Status badge | `Pending` (amber) or `Approved` (green) |
| Role badges | `Player`, `Mod`, `Admin` — only shown when approved |
| Linked player | `sheet_name` + alias chips, or `—` if not linked |
| Actions | See below |

### Actions

**Approve** (pending users only):
- Sets `profiles.approved = true`
- Inserts `player` role into `user_roles` (if not already present)
- Audit log: `user.approved`

**Unapprove** (approved users only):
- Sets `profiles.approved = false`
- Deletes all rows from `user_roles` for this user
- Audit log: `user.unapproved`

**Mod toggle** (approved users only):
- Adds or removes `mod` role from `user_roles`
- Audit log: `user.role.added` / `user.role.removed`

**Admin toggle** (approved users only):
- Adds or removes `admin` role from `user_roles`
- Audit log: `user.role.added` / `user.role.removed`

**Link player** (user has no linked player):
- Inline search input — calls `GET /api/players?q=` as the admin types
- Selecting a result calls `PATCH /api/admin/players/{playerId}` with `{ profile_id: userId }`
- Row updates to show the linked player name + aliases
- Audit log: `player.linked`

**Unlink player** (user already has a linked player):
- Calls `PATCH /api/admin/players/{playerId}` with `{ profile_id: null }`
- Audit log: `player.unlinked`

### `PATCH /api/admin/users/[id]`

```ts
body (one action per request):
  { approved: true }                        // approve
  { approved: false }                       // unapprove
  { addRole: 'mod' | 'admin' }              // grant role
  { removeRole: 'mod' | 'admin' }           // revoke role
```

Constraints enforced server-side:
- Cannot add role to an unapproved user
- Cannot remove `player` role via this endpoint
- Cannot unapprove yourself (admin acting on their own account)

---

## 4. Players Page

### Data fetched (Server Component)

```ts
players: id, sheet_name, shirt_number, profile_id, created_at
player_aliases: id, player_id, alias_display (all aliases per player)
profiles: id, display_name (for players with a profile_id)
```

Fetched as: all players → all aliases → profiles where `id IN (profileIds)`.

### Display

Players sorted alphabetically by `sheet_name`. Each row:

| Field | Notes |
|-------|-------|
| Sheet name | Editable inline |
| Shirt number | Editable inline, nullable |
| Aliases | Chips with ✕ delete button each; inline add input |
| Linked profile | `display_name` or `Guest` if `profile_id` is null |
| Actions | Edit, link/unlink profile |

### Actions

**Edit sheet_name / shirt_number:**
- Inline — click row fields to edit; confirm with Enter or a save button
- Calls `PATCH /api/admin/players/{id}` with `{ sheet_name?, shirt_number? }`
- Audit log: `player.updated`

**Add alias:**
- Inline input that appears on demand; on submit normalises via `normaliseAlias()` client-side before sending
- Calls `POST /api/admin/players/{id}/aliases` with `{ alias_display: string }`
- Server also normalises and stores in `alias` column
- Alias chip appears immediately on success
- Audit log: `player.alias.added`

**Remove alias:**
- Click ✕ on alias chip
- Calls `DELETE /api/admin/players/{id}/aliases/{aliasId}`
- Chip removed on success
- Audit log: `player.alias.removed`

**Link to user** (guest player — `profile_id` is null):
- Inline search input — calls `GET /api/admin/users/search?q=` as the admin types; returns only profiles not already linked to another player
- Selecting a result calls `PATCH /api/admin/players/{id}` with `{ profile_id: userId }`
- Row updates to show the linked profile name
- Audit log: `player.linked`

**Unlink profile** (player already has `profile_id`):
- Calls `PATCH /api/admin/players/{id}` with `{ profile_id: null }`
- Audit log: `player.unlinked`

### `PATCH /api/admin/players/[id]`

```ts
body:
  { sheet_name?: string; shirt_number?: number | null; profile_id?: string | null }
```

Constraints enforced server-side:
- `profile_id` must either be null or a valid profile id not already linked to another player
- `sheet_name` must be non-empty

### `POST /api/admin/players/[id]/aliases`

```ts
body: { alias_display: string }
```

Server normalises `alias_display` via `normaliseAlias()` and stores both `alias` (normalised) and `alias_display` (original).

### `DELETE /api/admin/players/[id]/aliases/[aliasId]`

No body. Deletes the alias row. Returns 404 if not found.

### `GET /api/admin/users/search?q=`

Returns profiles matching `display_name ILIKE '%q%'` that do **not** already have a player linked (`profile_id` not present in `players`). Used by the Players page link-to-user inline search.

```ts
Response: Array<{ id: string; display_name: string }>
```

---

## 5. Navigation

The existing `Navbar` already shows an `Admin` link for admin-role users pointing to `/admin/users` (the primary page).

A horizontal tab bar at the top of every admin page switches between the two sections:

```
[ Users ]  [ Players ]
```

Implemented as a shared `AdminNav` client component rendered inside each page (not the layout, so it only appears on admin pages that include it).

---

## 6. i18n

Add keys to `en/common.json` and `pt-PT/common.json` under an `admin` namespace:

```json
"admin": {
  "users": "Users",
  "players": "Players",
  "pending": "Pending",
  "approved": "Approved",
  "approve": "Approve",
  "unapprove": "Unapprove",
  "linkPlayer": "Link player",
  "unlinkPlayer": "Unlink",
  "linkUser": "Link to user",
  "unlinkUser": "Unlink",
  "guest": "Guest",
  "addAlias": "Add alias",
  "noPlayer": "—",
  "searchPlayer": "Search player...",
  "searchUser": "Search user...",
  "errors": {
    "approveFailed": "Failed to approve user.",
    "roleFailed": "Failed to update role.",
    "playerUpdateFailed": "Failed to update player.",
    "aliasFailed": "Failed to save alias.",
    "linkFailed": "Failed to link."
  }
}
```

---

## 7. Out of Scope

- Rating review (`/admin/ratings`) — depends on rating submission system, not yet built
- Feedback inbox (`/admin/feedback`) — depends on feedback submission, not yet built
- Bulk actions (approve all pending, etc.)
- Player merge (two guest records for the same person)

# Rating Submission Design

## Goal

Allow players to rate their teammates after a finished game. Admins review and approve/reject submissions in batches. Approved ratings update each player's `current_rating`.

Includes a fix to the matches page sort order.

---

## Matches Page Sort Fix

`/matches` currently sorts all games by date descending. New order:

1. **Non-finished games** (status `scheduled` or `cancelled`) — sorted by date **ascending** (nearest at top)
2. **Finished games** — sorted by date **descending** (most recent at top)

Implemented in JavaScript after fetching all games (cannot be expressed as a single Supabase `.order()` call).

---

## Player Rating Flow

### Rate Button (`/matches/[id]`)

Shown as a link-button to `/matches/[id]/rate` only when ALL of the following are true:

- `game.status === 'finished'` and `game.counts_for_stats === true`
- The viewing user is authenticated and approved
- The user's linked player (`profile_id`) appears in `game_players` for this game

The button is computed server-side in the match detail page.

### Rating Page (`/matches/[id]/rate`)

Route group: `(app)` (requires auth + approval).

**Server Component** responsibilities:
- Fetch the game — `notFound()` if missing
- Verify `status === 'finished'` and `counts_for_stats === true` — redirect to `/matches/[id]` if not
- Resolve the user's linked player from `game_players` — redirect to `/matches/[id]` if not in lineup
- Fetch all other players in the lineup (teammates, excluding the user's own player)
- Fetch any existing `rating_submissions` for this `(game_id, submitted_by)` batch
- Determine lock state: if any submission in the batch has `status = 'approved'`, the form is read-only

**Client Component** (`RatingForm`) renders:
- One row per teammate: player name + `<input type="number" step="0.01" min="0" max="10">`
- Pre-filled with existing pending ratings if they exist
- Submit button calls `POST /api/matches/[id]/rate`
- On success: shows confirmation and disables the form
- Read-only view (locked) when batch is approved

---

## Submission API

**`POST /api/matches/[id]/rate`**

Auth: approved user with a linked player.

Request body:
```json
{ "ratings": { "<playerId>": 7.5, "<playerId>": 8.00 } }
```

Ratings are floats, 0.00–10.00 (up to 2 decimal places).

Validation:
1. Game must be `finished` and `counts_for_stats = true`
2. Submitting user's linked player must be in the game's lineup
3. No rated player may be the submitter's own linked player (no self-rating)
4. All rated players must actually be in the game's lineup
5. If any existing `rating_submission` for `(game_id, submitted_by)` has `status = 'approved'` → 403 Locked

On success: upserts one `rating_submissions` row per rated player with `status = 'pending'`. Uses the unique constraint `(game_id, submitted_by, rated_player_id)` for conflict resolution.

---

## Admin Ratings Tab

### `AdminNav`

Add `Ratings` tab after `Players`. New i18n key: `admin.ratings` / `admin.ratingsTab`.

### `/admin/ratings` page

Server Component. Lists all **pending** batches (at least one `rating_submissions` row with `status = 'pending'` in the batch).

A **batch** = all submissions with the same `(game_id, submitted_by)`.

Sort order: newest game first, then submitter display name alphabetically.

Per batch:
- Game date + location
- Submitter display name
- Table: rated player name | submitted rating
- **Approve all** button → `PATCH /api/admin/ratings` `{ action: 'approve', gameId, submittedBy }`
- **Reject all** button → `PATCH /api/admin/ratings` `{ action: 'reject', gameId, submittedBy }`

Empty state when no pending batches.

### `PATCH /api/admin/ratings`

Auth: admin only.

**Approve flow** (for each submission in the batch):
1. Set `status = 'approved'`, `reviewed_by`, `reviewed_at`
2. Insert into `rating_history`: `player_id`, `rating`, `previous_rating` (player's current `current_rating`), `changed_by` (admin's profile id)
3. Recalculate `current_rating` for the player: average of all approved `rating_submissions` for that player across all games
4. Update `players.current_rating` with the new average
5. Insert into `audit_log`: action `rating.approved`, target = game id, metadata = `{ submittedBy, playerCount }`

**Reject flow**:
1. Set `status = 'rejected'`, `reviewed_by`, `reviewed_at`
2. Insert into `audit_log`: action `rating.rejected`

No `rating_history` insert on rejection. No `current_rating` change on rejection.

---

## Data Sources

| Data | Source |
|------|--------|
| Game details | `games` table |
| Lineup (all players in game) | `game_players` JOIN `players_public` |
| User's linked player | `players` WHERE `profile_id = session.userId` |
| Existing submissions | `rating_submissions` WHERE `game_id` AND `submitted_by` |
| Pending batches (admin) | `rating_submissions` WHERE `status = 'pending'` |
| Player display names (admin) | `profiles` for submitters; `players` for rated players |

---

## Architecture

- `app/(public)/matches/[id]/page.tsx` — add Rate button (server-side conditional)
- `app/(public)/matches/page.tsx` — fix sort order in JS
- `app/(app)/matches/[id]/rate/page.tsx` — Server Component shell
- `components/ratings/RatingForm.tsx` — Client Component form
- `app/api/matches/[id]/rate/route.ts` — POST handler
- `app/(admin)/admin/ratings/page.tsx` — Server Component
- `app/(admin)/admin/ratings/RatingBatches.tsx` — Client Component (approve/reject buttons)
- `app/api/admin/ratings/route.ts` — PATCH handler
- `components/admin/AdminNav.tsx` — add Ratings tab
- `i18n/en/common.json` + `i18n/pt-PT/common.json` — new keys

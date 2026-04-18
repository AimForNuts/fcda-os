# Admin Rating Override Design

## Goal

Allow admins to directly set a player's `current_rating` from the admin Players page, so a baseline can be established before player-submitted feedback drives future updates.

---

## Current State

- `players.current_rating` is only updated when an admin approves a batch of `rating_submissions`
- The admin Players page (`/admin/players`) shows name, shirt number, linked profile, and aliases — no rating
- `PATCH /api/admin/players/[id]` accepts `sheet_name`, `shirt_number`, `profile_id` — no rating field
- `rating_history` is an append-only audit table; every approved change records `previous_rating`, `rating`, `changed_by`, `notes`

---

## Approach

Inline click-to-edit on the rating field in the player card. Clicking the displayed rating activates a number input; saving calls the existing PATCH endpoint (extended to handle `current_rating`). The API writes the new rating and inserts a `rating_history` audit row.

---

## Architecture

| File | Change |
|------|--------|
| `app/(admin)/admin/players/page.tsx` | Add `current_rating` to select query and `PlayerRow` type |
| `app/(admin)/admin/players/PlayerTable.tsx` | Show rating, add inline edit state and save handler |
| `app/api/admin/players/[id]/route.ts` | Accept `current_rating` in schema; insert `rating_history` when present |

---

## Data Layer

### `PlayerRow` type (page.tsx)

Add `current_rating: number | null` to the existing type.

### Select query (page.tsx)

```ts
.select('id, sheet_name, shirt_number, profile_id, current_rating')
```

### API — extend PATCH schema

```ts
const schema = z.object({
  sheet_name: z.string().min(1).max(100).optional(),
  shirt_number: z.number().int().min(1).max(99).nullable().optional(),
  profile_id: z.string().uuid().nullable().optional(),
  current_rating: z.number().min(0).max(10).optional(),
})
```

When `current_rating` is present, before updating `players`:
1. Read the player's existing `current_rating` (for `previous_rating` in history)
2. Update `players.current_rating`
3. Insert into `rating_history`:
   ```ts
   {
     player_id: id,
     rating: parsed.data.current_rating,
     previous_rating: existingRating ?? null,
     changed_by: session.userId,
     notes: 'admin override',
   }
   ```
4. Log to `audit_log` with action `'rating.override'`

---

## UI

### Display (normal state)

Below the player name/profile line in each card, show:

```
Rating: 7.50   [click to edit]
```

Or `Rating: –` if `current_rating` is null.

The rating text itself is the click target (cursor-pointer, subtle hover style).

### Edit state

Clicking the rating shows an inline number input:

```
Rating: [  7.50  ]  [Save]  [Cancel]
```

- Input: `type="number"`, `min="0"`, `max="10"`, `step="0.01"`, width ~80px
- Enter key saves, Escape cancels
- Save disabled while loading
- Error shown below on failure

### State management

Add to `PlayerTable`:
- `editingRatingId: string | null` — which player's rating is being edited (independent of `editingId`)
- `ratingInput: Record<string, string>` — current input value per player

Save calls `patchPlayer(playerId, 'rating', { current_rating: parseFloat(value) })` and updates the row's `current_rating` on success.

---

## No Tests Required

The rating save follows the identical pattern as the existing name/shirt edit — same `patchPlayer` helper, same optimistic update. No new logic to unit-test.

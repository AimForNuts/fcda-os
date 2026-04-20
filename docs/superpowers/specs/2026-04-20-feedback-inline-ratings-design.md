# Feedback Inline in Ratings Design

## Goal

Show per-player feedback comments inline in the admin ratings batch review, so the admin has full context when approving or rejecting a submission.

---

## Current State

- `RatingBatches.tsx` renders a table with one row per player: name + rating
- `BatchItem` type has `playerId`, `playerName`, `rating` — no `feedback`
- `admin/ratings/page.tsx` selects `id, game_id, submitted_by, rated_player_id, rating` from `rating_submissions` — `feedback` is not fetched
- Feedback is only visible in the separate Feedback tab (approved history)

---

## Architecture

| File | Change |
|------|--------|
| `app/(admin)/admin/ratings/page.tsx` | Add `feedback` to the `.select()` call and pass it through to `BatchItem` |
| `app/(admin)/admin/ratings/RatingBatches.tsx` | Add `feedback: string \| null` to `BatchItem`; render feedback as a second row below each rating |

No new API routes, no schema changes, no new components.

---

## Data Layer

In `admin/ratings/page.tsx`, change:

```ts
const { data: submissions } = await admin
  .from('rating_submissions')
  .select('id, game_id, submitted_by, rated_player_id, rating')
  .eq('status', 'pending') as { data: PendingRow[] | null; error: unknown }
```

To:

```ts
const { data: submissions } = await admin
  .from('rating_submissions')
  .select('id, game_id, submitted_by, rated_player_id, rating, feedback')
  .eq('status', 'pending') as { data: PendingRow[] | null; error: unknown }
```

Update `PendingRow` type:

```ts
type PendingRow = {
  id: string
  game_id: string
  submitted_by: string
  rated_player_id: string
  rating: number
  feedback: string | null
}
```

Pass `feedback` when building `BatchItem`:

```ts
batchMap.get(key)!.items.push({
  playerId: row.rated_player_id,
  playerName: playerMap.get(row.rated_player_id) ?? row.rated_player_id,
  rating: row.rating,
  feedback: row.feedback,
})
```

---

## `RatingBatches.tsx` Changes

### `BatchItem` type

```ts
type BatchItem = {
  playerId: string
  playerName: string
  rating: number
  feedback: string | null
}
```

### Table rows

Each player gets one row always (name + rating) and a conditional second row when `feedback` is non-null:

```tsx
{batch.items.map((item) => (
  <React.Fragment key={item.playerId}>
    <tr className={item.feedback ? '' : 'border-b'}>
      <td className="py-1">{item.playerName}</td>
      <td className="py-1 text-right">{item.rating.toFixed(2)}</td>
    </tr>
    {item.feedback && (
      <tr className="border-b">
        <td colSpan={2} className="pb-2 text-xs text-muted-foreground italic">
          {item.feedback}
        </td>
      </tr>
    )}
  </React.Fragment>
))}
```

Add `import React from 'react'` at the top (needed for `React.Fragment`).

---

## No Tests Required

Pure additive display change — no new logic, no branching beyond what the existing `feedback` column provides.

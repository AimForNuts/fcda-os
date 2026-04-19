# Feedback Per-Player Design

## Goal

Three improvements to the feedback/rating system:
1. Only show same-team players in the rating form (not the full lineup)
2. Lock the form after the first submission (not just after admin approval)
3. Replace the single overall feedback textarea with per-player comments alongside each rating

---

## Current State

- `rate/page.tsx` fetches all `game_players` rows without team info → everyone in the game appears
- `locked` is only `true` when at least one submission has `status = 'approved'` — pending submissions are editable
- `RatingForm` has one global `feedback` textarea; submitted to a separate `feedback` table row per `(game_id, submitted_by)`
- Admin feedback inbox reads from the `feedback` table with open/close workflow

---

## Architecture

| File | Change |
|------|--------|
| `supabase/migrations/20260419000003_feedback_per_player.sql` | Add `feedback text` (nullable) to `rating_submissions` |
| `types/database.ts` | Add `feedback: string \| null` to `rating_submissions` Row and Update |
| `app/(app)/matches/[id]/rate/page.tsx` | Filter teammates to same team; lock on any existing submission; pass `existingFeedbacks` |
| `app/api/matches/[id]/rate/route.ts` | Accept `feedbacks` map; include feedback in upsert; lock on any existing submission |
| `components/ratings/RatingForm.tsx` | Per-player comment textarea; remove global feedback textarea |
| `app/(admin)/admin/feedback/page.tsx` | Read from `rating_submissions` grouped by `(game_id, submitted_by)` |
| `app/(admin)/admin/feedback/FeedbackInbox.tsx` | New `FeedbackItem` shape with `comments[]`; read-only display; remove Close button |

---

## Data Layer

### Migration

```sql
ALTER TABLE public.rating_submissions
  ADD COLUMN feedback text;
```

No constraint — nullable, no max enforced at DB level (enforced in API at 300 chars).

### `types/database.ts` changes

In `rating_submissions.Row`, add:
```ts
feedback: string | null
```

In `rating_submissions.Update`, add:
```ts
feedback?: string | null
```

---

## Teammates Filter (`rate/page.tsx`)

Change the `game_players` query to include `team`:

```ts
const { data: gamePlayersRows } = await supabase
  .from('game_players')
  .select('player_id, team')
  .eq('game_id', gameId)
```

Find the submitter's team:
```ts
const submitterRow = (gamePlayersRows ?? []).find((gp) => gp.player_id === linkedPlayer.id)
const submitterTeam = submitterRow?.team ?? null
```

Filter teammates to same team only (exclude null-team players):
```ts
const teammateIds = (gamePlayersRows ?? [])
  .filter((gp) => gp.player_id !== linkedPlayer.id && gp.team != null && gp.team === submitterTeam)
  .map((gp) => gp.player_id)
```

If `submitterTeam` is null, `teammateIds` will be empty — player has no rateable teammates.

---

## Lock Behavior

### Page (`rate/page.tsx`)

Change lock condition from approved-only to any-existing:

```ts
// Before
const locked = (existingSubmissions ?? []).some((s) => s.status === 'approved')

// After
const locked = (existingSubmissions ?? []).length > 0
```

Also fetch per-player feedback from existing submissions:
```ts
const existingFeedbacks: Record<string, string> = {}
for (const s of existingSubmissions ?? []) {
  if (s.feedback) existingFeedbacks[s.rated_player_id] = s.feedback
}
```

Update the `select` to include `feedback` and `rated_player_id`:
```ts
const { data: existingSubmissions } = await supabase
  .from('rating_submissions')
  .select('rated_player_id, rating, status, feedback')
  .eq('game_id', gameId)
  .eq('submitted_by', session.userId)
```

Pass `existingFeedbacks` to `RatingForm` (replacing `existingFeedback`).

Remove the separate `feedback` table query entirely.

### API (`rate/route.ts`)

Change lock check from approved-only to any-existing:

```ts
// Before
const isLocked = (existingBatch ?? []).some((s) => s.status === 'approved')

// After
const isLocked = (existingBatch ?? []).length > 0
```

Remove the separate feedback table upsert block.

---

## API Schema (`rate/route.ts`)

Replace `content` with `feedbacks`:

```ts
const schema = z.object({
  ratings: z.record(z.string().uuid(), z.number().min(0).max(10)),
  feedbacks: z.record(z.string().uuid(), z.string().max(300)).optional(),
})
```

Include `feedback` in the upsert rows:
```ts
const { ratings, feedbacks } = parsed.data

const rows = Object.entries(ratings).map(([rated_player_id, rating]) => ({
  game_id: gameId,
  submitted_by: session.userId,
  rated_player_id,
  rating: Math.round(rating * 100) / 100,
  status: 'pending' as const,
  reviewed_by: null,
  reviewed_at: null,
  feedback: feedbacks?.[rated_player_id]?.trim() || null,
}))
```

---

## RatingForm Component

### Props

```ts
type Props = {
  gameId: string
  teammates: PlayerPublic[]
  existingRatings: Record<string, number>
  existingFeedbacks: Record<string, string>
  locked: boolean
}
```

Remove `existingFeedback?: string`.

### State

```ts
const [feedbacks, setFeedbacks] = useState<Record<string, string>>(() =>
  Object.fromEntries(teammates.map((p) => [p.id, existingFeedbacks[p.id] ?? '']))
)
```

Remove the single `feedback` state.

### Submit payload

```ts
const feedbackPayload: Record<string, string> = {}
for (const [id, text] of Object.entries(feedbacks)) {
  if (text.trim()) feedbackPayload[id] = text.trim()
}

const body: { ratings: Record<string, number>; feedbacks?: Record<string, string> } = { ratings: payload }
if (Object.keys(feedbackPayload).length > 0) body.feedbacks = feedbackPayload
```

### Form layout (active state)

Each player row expands to two rows: rating input on the first, small textarea on the second:

```tsx
{teammates.map((p) => (
  <React.Fragment key={p.id}>
    <tr>
      <td className="py-2 pt-3">{p.display_name}</td>
      <td className="py-2 pt-3 text-right">
        <input type="number" ... />
      </td>
    </tr>
    <tr>
      <td colSpan={2} className="pb-3">
        <textarea
          value={feedbacks[p.id] ?? ''}
          onChange={(e) => setFeedbacks((prev) => ({ ...prev, [p.id]: e.target.value }))}
          placeholder="Comentário (opcional)"
          disabled={isNaN(parseFloat(ratings[p.id] ?? '')) || submitting}
          maxLength={300}
          rows={2}
          className="w-full border rounded px-2 py-1 text-xs resize-none disabled:opacity-40"
        />
      </td>
    </tr>
  </React.Fragment>
))}
```

Textarea is disabled until that specific player has a rating entered.

### Locked view

Show rating + comment per player (comment only if non-empty):

```tsx
{teammates.map((p) => (
  <React.Fragment key={p.id}>
    <tr className="border-b">
      <td className="py-2">{p.display_name}</td>
      <td className="py-2 text-right">
        {existingRatings[p.id] != null ? existingRatings[p.id].toFixed(2) : '—'}
      </td>
    </tr>
    {existingFeedbacks[p.id] && (
      <tr>
        <td colSpan={2} className="pb-2 text-xs text-muted-foreground italic">
          {existingFeedbacks[p.id]}
        </td>
      </tr>
    )}
  </React.Fragment>
))}
```

Remove the old single feedback block at the bottom.

---

## Admin Feedback Inbox

### New `FeedbackItem` type

```ts
export type PlayerComment = {
  playerName: string
  content: string
}

export type FeedbackItem = {
  gameDate: string
  gameLocation: string
  submitterName: string
  comments: PlayerComment[]
}
```

### `admin/feedback/page.tsx`

Query `rating_submissions` where `feedback IS NOT NULL`, join with games + profiles + players:

```ts
const { data: rows } = await admin
  .from('rating_submissions')
  .select('game_id, submitted_by, rated_player_id, feedback, created_at')
  .not('feedback', 'is', null)
  .order('created_at', { ascending: false }) as {
    data: Array<{
      game_id: string
      submitted_by: string
      rated_player_id: string
      feedback: string
      created_at: string
    }> | null
    error: unknown
  }
```

Group by `(game_id, submitted_by)`, resolve names, build `FeedbackItem[]`:

```ts
// Group rows
const groups = new Map<string, typeof rows>()
for (const row of rows ?? []) {
  const key = `${row.game_id}:${row.submitted_by}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key)!.push(row)
}

// Build items (most recent first)
const items: FeedbackItem[] = [...groups.values()].map((group) => {
  const first = group[0]
  const game = gameMap.get(first.game_id)
  return {
    gameDate: game?.date ?? '',
    gameLocation: game?.location ?? '',
    submitterName: profileMap.get(first.submitted_by) ?? first.submitted_by,
    comments: group.map((r) => ({
      playerName: playerMap.get(r.rated_player_id) ?? r.rated_player_id,
      content: r.feedback,
    })),
  }
})
```

Pass `items` to `FeedbackInbox`.

### `FeedbackInbox.tsx`

Read-only component — no close button, no open/closed split. Renders each item as a card:

```
João Silva — 15 Jan · Estádio
  Pedro Santos: "Good positioning today"
  Carlos Matos: "Needs to track back more"
```

---

## No Tests Required

The per-player textarea toggle follows the same disabled pattern as the existing rating inputs. No new branching logic.

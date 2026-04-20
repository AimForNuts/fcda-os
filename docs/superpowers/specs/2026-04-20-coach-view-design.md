# Coach View Design

## Goal

Give admins a per-player view of all approved rating submissions — game date, submitter, rating value, and feedback — with inline feedback editing.

---

## Current State

- No per-player history view exists in the admin panel
- `rating_submissions` stores approved rows with `feedback text` (nullable)
- `PATCH /api/admin/feedback/[id]` operates on a separate `feedback` table — not `rating_submissions`
- Admin nav has: Users, Players, Ratings, Feedback

---

## Architecture

| File | Role |
|------|------|
| `components/admin/AdminNav.tsx` | Add "Coach" tab |
| `app/(admin)/admin/coach/page.tsx` | Server component — fetch all players, render list |
| `app/(admin)/admin/coach/CoachPlayerList.tsx` | Client component — accordion player list |
| `app/(admin)/admin/coach/CoachPlayerPanel.tsx` | Client component — submissions table + inline feedback edit |
| `app/api/admin/coach/players/[id]/route.ts` | `GET` — approved submissions for a player |
| `app/api/admin/ratings/[id]/feedback/route.ts` | `PATCH` — edit `feedback` text on a single submission row |

---

## API

### `GET /api/admin/coach/players/[id]`

Admin-only. Fetches all `rating_submissions` rows where `rated_player_id = [id]` and `status = 'approved'`. Joins `games` for date and location, `profiles` for submitter display name. Returns rows sorted by game date descending.

```ts
type SubmissionRow = {
  id: string
  gameDate: string       // ISO date string from games.date
  gameLocation: string   // games.location
  submitterName: string  // profiles.display_name
  rating: number
  feedback: string | null
}
```

Response: `200 { submissions: SubmissionRow[] }` — empty array if none found.
Auth: `401` if no session, `403` if not admin.

### `PATCH /api/admin/ratings/[id]/feedback`

Admin-only. Updates `rating_submissions.feedback` for the row with `id = [id]` and `status = 'approved'` (only approved rows are editable).

Request body:
```ts
{ feedback: string | null }  // null clears the feedback
```

Zod schema: `z.object({ feedback: z.string().max(1000).nullable() })`

Response: `200 { ok: true }` on success.
Auth: `401` if no session, `403` if not admin.
Errors: `404` if row not found or not approved, `422` on validation failure.

---

## Page (`app/(admin)/admin/coach/page.tsx`)

Server component. Fetches all players sorted alphabetically by `sheet_name`. Passes the list to `<CoachPlayerList>`.

```ts
type PlayerRow = {
  id: string
  sheet_name: string
  shirt_number: number | null
  current_rating: number | null
}
```

```tsx
export const metadata = { title: 'Coach — FCDA Admin' }

export default async function CoachPage() {
  const admin = createServiceClient()
  const { data: players } = await admin
    .from('players')
    .select('id, sheet_name, shirt_number, current_rating')
    .order('sheet_name') as { data: PlayerRow[] | null; error: unknown }

  return (
    <div className="space-y-4">
      <CoachPlayerList players={players ?? []} />
    </div>
  )
}
```

---

## `CoachPlayerList` Component

`'use client'`. Receives `players: PlayerRow[]`. Maintains `openId: string | null` (one panel open at a time) and `cache: Record<string, SubmissionRow[]>` for loaded data.

Clicking a player row:
- If already open → collapse (set `openId` to `null`)
- If not open → set `openId`, fetch if not cached, store in cache, expand panel

Each player row shows: `sheet_name`, shirt number (if set, in muted text), `current_rating` (if set, right-aligned).

Below the row, when `openId === player.id`: render `<CoachPlayerPanel submissions={cache[player.id]} />`.

Loading state: while fetching, show a subtle spinner or "A carregar..." below the row.

Error state: if fetch fails, show inline error text below the row.

---

## `CoachPlayerPanel` Component

`'use client'`. Receives `submissions: SubmissionRow[]`.

If empty: render `<p className="text-sm text-muted-foreground">Sem avaliações aprovadas.</p>`

Otherwise: renders a table with columns: game date · location, submitter, rating, feedback.

### Feedback cell

Each row's feedback cell has two states:

**View state:** show feedback text (or `—` if null), plus an "Editar" button.

**Edit state:** `<textarea>` pre-filled with current feedback (or empty), plus "Guardar" and "Cancelar" buttons.

- "Guardar" calls `PATCH /api/admin/ratings/[id]/feedback` with `{ feedback: value.trim() || null }` (empty string becomes null)
- On success: update the cell in place, return to view state
- On error: show inline error, stay in edit state
- "Cancelar": discard changes, return to view state

Only one row in edit state at a time per panel (clicking "Editar" on a second row cancels any open edit).

---

## AdminNav

Add a "Coach" tab after "Feedback":

```tsx
{ href: '/admin/coach', label: t('admin.coach') }
```

Add `"coach": "Coach"` to the `admin` object in both:
- `i18n/en/common.json`
- `i18n/pt-PT/common.json`

---

## Tests

The new components (`CoachPlayerList`, `CoachPlayerPanel`) and API routes follow identical patterns to existing ones — no new tests required for them.

`__tests__/components/admin/AdminNav.test.tsx` must add one test for the new tab:

```tsx
it('renders the coach nav link', () => {
  render(<AdminNav />)
  expect(screen.getByRole('link', { name: 'admin.coach' })).toBeInTheDocument()
})
```

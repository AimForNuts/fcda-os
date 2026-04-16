# Feedback Inbox Design

## Goal

Allow approved players who participated in a finished game to submit written feedback alongside their teammate ratings. Admins can view all feedback (open/closed) and close individual items.

---

## DB Migration

The existing `feedback` table has no `game_id` column. A new migration adds:

```sql
ALTER TABLE public.feedback
  ADD COLUMN game_id uuid NOT NULL REFERENCES public.games(id);

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_game_submitted_by_unique UNIQUE (game_id, submitted_by);
```

`types/database.ts` must be updated to add `game_id: string` to `feedback.Row` and `feedback.Insert`.

---

## Player Feedback Flow

### Rate page (`/matches/[id]/rate`)

Feedback is submitted on the same page as teammate ratings. The `RatingForm` client component gains a feedback textarea below the ratings table.

**Textarea behaviour:**
- Placeholder: `t('matches.feedbackPlaceholder')`
- Disabled with hint `t('matches.feedbackHint')` ("Add ratings first") until at least one rating input has a non-empty value
- Max 1000 characters
- Not required — if left empty, no feedback row is created
- Read-only (locked) when the ratings batch is approved

**Single submit:** the existing submit button sends everything together. No second button.

### Extended `POST /api/matches/[id]/rate`

Request body gains an optional `content` field:

```json
{ "ratings": { "<playerId>": 7.5 }, "content": "Great teamwork today" }
```

Validation: `content` is optional; if present, must be a non-empty string of max 1000 characters.

The existing validation chain (game eligibility, linked player, lineup check, self-rating, lock check) is unchanged. After the ratings upsert succeeds, if `content` is non-empty:

- Upsert one `feedback` row: `game_id`, `submitted_by = session.userId`, `content`, `status: 'open'`
- Uses unique constraint `(game_id, submitted_by)` for conflict resolution (players can update their feedback by resubmitting)

The lock check (any approved submission → 403) also prevents feedback updates, since the whole form is locked.

---

## Admin Feedback Inbox

### `AdminNav`

Add `Feedback` tab after `Ratings`. New i18n key: `admin.feedback`.

### `/admin/feedback` page

Server Component. Fetches all `feedback` rows via service client; joins with `games` (date, location) and `profiles` (submitter display name). Passes two arrays to `FeedbackInbox`: `open` and `closed`.

Sort: newest first within each section.

### `FeedbackInbox` client component

Two sections on the same page:

**Open** — full display for each item:
- Game date + location (formatted pt-PT)
- Submitter display name
- Feedback text
- **Close** button → `PATCH /api/admin/feedback/[id]` `{ action: 'close' }`
- On success: item moves from open list to closed list in local state

**Closed** — below a divider, muted style, no close button.

Empty states:
- No open feedback: `t('admin.noOpenFeedback')`
- No closed feedback: no message needed (section simply absent)

### `PATCH /api/admin/feedback/[id]`

Auth: admin only.

Body: `{ action: 'close' }` (Zod validated).

Sets `status = 'closed'`, `closed_by = session.userId`, `closed_at = now`.

Fire-and-forget audit log: `{ action: 'feedback.closed', target_id: id, target_type: 'feedback' }`.

---

## i18n Keys

### `matches` namespace (both locales)

```json
"feedbackLabel": "Feedback",
"feedbackPlaceholder": "Share your thoughts about this game...",
"feedbackHint": "Add at least one rating to enable feedback."
```

### `admin` namespace (both locales)

```json
"feedback": "Feedback",
"closeItem": "Close",
"noOpenFeedback": "No open feedback.",
"openFeedback": "Open",
"closedFeedback": "Closed",
"errors": {
  "feedbackFailed": "Failed to update feedback."
}
```

Portuguese translations:
- `feedbackLabel`: "Feedback"
- `feedbackPlaceholder`: "Partilha a tua opinião sobre este jogo..."
- `feedbackHint`: "Adiciona pelo menos uma avaliação para ativar o feedback."
- `admin.feedback`: "Feedback"
- `admin.closeItem`: "Fechar"
- `admin.noOpenFeedback`: "Sem feedback em aberto."
- `admin.openFeedback`: "Em aberto"
- `admin.closedFeedback`: "Fechado"
- `admin.errors.feedbackFailed`: "Erro ao atualizar feedback."

---

## Architecture

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260416000001_feedback_game_id.sql` | Create | Add `game_id` + unique constraint to `feedback` |
| `types/database.ts` | Modify | Add `game_id` to `feedback` Row + Insert |
| `i18n/en/common.json` | Modify | New matches + admin keys |
| `i18n/pt-PT/common.json` | Modify | Portuguese translations |
| `components/admin/AdminNav.tsx` | Modify | Add Feedback tab |
| `__tests__/components/admin/AdminNav.test.tsx` | Modify | Add Feedback tab test |
| `components/ratings/RatingForm.tsx` | Modify | Add feedback textarea with disable logic |
| `__tests__/components/ratings/RatingForm.test.tsx` | Modify | Add textarea tests |
| `app/api/matches/[id]/rate/route.ts` | Modify | Handle optional `content` field, upsert feedback |
| `app/(admin)/admin/feedback/page.tsx` | Create | Server Component — fetch + split open/closed |
| `app/(admin)/admin/feedback/FeedbackInbox.tsx` | Create | Client Component — close buttons + state |
| `app/api/admin/feedback/[id]/route.ts` | Create | PATCH — close feedback item |

---

## Data Sources

| Data | Source |
|------|--------|
| All feedback | `feedback` WHERE all rows (service client) |
| Game details for feedback | `games` JOIN on `game_id` |
| Submitter names | `profiles` JOIN on `submitted_by` |
| Session user | `fetchSessionContext()` |

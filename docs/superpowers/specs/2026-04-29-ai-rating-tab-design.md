# AI Rating Tab — Design Spec

**Date:** 2026-04-29

## Overview

Add an "AI Rating" tab to the admin panel that uses OpenAI to suggest updated player ratings based on unprocessed approved rating submissions and feedback. Admins review and edit the suggestions before applying them.

## Data Model Changes

### `rating_submissions.status`

Add `processed` as a fourth allowed value. Full lifecycle:

```
pending → approved → processed
pending → rejected
```

No existing rows are affected. A submission becomes `processed` only when an admin applies AI-generated ratings through the new tab.

### Remove auto-recalculation on approval

`PATCH /api/admin/ratings` currently recalculates `player.current_rating` after approving a batch. This recalculation is removed. Approving a batch will only:
- Set submission statuses to `approved`
- Write entries to `rating_history`

`current_rating` is now only updated via:
1. The new AI Rating tab (bulk AI-assisted update)
2. Direct edit in the Players tab (existing manual override)

## API Routes

### `POST /api/admin/ai-rating/process`

Server-side only (admin auth required). No database writes.

**Logic:**
1. Fetch all players with `current_rating`
2. For each player, fetch all `rating_submissions` where `status = 'approved'` (i.e. unprocessed)
3. Build prompt string per player:
   ```
   Player_1 rating: 10 feedback ratings: 9 - 5 - 7 Feedback: feedback_text_1 feedback_text_2
   Player_2 rating: 6 feedback ratings: 3.5 - 8 Feedback: feedback_text_1
   Player_3 rating: 7.5 feedback ratings: (none)
   ```
4. Call OpenAI API (`gpt-4o`) with system prompt (see below) and the player block as user message
5. Parse JSON response
6. Return `{ player_id, player_name, current_rating, suggested_rating }[]` to client

**System prompt:**
> You are a football coach assistant. Given each player's current rating and their recent match ratings with optional feedback text, suggest a new overall rating between 0 and 10 (one decimal place). Consider both the numeric ratings and any feedback text. For players with no new ratings, keep their current rating unchanged. Respond ONLY with a valid JSON array in this exact format, no explanations:
> `[{"player_id": "...", "suggested_rating": 7.5}]`

**OpenAI config:**
- Model: `gpt-4o`
- API key: `process.env.OPENAI_KEY`
- Response format: JSON

**Response shape:**
```ts
{ players: { player_id: string; player_name: string; current_rating: number; suggested_rating: number }[] }
```

### `POST /api/admin/ai-rating/apply`

Admin auth required. Writes to database.

**Request body:**
```ts
{ updates: { player_id: string; new_rating: number }[] }
```

**Logic (single transaction):**
1. For each entry in `updates`:
   - Update `players.current_rating` to `new_rating`
   - Set all `rating_submissions` with `status = 'approved'` for this player to `status = 'processed'`
   - Insert a `rating_history` row with `notes = 'AI rating update'`
2. Return `{ ok: true }`

## UI: Admin "AI Rating" Tab

**Route:** `/admin/ai-rating`

**Nav:** New entry in `AdminNav` after the existing five tabs. Admin-only (same auth guard).

### Page States

**Idle**
- Table: Player name | Current Rating | Pending Ratings (count of `approved` submissions)
- Players with 0 pending show "—" in the pending column, greyed out
- Top: info line "X players have pending ratings"
- Button: "Process with AI"

**Loading**
- Button replaced with spinner + "Asking AI…" text
- Table remains visible

**Confirmation**
- Table gains two new columns: "AI Suggested" (editable `<input type="number">`, min 0, max 10, step 0.1) and "Change" (delta: `+0.5` green / `-1.0` red / `—` grey for no change)
- Players with no unprocessed ratings: AI Suggested = current rating, Change = "—"
- Bottom: "Apply All" (primary) and "Cancel" (secondary) buttons
- On Apply: calls `/api/admin/ai-rating/apply` with current input values, resets to idle on success
- On Cancel: resets to idle, no writes

## Migration

New Supabase migration file to add `processed` to the `status` check constraint on `rating_submissions`.

## Out of Scope

- Team generation AI assistant (separate spec)
- Per-player selective processing (Approach B — deferred)
- Streaming AI responses

# AI Rating Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "AI Rating" admin tab that uses OpenAI to suggest updated player ratings from unprocessed approved submissions, lets the admin edit suggestions, and applies them in bulk.

**Architecture:** A new `processed` status on `rating_submissions` decouples approval from rating updates. Two new API routes handle the OpenAI call and the apply step. A server + client component pair renders the three-state UI (idle → loading → confirm).

**Tech Stack:** Next.js App Router, Supabase (service client), OpenAI SDK (`openai` npm package, model `gpt-4o`), Vitest for unit tests.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260430000001_rating_processed_status.sql` | Add `processed` to status constraint |
| Modify | `types/database.ts` | Add `'processed'` to `rating_submissions` status unions |
| Modify | `app/api/admin/ratings/route.ts` | Remove auto-recalculation block on approval |
| Create | `lib/ai-rating/prompt.ts` | Pure function that builds the player prompt string |
| Create | `__tests__/lib/ai-rating/prompt.test.ts` | Unit tests for the prompt builder |
| Create | `app/api/admin/ai-rating/process/route.ts` | POST — fetch players, call OpenAI, return suggestions |
| Create | `app/api/admin/ai-rating/apply/route.ts` | POST — update ratings, mark processed, write history |
| Create | `app/(admin)/admin/ai-rating/page.tsx` | Server component — fetch player list with pending counts |
| Create | `app/(admin)/admin/ai-rating/AiRatingClient.tsx` | Client component — three-state UI |
| Modify | `components/admin/AdminNav.tsx` | Add "AI Rating" tab |

---

### Task 1: Install OpenAI package

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the package**

```bash
npm install openai
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install openai package"
```

---

### Task 2: Database migration — add `processed` status

**Files:**
- Create: `supabase/migrations/20260430000001_rating_processed_status.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260430000001_rating_processed_status.sql
ALTER TABLE public.rating_submissions
  DROP CONSTRAINT IF EXISTS rating_submissions_status_check;

ALTER TABLE public.rating_submissions
  ADD CONSTRAINT rating_submissions_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'processed'));
```

- [ ] **Step 2: Apply the migration locally**

```bash
npx supabase db push
```

Expected: migration applied with no errors. If `supabase db push` isn't available, use `npx supabase migration up`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260430000001_rating_processed_status.sql
git commit -m "feat: add processed status to rating_submissions"
```

---

### Task 3: Update TypeScript types

**Files:**
- Modify: `types/database.ts:160-183`

- [ ] **Step 1: Add `'processed'` to all three status unions in `rating_submissions`**

In `types/database.ts`, find the `rating_submissions` table definition and update all three places where `status` appears:

```typescript
// Row (line ~160)
status: 'pending' | 'approved' | 'rejected' | 'processed'

// Insert (line ~173)
status?: 'pending' | 'approved' | 'rejected' | 'processed'

// Update (line ~179)
status?: 'pending' | 'approved' | 'rejected' | 'processed'
```

The full updated `rating_submissions` block should be:

```typescript
rating_submissions: {
  Row: {
    id: string
    game_id: string
    submitted_by: string
    rated_player_id: string
    rating: number
    status: 'pending' | 'approved' | 'rejected' | 'processed'
    reviewed_by: string | null
    reviewed_at: string | null
    feedback: string | null
    created_at: string
  }
  Insert: {
    id?: string
    game_id: string
    submitted_by: string
    rated_player_id: string
    rating: number
    status?: 'pending' | 'approved' | 'rejected' | 'processed'
    reviewed_by?: string | null
    reviewed_at?: string | null
    feedback?: string | null
    created_at?: string
  }
  Update: {
    status?: 'pending' | 'approved' | 'rejected' | 'processed'
    reviewed_by?: string | null
    reviewed_at?: string | null
    feedback?: string | null
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add types/database.ts
git commit -m "feat: add processed to rating_submissions status type"
```

---

### Task 4: Write prompt builder + tests

**Files:**
- Create: `lib/ai-rating/prompt.ts`
- Create: `__tests__/lib/ai-rating/prompt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/ai-rating/prompt.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { buildAiRatingPrompt } from '@/lib/ai-rating/prompt'

describe('buildAiRatingPrompt', () => {
  it('formats a player with ratings and feedback', () => {
    const result = buildAiRatingPrompt([
      {
        player_id: 'abc-123',
        player_name: 'João',
        current_rating: 7.5,
        approved_ratings: [8, 6, 9],
        feedback_texts: ['Good game', 'Worked hard'],
      },
    ])
    expect(result).toBe(
      'João (id:abc-123) rating: 7.5 feedback ratings: 8 - 6 - 9 Feedback: Good game Worked hard'
    )
  })

  it('formats a player with no approved ratings', () => {
    const result = buildAiRatingPrompt([
      {
        player_id: 'def-456',
        player_name: 'Carlos',
        current_rating: 5,
        approved_ratings: [],
        feedback_texts: [],
      },
    ])
    expect(result).toBe(
      'Carlos (id:def-456) rating: 5 feedback ratings: (none)'
    )
  })

  it('formats a player with null current_rating as 0', () => {
    const result = buildAiRatingPrompt([
      {
        player_id: 'ghi-789',
        player_name: 'Pedro',
        current_rating: null,
        approved_ratings: [7],
        feedback_texts: [],
      },
    ])
    expect(result).toBe(
      'Pedro (id:ghi-789) rating: 0 feedback ratings: 7'
    )
  })

  it('joins multiple players with newlines', () => {
    const result = buildAiRatingPrompt([
      { player_id: 'a', player_name: 'A', current_rating: 8, approved_ratings: [9], feedback_texts: [] },
      { player_id: 'b', player_name: 'B', current_rating: 6, approved_ratings: [], feedback_texts: [] },
    ])
    const lines = result.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('A (id:a)')
    expect(lines[1]).toContain('B (id:b)')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/ai-rating/prompt.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/ai-rating/prompt'"

- [ ] **Step 3: Create the prompt builder**

Create `lib/ai-rating/prompt.ts`:

```typescript
export type PlayerForPrompt = {
  player_id: string
  player_name: string
  current_rating: number | null
  approved_ratings: number[]
  feedback_texts: string[]
}

export function buildAiRatingPrompt(players: PlayerForPrompt[]): string {
  return players
    .map((p) => {
      const current = p.current_rating ?? 0
      const ratingsStr =
        p.approved_ratings.length > 0 ? p.approved_ratings.join(' - ') : '(none)'
      const feedbackPart =
        p.feedback_texts.length > 0 ? ` Feedback: ${p.feedback_texts.join(' ')}` : ''
      return `${p.player_name} (id:${p.player_id}) rating: ${current} feedback ratings: ${ratingsStr}${feedbackPart}`
    })
    .join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/lib/ai-rating/prompt.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/ai-rating/prompt.ts __tests__/lib/ai-rating/prompt.test.ts
git commit -m "feat: add AI rating prompt builder with tests"
```

---

### Task 5: Remove auto-recalculation from approval route

**Files:**
- Modify: `app/api/admin/ratings/route.ts:69-103`

- [ ] **Step 1: Remove the recalculation block and simplify the approve path**

Replace the entire section from the comment `// Per submission: insert rating_history and recalculate current_rating` (line 69) through the closing `}` of the for loop (line 103) with a simple approval that only writes `rating_history` — no `current_rating` update:

The new approve block (replacing lines 61–103) should be:

```typescript
  // Approve: mark all as approved
  const { error: approveErr } = await (admin.from('rating_submissions') as any)
    .update({ status: 'approved', reviewed_by: session.userId, reviewed_at: now })
    .eq('game_id', gameId)
    .eq('submitted_by', submittedBy)
    .eq('status', 'pending')

  if (approveErr) return Response.json({ error: 'Failed to approve' }, { status: 500 })

  const { error: auditErr } = await admin.from('audit_log').insert({
    action: 'rating.approved',
    performed_by: session.userId,
    target_id: gameId,
    target_type: 'game',
    metadata: { submittedBy, playerCount: batch.length },
  } as any)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ ok: true })
```

The full updated file should look like this:

```typescript
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'

const schema = z.object({
  action: z.enum(['approve', 'reject']),
  gameId: z.string().uuid(),
  submittedBy: z.string().uuid(),
})

export async function PATCH(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { action, gameId, submittedBy } = parsed.data
  const admin = createServiceClient()
  const now = new Date().toISOString()

  // Fetch the pending batch
  const { data: batch } = await admin
    .from('rating_submissions')
    .select('id, rated_player_id, rating')
    .eq('game_id', gameId)
    .eq('submitted_by', submittedBy)
    .eq('status', 'pending') as {
      data: Array<{ id: string; rated_player_id: string; rating: number }> | null
      error: unknown
    }

  if (!batch || batch.length === 0) {
    return Response.json({ error: 'No pending submissions found' }, { status: 404 })
  }

  if (action === 'reject') {
    const { error } = await (admin.from('rating_submissions') as any)
      .update({ status: 'rejected', reviewed_by: session.userId, reviewed_at: now })
      .eq('game_id', gameId)
      .eq('submitted_by', submittedBy)
      .eq('status', 'pending')

    if (error) return Response.json({ error: 'Failed to reject' }, { status: 500 })

    const { error: auditErr } = await admin.from('audit_log').insert({
      action: 'rating.rejected',
      performed_by: session.userId,
      target_id: gameId,
      target_type: 'game',
      metadata: { submittedBy, playerCount: batch.length },
    } as any)
    if (auditErr) console.error('audit_log insert failed', auditErr)

    return Response.json({ ok: true })
  }

  // Approve: mark all as approved (current_rating is updated via AI Rating tab only)
  const { error: approveErr } = await (admin.from('rating_submissions') as any)
    .update({ status: 'approved', reviewed_by: session.userId, reviewed_at: now })
    .eq('game_id', gameId)
    .eq('submitted_by', submittedBy)
    .eq('status', 'pending')

  if (approveErr) return Response.json({ error: 'Failed to approve' }, { status: 500 })

  const { error: auditErr } = await admin.from('audit_log').insert({
    action: 'rating.approved',
    performed_by: session.userId,
    target_id: gameId,
    target_type: 'game',
    metadata: { submittedBy, playerCount: batch.length },
  } as any)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/ratings/route.ts
git commit -m "feat: remove auto-recalculation from approval — ratings now updated via AI tab only"
```

---

### Task 6: Create the AI process API route

**Files:**
- Create: `app/api/admin/ai-rating/process/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'
import { buildAiRatingPrompt } from '@/lib/ai-rating/prompt'

const SYSTEM_PROMPT = `You are a football coach assistant. Given each player's current rating and their recent match ratings with optional feedback text, suggest a new overall rating between 0 and 10 (one decimal place). Consider both the numeric ratings and any feedback text. For players with no new ratings, keep their current rating unchanged. Respond ONLY with a valid JSON object in this exact format, no explanations:
{"ratings": [{"player_id": "...", "suggested_rating": 7.5}]}`

export async function POST() {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createServiceClient()

  const { data: players } = await admin
    .from('players')
    .select('id, sheet_name, current_rating')
    .order('sheet_name') as {
      data: Array<{ id: string; sheet_name: string; current_rating: number | null }> | null
      error: unknown
    }

  if (!players || players.length === 0) {
    return Response.json({ players: [] })
  }

  const playerIds = players.map((p) => p.id)

  const { data: submissions } = await admin
    .from('rating_submissions')
    .select('rated_player_id, rating, feedback')
    .in('rated_player_id', playerIds)
    .eq('status', 'approved') as {
      data: Array<{ rated_player_id: string; rating: number; feedback: string | null }> | null
      error: unknown
    }

  const submissionsByPlayer = new Map<string, { ratings: number[]; feedbacks: string[] }>()
  for (const s of submissions ?? []) {
    if (!submissionsByPlayer.has(s.rated_player_id)) {
      submissionsByPlayer.set(s.rated_player_id, { ratings: [], feedbacks: [] })
    }
    const entry = submissionsByPlayer.get(s.rated_player_id)!
    entry.ratings.push(s.rating)
    if (s.feedback) entry.feedbacks.push(s.feedback)
  }

  const promptPlayers = players.map((p) => ({
    player_id: p.id,
    player_name: p.sheet_name,
    current_rating: p.current_rating,
    approved_ratings: submissionsByPlayer.get(p.id)?.ratings ?? [],
    feedback_texts: submissionsByPlayer.get(p.id)?.feedbacks ?? [],
  }))

  const prompt = buildAiRatingPrompt(promptPlayers)

  const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY })
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0].message.content ?? '{}'
  let ratings: Array<{ player_id: string; suggested_rating: number }> = []
  try {
    const parsed = JSON.parse(raw)
    ratings = parsed.ratings ?? []
  } catch {
    return Response.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  const ratingMap = new Map(ratings.map((r) => [r.player_id, r.suggested_rating]))

  const result = players.map((p) => ({
    player_id: p.id,
    player_name: p.sheet_name,
    current_rating: p.current_rating,
    suggested_rating: ratingMap.get(p.id) ?? p.current_rating ?? 0,
    pending_count: submissionsByPlayer.get(p.id)?.ratings.length ?? 0,
  }))

  return Response.json({ players: result })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/ai-rating/process/route.ts
git commit -m "feat: add AI rating process API route"
```

---

### Task 7: Create the AI apply API route

**Files:**
- Create: `app/api/admin/ai-rating/apply/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'

const schema = z.object({
  updates: z.array(
    z.object({
      player_id: z.string().uuid(),
      new_rating: z.number().min(0).max(10),
    })
  ),
})

export async function POST(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { updates } = parsed.data
  const admin = createServiceClient()
  const now = new Date().toISOString()

  for (const update of updates) {
    const { data: player } = await admin
      .from('players')
      .select('current_rating')
      .eq('id', update.player_id)
      .single() as { data: { current_rating: number | null } | null; error: unknown }

    await (admin.from('players') as any)
      .update({ current_rating: update.new_rating, updated_at: now })
      .eq('id', update.player_id)

    await (admin.from('rating_submissions') as any)
      .update({ status: 'processed' })
      .eq('rated_player_id', update.player_id)
      .eq('status', 'approved')

    await admin.from('rating_history').insert({
      player_id: update.player_id,
      rating: update.new_rating,
      previous_rating: player?.current_rating ?? null,
      changed_by: session.userId,
      notes: 'AI rating update',
    } as any)
  }

  return Response.json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/ai-rating/apply/route.ts
git commit -m "feat: add AI rating apply API route"
```

---

### Task 8: Create the admin page + client component

**Files:**
- Create: `app/(admin)/admin/ai-rating/page.tsx`
- Create: `app/(admin)/admin/ai-rating/AiRatingClient.tsx`

- [ ] **Step 1: Create the server component `page.tsx`**

```typescript
import { createServiceClient } from '@/lib/supabase/server'
import { AiRatingClient } from './AiRatingClient'

export type PlayerRow = {
  player_id: string
  player_name: string
  current_rating: number | null
  pending_count: number
}

export default async function AiRatingPage() {
  const admin = createServiceClient()

  const { data: players } = await admin
    .from('players')
    .select('id, sheet_name, current_rating')
    .order('sheet_name') as {
      data: Array<{ id: string; sheet_name: string; current_rating: number | null }> | null
      error: unknown
    }

  const playerList = players ?? []
  const playerIds = playerList.map((p) => p.id)

  let pendingCounts = new Map<string, number>()
  if (playerIds.length > 0) {
    const { data: submissions } = await admin
      .from('rating_submissions')
      .select('rated_player_id')
      .in('rated_player_id', playerIds)
      .eq('status', 'approved') as {
        data: Array<{ rated_player_id: string }> | null
        error: unknown
      }
    for (const s of submissions ?? []) {
      pendingCounts.set(s.rated_player_id, (pendingCounts.get(s.rated_player_id) ?? 0) + 1)
    }
  }

  const rows: PlayerRow[] = playerList.map((p) => ({
    player_id: p.id,
    player_name: p.sheet_name,
    current_rating: p.current_rating,
    pending_count: pendingCounts.get(p.id) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fcda-navy">AI Rating</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Actualizar avaliações dos jogadores com IA
        </p>
      </div>
      <AiRatingClient players={rows} />
    </div>
  )
}
```

- [ ] **Step 2: Create the client component `AiRatingClient.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { PlayerRow } from './page'

type Suggestion = {
  player_id: string
  player_name: string
  current_rating: number | null
  suggested_rating: number
  pending_count: number
}

export function AiRatingClient({ players }: { players: PlayerRow[] }) {
  const [state, setState] = useState<'idle' | 'loading' | 'confirm'>('idle')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [edited, setEdited] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  const pendingCount = players.filter((p) => p.pending_count > 0).length

  async function handleProcess() {
    setError(null)
    setState('loading')
    const res = await fetch('/api/admin/ai-rating/process', { method: 'POST' })
    if (!res.ok) {
      setError('Falha ao contactar a IA. Tenta novamente.')
      setState('idle')
      return
    }
    const data = await res.json()
    const sug: Suggestion[] = data.players
    setSuggestions(sug)
    setEdited(Object.fromEntries(sug.map((s: Suggestion) => [s.player_id, s.suggested_rating])))
    setState('confirm')
  }

  async function handleApply() {
    setError(null)
    const updates = suggestions.map((s) => ({
      player_id: s.player_id,
      new_rating: Math.round((edited[s.player_id] ?? s.suggested_rating) * 10) / 10,
    }))
    const res = await fetch('/api/admin/ai-rating/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })
    if (!res.ok) {
      setError('Falha ao aplicar avaliações. Tenta novamente.')
      return
    }
    setState('idle')
    setSuggestions([])
    setEdited({})
  }

  const displayRows: Array<Suggestion | PlayerRow> =
    state === 'confirm' ? suggestions : players

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pendingCount} jogador{pendingCount !== 1 ? 'es' : ''} com avaliações por processar
        </p>
        {state === 'idle' && (
          <button
            onClick={handleProcess}
            disabled={pendingCount === 0}
            className="px-4 py-2 bg-fcda-gold text-fcda-navy text-sm font-semibold rounded disabled:opacity-40"
          >
            Processar com IA
          </button>
        )}
        {state === 'loading' && (
          <span className="text-sm text-muted-foreground animate-pulse">A perguntar à IA…</span>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-4 font-medium">Jogador</th>
              <th className="py-2 pr-4 font-medium text-right">Avaliação atual</th>
              <th className="py-2 pr-4 font-medium text-right">Pendentes</th>
              {state === 'confirm' && (
                <>
                  <th className="py-2 pr-4 font-medium text-right">Sugestão IA</th>
                  <th className="py-2 font-medium text-right">Variação</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const hasPending = row.pending_count > 0
              const current = row.current_rating ?? 0
              const editedVal = state === 'confirm' ? (edited[row.player_id] ?? (row as Suggestion).suggested_rating) : null
              const delta = editedVal !== null ? editedVal - current : null

              return (
                <tr
                  key={row.player_id}
                  className={`border-b border-border ${!hasPending && state !== 'confirm' ? 'opacity-40' : ''}`}
                >
                  <td className="py-2 pr-4">{row.player_name}</td>
                  <td className="py-2 pr-4 text-right">
                    {row.current_rating != null ? row.current_rating.toFixed(1) : '—'}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {hasPending ? row.pending_count : '—'}
                  </td>
                  {state === 'confirm' && (
                    <>
                      <td className="py-2 pr-4 text-right">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          value={editedVal ?? 0}
                          onChange={(e) =>
                            setEdited((prev) => ({
                              ...prev,
                              [row.player_id]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-16 text-right border border-border rounded px-1 py-0.5 bg-background"
                        />
                      </td>
                      <td
                        className={`py-2 text-right font-medium ${
                          delta === null || delta === 0
                            ? 'text-muted-foreground'
                            : delta > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {delta === null || delta === 0
                          ? '—'
                          : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {state === 'confirm' && (
        <div className="flex gap-3">
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-fcda-gold text-fcda-navy text-sm font-semibold rounded"
          >
            Aplicar todas
          </button>
          <button
            onClick={() => { setState('idle'); setEdited({}); setSuggestions([]) }}
            className="px-4 py-2 border border-border text-sm rounded"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/admin/ai-rating/page.tsx app/(admin)/admin/ai-rating/AiRatingClient.tsx
git commit -m "feat: add AI Rating admin page"
```

---

### Task 9: Add "AI Rating" to AdminNav

**Files:**
- Modify: `components/admin/AdminNav.tsx`

- [ ] **Step 1: Add the new tab entry**

In `components/admin/AdminNav.tsx`, add `{ href: '/admin/ai-rating', label: 'AI Rating' }` to the `tabs` array after the `coach` entry:

```typescript
const tabs = [
  { href: '/admin/users', label: t('admin.users') },
  { href: '/admin/players', label: t('admin.players') },
  { href: '/admin/ratings', label: t('admin.ratings') },
  { href: '/admin/feedback', label: t('admin.feedback') },
  { href: '/admin/coach', label: t('admin.coach') },
  { href: '/admin/ai-rating', label: 'AI Rating' },
]
```

- [ ] **Step 2: Verify TypeScript compiles and start dev server to check nav**

```bash
npx tsc --noEmit
```

Expected: no errors. Then start the dev server and navigate to `/admin` to confirm the "AI Rating" tab appears and links correctly.

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminNav.tsx
git commit -m "feat: add AI Rating tab to admin nav"
```

---

## Manual Testing Checklist

After all tasks are complete, verify the following flows in the browser:

1. **Approval no longer updates rating:** Approve a pending rating batch → check player in Players tab → `current_rating` should be unchanged.
2. **AI Rating tab idle state:** Navigate to `/admin/ai-rating` → see player list with pending counts → "Processar com IA" button enabled only when pendingCount > 0.
3. **AI call:** Click "Processar com IA" → spinner appears → table updates with AI Suggested column and editable inputs.
4. **Edit and apply:** Change one suggested rating → click "Aplicar todas" → navigate to Players tab → confirm updated rating reflects the edited value.
5. **Submissions marked processed:** After apply, navigate back to AI Rating tab → pending counts should be 0 for processed players.
6. **Cancel:** Click "Processar com IA" → get suggestions → click "Cancelar" → table returns to idle state, no changes saved.

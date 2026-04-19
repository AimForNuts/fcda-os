# Player Self-Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in player edit their own `sheet_name`, `shirt_number`, and `preferred_positions` from a dedicated `/profile` page.

**Architecture:** A new `PATCH /api/players/me` route finds the caller's linked player via `profile_id` and applies the update. The existing `/profile` page (currently a redirect) is replaced with a server component that fetches the player and renders a `ProfileForm` client component.

**Tech Stack:** Next.js 15 App Router, Supabase (service client), Zod, React `useState`

---

### Task 1: API route — `PATCH /api/players/me`

**Files:**
- Create: `app/api/players/me/route.ts`

- [ ] **Step 1: Create `app/api/players/me/route.ts`**

```ts
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'

const POSITIONS = ['GK', 'CB', 'CM', 'W', 'ST'] as const

const schema = z.object({
  sheet_name: z.string().min(1).max(100),
  shirt_number: z.number().int().min(1).max(99).nullable().optional(),
  preferred_positions: z.array(z.enum(POSITIONS)).max(5).optional(),
})

export async function PATCH(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const admin = createServiceClient()

  const { data: player } = await admin
    .from('players')
    .select('id')
    .eq('profile_id', session.userId)
    .single() as { data: { id: string } | null; error: unknown }

  if (!player) return Response.json({ error: 'No linked player' }, { status: 404 })

  const { error } = await admin
    .from('players')
    .update({
      sheet_name: parsed.data.sheet_name,
      shirt_number: parsed.data.shirt_number ?? null,
      preferred_positions: parsed.data.preferred_positions ?? [],
    })
    .eq('id', player.id)

  if (error) return Response.json({ error: 'Failed to update' }, { status: 500 })

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
git add app/api/players/me/route.ts
git commit -m "feat: add PATCH /api/players/me for player self-update"
```

---

### Task 2: `ProfileForm` component

**Files:**
- Create: `components/profile/ProfileForm.tsx`

- [ ] **Step 1: Create `components/profile/ProfileForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

const POSITIONS = ['GK', 'CB', 'CM', 'W', 'ST']

type Props = {
  sheetName: string
  shirtNumber: number | null
  preferredPositions: string[]
}

export function ProfileForm({ sheetName, shirtNumber, preferredPositions }: Props) {
  const [name, setName] = useState(sheetName)
  const [shirt, setShirt] = useState<string>(shirtNumber != null ? String(shirtNumber) : '')
  const [positions, setPositions] = useState<string[]>(preferredPositions)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSaved(false)
    setError(null)

    const parsed = parseInt(shirt, 10)
    const body = {
      sheet_name: name.trim(),
      shirt_number: shirt.trim() === '' ? null : isNaN(parsed) ? null : parsed,
      preferred_positions: positions,
    }

    const res = await fetch('/api/players/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSubmitting(false)
    if (res.ok) {
      setSaved(true)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erro ao guardar.')
    }
  }

  function togglePosition(pos: string) {
    setPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Número de camisola</label>
        <input
          type="number"
          value={shirt}
          onChange={(e) => setShirt(e.target.value)}
          min={1}
          max={99}
          className="w-24 rounded border border-input bg-background px-3 py-2 text-sm"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Posições preferidas</label>
        <div className="flex gap-2 flex-wrap">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => togglePosition(pos)}
              disabled={submitting}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                positions.includes(pos)
                  ? 'bg-fcda-navy text-white border-fcda-navy'
                  : 'border-input text-muted-foreground hover:bg-muted'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-600">Guardado.</p>}

      <Button type="submit" disabled={submitting || name.trim() === ''}>
        {submitting ? 'A guardar...' : 'Guardar'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/profile/ProfileForm.tsx
git commit -m "feat: add ProfileForm component for player self-edit"
```

---

### Task 3: Profile page

**Files:**
- Modify: `app/(app)/profile/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { ProfileForm } from '@/components/profile/ProfileForm'

export const metadata = { title: 'O meu perfil — FCDA' }

export default async function ProfilePage() {
  const session = await fetchSessionContext()
  if (!session) redirect('/auth/login')

  const admin = createServiceClient()
  const { data: player } = await admin
    .from('players')
    .select('sheet_name, shirt_number, preferred_positions')
    .eq('profile_id', session.userId)
    .single() as {
      data: {
        sheet_name: string
        shirt_number: number | null
        preferred_positions: string[]
      } | null
      error: unknown
    }

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-fcda-navy mb-6">O meu perfil</h1>
      {player ? (
        <ProfileForm
          sheetName={player.sheet_name}
          shirtNumber={player.shirt_number}
          preferredPositions={player.preferred_positions ?? []}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          A tua conta ainda não está ligada a um jogador. Contacta um administrador.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run test suite**

```bash
npx vitest run
```

Expected: all 81 tests pass.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/profile/page.tsx"
git commit -m "feat: replace profile redirect with self-edit page"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| `PATCH /api/players/me` — auth, linked player check, Zod validation | Task 1 |
| Updates `sheet_name`, `shirt_number`, `preferred_positions` | Task 1 |
| 401/404/422/200 responses | Task 1 |
| `ProfileForm` — name input, shirt number input, position toggles | Task 2 |
| Submit disabled while submitting or name empty | Task 2 |
| Success "Guardado." / error message inline | Task 2 |
| Profile page replaces redirect with server component | Task 3 |
| Unlinked player message | Task 3 |

**Type consistency:** `ProfileForm` props (`sheetName`, `shirtNumber`, `preferredPositions`) match what the page passes in Task 3. API body shape in `handleSubmit` matches the Zod schema in Task 1.

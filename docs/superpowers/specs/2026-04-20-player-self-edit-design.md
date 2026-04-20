# Player Self-Edit Design

## Goal

Let a logged-in player edit their own `sheet_name`, `shirt_number`, and `preferred_positions` from a dedicated `/profile` page.

---

## Current State

- `app/(app)/profile/page.tsx` is a redirect — it finds the player linked to the session and forwards to `/players/[id]`
- All player edits are admin-only via `PATCH /api/admin/players/[id]`
- No self-service edit route exists

---

## Architecture

| File | Change |
|------|--------|
| `app/api/players/me/route.ts` | New `PATCH` endpoint for self-update |
| `app/(app)/profile/page.tsx` | Replace redirect with server component + form |
| `components/profile/ProfileForm.tsx` | New client component — edit form |

---

## API (`app/api/players/me/route.ts`)

`PATCH` only. Auth required; player must have a linked player record.

### Auth flow

1. `fetchSessionContext()` — 401 if no session
2. Query `players` where `profile_id = session.userId` — 404 if no linked player
3. Validate body with Zod
4. Update the player record using `createServiceClient()`

### Zod schema

```ts
const schema = z.object({
  sheet_name: z.string().min(1).max(100),
  shirt_number: z.number().int().min(1).max(99).nullable().optional(),
  preferred_positions: z.array(z.enum(['GK', 'CB', 'CM', 'W', 'ST'])).max(5).optional(),
})
```

### Response

- `200 { ok: true }` on success
- `401` — not authenticated
- `404` — no linked player
- `422` — validation error

No audit log — self-service, low-stakes.

---

## Page (`app/(app)/profile/page.tsx`)

Server component. Replaces the current redirect entirely.

1. `fetchSessionContext()` — redirect to `/auth/login` if no session
2. Query `players` where `profile_id = session.userId`
3. If no linked player: render a static message — "A tua conta ainda não está ligada a um jogador. Contacta um administrador."
4. If linked: render `<ProfileForm>` with current values

```tsx
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
```

---

## `ProfileForm` Component (`components/profile/ProfileForm.tsx`)

`'use client'`. Props:

```ts
type Props = {
  sheetName: string
  shirtNumber: number | null
  preferredPositions: string[]
}
```

### State

```ts
const [name, setName] = useState(sheetName)
const [shirt, setShirt] = useState<string>(shirtNumber != null ? String(shirtNumber) : '')
const [positions, setPositions] = useState<string[]>(preferredPositions)
const [submitting, setSubmitting] = useState(false)
const [saved, setSaved] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### Positions toggle

Five pill buttons, one per position. Clicking a selected position deselects it; clicking an unselected one selects it.

```tsx
const POSITIONS = ['GK', 'CB', 'CM', 'W', 'ST']

{POSITIONS.map((pos) => (
  <button
    key={pos}
    type="button"
    onClick={() =>
      setPositions((prev) =>
        prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
      )
    }
    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
      positions.includes(pos)
        ? 'bg-fcda-navy text-white border-fcda-navy'
        : 'border-input text-muted-foreground hover:bg-muted'
    }`}
  >
    {pos}
  </button>
))}
```

### Submit

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setSubmitting(true)
  setSaved(false)
  setError(null)

  const body: Record<string, unknown> = { sheet_name: name.trim() }
  const parsed = parseInt(shirt, 10)
  body.shirt_number = shirt.trim() === '' ? null : isNaN(parsed) ? null : parsed
  body.preferred_positions = positions

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
```

### Layout

```
Nome
[text input]

Número de camisola
[number input 1-99]

Posições preferidas
[GK] [CB] [CM] [W] [ST]

[Guardar]   ← disabled while submitting

"Guardado."  ← shown briefly on success
"Erro..."    ← shown on failure
```

Submit button is disabled while `submitting` or when `name.trim()` is empty.

---

## No Tests Required

The form follows identical patterns to existing forms (RatingForm, LineupManager). No new branching logic.

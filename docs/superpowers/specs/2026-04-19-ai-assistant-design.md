# AI Assistant Design

## Goal

Give mods a page that generates a ready-to-paste ChatGPT prompt for balanced team selection, using the roster and ratings from a chosen scheduled game.

---

## Current State

- `players` has `current_rating` (set via admin override or rating submission approval) but no position data
- `game_players` links players to games with `team ('a'|'b'|null)` but no positions
- The mod section has no sub-navigation — one navbar link points to `/mod/games/new`

---

## Approach

Single-phase delivery: add `preferred_positions` to `players`, surface a position chip editor in the admin Players page, and build the AI Assistant page under `/mod/ai-assistant`. Navigation gets a horizontal sub-nav in the mod layout.

---

## Architecture

| File | Change |
|------|--------|
| `supabase/migrations/20260419000001_player_positions.sql` | Add `preferred_positions text[]` to `players` |
| `app/api/admin/players/[id]/route.ts` | Accept `preferred_positions` in Zod schema |
| `app/(admin)/admin/players/page.tsx` | Add `preferred_positions` to `PlayerRow` and select query |
| `app/(admin)/admin/players/PlayerTable.tsx` | Inline position chip editor |
| `app/(mod)/layout.tsx` | Add horizontal sub-nav (Games / AI Assistant) |
| `app/(mod)/mod/ai-assistant/page.tsx` | New server component — fetches scheduled games |
| `app/(mod)/mod/ai-assistant/AiAssistantClient.tsx` | New client component — game selector + prompt generator |

---

## Data Layer

### Migration

```sql
ALTER TABLE players
  ADD COLUMN preferred_positions text[] NOT NULL DEFAULT '{}';

ALTER TABLE players
  ADD CONSTRAINT players_positions_check
  CHECK (preferred_positions <@ ARRAY['GK','CB','CM','W','ST']::text[]);
```

### `PlayerRow` type update

Add to existing type in `page.tsx`:
```ts
preferred_positions: string[]
```

### API schema extension

```ts
preferred_positions: z.array(z.enum(['GK', 'CB', 'CM', 'W', 'ST'])).optional(),
```

---

## Admin Position Editor

### Normal state

Shows compact position chips below the existing rating display:

```
[GK] [CB]
```

Or `No positions` in muted text if empty. Clicking the display enters edit mode.

### Edit state

All 5 chips rendered as toggles — filled/navy = selected, outlined = not selected:

```
[GK] [CB] [CM] [W] [ST]   [Save] [Cancel]
```

Enter key is not applicable here (toggle UI). Escape cancels.

### State management

Add to `PlayerTable`:
- `editingPositionsId: string | null` — which player's positions are being edited (independent of `editingId` and `editingRatingId`)
- `positionsInput: Record<string, string[]>` — current selected positions per player

Save calls `patchPlayer(playerId, 'positions', { preferred_positions: selectedArray })` and updates the row optimistically on success.

---

## AI Assistant Page

### Route

`/mod/ai-assistant`

### Server component (`page.tsx`)

Fetches scheduled games server-side:

```ts
const { data: games } = await admin
  .from('games')
  .select('id, date, location')
  .eq('status', 'scheduled')
  .order('date', { ascending: true })
```

Passes `games` to `AiAssistantClient`.

### Client component (`AiAssistantClient.tsx`)

**Game selector** — `<select>` listing games as `"DD MMM YYYY — Location"`. Defaults to the first (soonest) game. On change, fetches the roster for the selected game:

```ts
const { data } = await supabase
  .from('game_players')
  .select('player_id, players(sheet_name, current_rating, preferred_positions)')
  .eq('game_id', selectedGameId)
```

**Prompt generation** — client-side, no API call. Builds string:

```
Give me next game teams

Players:
- João (GK, CB) - Rating: 7.50
- Pedro (CM) - Rating: 1
- Miguel (no position) - Rating: 5.00
```

Rating format: two decimal places if not a round number default; `1` (no decimals) when defaulted. Position: comma-joined array, or `no position` if empty.

**Copy button** — copies generated prompt to clipboard. Shows `Copied!` for 2 seconds, then resets.

**Layout** — game selector at top, player list below (read-only display), prompt textarea below that, Copy button underneath.

---

## Navigation

The mod layout (`app/(mod)/layout.tsx`) gets a horizontal sub-nav rendered below the `<Navbar>` and above `<main>`:

```tsx
<nav className="border-b bg-background">
  <div className="container max-w-screen-xl mx-auto px-4 flex gap-6 text-sm">
    <Link href="/mod/games/new" ...>Games</Link>
    <Link href="/mod/ai-assistant" ...>AI Assistant</Link>
  </div>
</nav>
```

Active tab uses `usePathname()` for highlight — requires a small client wrapper component (`ModSubNav.tsx`).

---

## No Tests Required

The prompt generation is pure string formatting with no branching logic worth unit testing. The position editor follows the identical pattern as the existing rating editor.

# Stats Page Redesign

## Goal

Replace the single rating column on the Stats page with per-player game statistics (Total, W, D, L, Pts), remove rating from display, and add a toggle between all-games and competitive-only modes with client-side column sorting.

---

## Current State

- `app/(public)/stats/page.tsx` fetches from `players_public`, orders by `current_rating` desc
- `components/stats/StatsTable.tsx` is a server component showing only Jogador + Nota columns
- No stats view exists in Supabase

---

## Architecture

| File | Change |
|------|--------|
| `supabase/migrations/20260419000002_player_stats_view.sql` | New view computing per-player stats |
| `types/index.ts` | Add `PlayerStats` type |
| `app/(public)/stats/page.tsx` | Query `player_stats` view; no server-side sort |
| `components/stats/StatsTable.tsx` | Convert to `'use client'`; add toggle + sort state |

---

## Data Layer

### Migration

```sql
CREATE OR REPLACE VIEW public.player_stats AS
SELECT
  pp.id,
  pp.display_name,
  pp.shirt_number,
  pp.profile_id,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
  ), 0) AS total_all,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND g.counts_for_stats AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
  ), 0) AS total_comp,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
      AND ((gp.team = 'a' AND g.score_a > g.score_b) OR (gp.team = 'b' AND g.score_b > g.score_a))
  ), 0) AS wins_all,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
      AND g.score_a = g.score_b
  ), 0) AS draws_all,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
      AND ((gp.team = 'a' AND g.score_a < g.score_b) OR (gp.team = 'b' AND g.score_b < g.score_a))
  ), 0) AS losses_all,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND g.counts_for_stats AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
      AND ((gp.team = 'a' AND g.score_a > g.score_b) OR (gp.team = 'b' AND g.score_b > g.score_a))
  ), 0) AS wins_comp,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND g.counts_for_stats AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
      AND g.score_a = g.score_b
  ), 0) AS draws_comp,
  COALESCE(COUNT(gp.game_id) FILTER (
    WHERE g.status = 'finished' AND g.counts_for_stats AND gp.team IS NOT NULL
      AND g.score_a IS NOT NULL AND g.score_b IS NOT NULL
      AND ((gp.team = 'a' AND g.score_a < g.score_b) OR (gp.team = 'b' AND g.score_b < g.score_a))
  ), 0) AS losses_comp
FROM public.players_public pp
LEFT JOIN public.game_players gp ON gp.player_id = pp.id
LEFT JOIN public.games g ON g.id = gp.game_id
GROUP BY pp.id, pp.display_name, pp.shirt_number, pp.profile_id;

GRANT SELECT ON public.player_stats TO anon, authenticated;
```

Win condition: player's team score > opponent score. Draw: equal scores. Loss: player's team score < opponent score. Games with null scores are excluded. `COALESCE(..., 0)` ensures players with no finished games show `0`.

### `PlayerStats` type (add to `types/index.ts`)

```ts
export type PlayerStats = {
  id: string
  display_name: string
  shirt_number: number | null
  profile_id: string | null
  total_all: number
  total_comp: number
  wins_all: number
  draws_all: number
  losses_all: number
  wins_comp: number
  draws_comp: number
  losses_comp: number
}
```

Points are not stored — computed client-side as `3 * wins + draws`.

---

## Page (`app/(public)/stats/page.tsx`)

Queries `player_stats` instead of `players_public`. No `.order()` — sorting is client-side. Passes `PlayerStats[]` to `StatsTable`.

```ts
const { data: players } = await supabase
  .from('player_stats')
  .select('id, display_name, shirt_number, profile_id, total_all, total_comp, wins_all, draws_all, losses_all, wins_comp, draws_comp, losses_comp')
```

---

## StatsTable Component

Converted to `'use client'`. Receives `players: PlayerStats[]` and `isAnonymised: boolean`.

### State

```ts
const [mode, setMode] = useState<'all' | 'competitive'>('all')
type SortCol = 'total' | 'wins' | 'draws' | 'losses' | 'points'
const [sortCol, setSortCol] = useState<SortCol>('total')
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
```

### Derived rows

```ts
const rows = useMemo(() => {
  return [...players]
    .map((p) => ({
      ...p,
      total: mode === 'all' ? p.total_all : p.total_comp,
      wins: mode === 'all' ? p.wins_all : p.wins_comp,
      draws: mode === 'all' ? p.draws_all : p.draws_comp,
      losses: mode === 'all' ? p.losses_all : p.losses_comp,
      points: 3 * (mode === 'all' ? p.wins_all : p.wins_comp) + (mode === 'all' ? p.draws_all : p.draws_comp),
    }))
    .sort((a, b) => {
      const diff = a[sortCol] - b[sortCol]
      return sortDir === 'desc' ? -diff : diff
    })
}, [players, mode, sortCol, sortDir])
```

### Sort handler

```ts
function handleSort(col: SortCol) {
  if (col === sortCol) {
    setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
  } else {
    setSortCol(col)
    setSortDir('desc')
  }
}
```

### Toggle

Two pill buttons above the table:

```tsx
<div className="flex gap-2 mb-4">
  <button
    onClick={() => setMode('all')}
    className={mode === 'all' ? 'bg-fcda-navy text-white ...' : 'border ...'}
  >Todos</button>
  <button
    onClick={() => setMode('competitive')}
    className={mode === 'competitive' ? 'bg-fcda-navy text-white ...' : 'border ...'}
  >Competitivos</button>
</div>
```

### Column headers

Each sortable header renders an up/down arrow indicator when active:

```tsx
function SortHeader({ col, label }: { col: SortCol; label: string }) {
  const active = sortCol === col
  return (
    <th onClick={() => handleSort(col)} className="cursor-pointer select-none px-4 py-2.5 text-right ...">
      {label}
      {active && (sortDir === 'desc' ? ' ↓' : ' ↑')}
    </th>
  )
}
```

### Columns

| Header | Value |
|--------|-------|
| Jogador | shirt_number + display_name (link if not anonymised) |
| Total | `row.total` |
| V | `row.wins` |
| E | `row.draws` |
| D | `row.losses` |
| Pts | `row.points` |

All columns except Jogador are sortable. All numeric cells show `0` (not `–`).

---

## No Tests Required

Pure derived computation with no branching edge cases worth unit testing.

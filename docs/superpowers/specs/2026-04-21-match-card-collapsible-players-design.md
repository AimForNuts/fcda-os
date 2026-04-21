# Match Card: Collapsible Player List + Player Number + Name Normalisation

## Summary

Three related improvements to how player lineups are displayed on the `/matches` page.

## Features

### 1. Collapsible Player List

- `MatchCard` becomes a `'use client'` component.
- A `collapsed` boolean state initialises to `true` when `game.status === 'finished'`, `false` otherwise.
- A chevron icon button (ChevronDown / ChevronUp) is placed in the top-right of the card header, visually inline with the score and badge.
- The button calls `e.stopPropagation()` and `e.preventDefault()` so it toggles the list without triggering the wrapping `<Link>` navigation.
- The player list section (both the `hasTeams` and `hasUnassigned` blocks) is hidden when `collapsed === true`.

### 2. Player Shirt Number

- `LineupSummary` player entry type gains `shirt_number: number | null`.
- The `players_public` select in `app/(public)/matches/page.tsx` adds `shirt_number` to the fetched fields.
- Each `identity` object constructed in the server component includes `shirt_number`.
- `MatchCard` passes `shirtNumber={player.shirt_number}` to each `PlayerIdentity` call.
- `PlayerIdentity` already renders `#N` when `shirtNumber` is non-null — no changes needed to that component.

### 3. Name Normalisation (Title Case)

- A `toTitleCase(name: string): string` helper is added inside `MatchCard.tsx` (not exported; local utility).
- It splits on whitespace, uppercases the first character of each word, lowercases the rest, then rejoins.
- Applied to `player.name` at the point it is passed as `name` to `PlayerIdentity` inside `MatchCard`.
- The raw `display_name` value from the DB is unchanged; normalisation is presentation-only.

## Files Changed

| File | Change |
|------|--------|
| `components/matches/MatchCard.tsx` | Add `'use client'`, collapsed state, chevron toggle, `toTitleCase` helper, pass `shirtNumber` |
| `app/(public)/matches/page.tsx` | Add `shirt_number` to select + `LineupSummary` identity construction |
| `types/` (via `MatchCard.tsx`) | `LineupSummary` player entry gains `shirt_number: number \| null` |

## Out of Scope

- Persisting collapsed state across page loads.
- Animating the collapse transition.
- Applying title-case normalisation anywhere other than `MatchCard`.

# Player Profiles Design

## Goal

Add a public player directory and individual player profile pages, accessible to all registered users.

## Routes

- `/players` — directory listing all players
- `/players/[id]` — individual player profile

No `/profile` route. Users find their own profile the same way as any other: by navigating to `/players/[id]` where the player is linked to their account.

## Access Control

Follows the existing `players_public` view pattern:

- **Unauthenticated** → redirect to `/auth/login?redirectTo=<current path>`
- **Pending (not approved)** → anonymized display names (`players_public` view handles this automatically)
- **Approved** → full names and all data

## Pages

### `/players` — Player Directory

Server Component. Fetches from the `players_public` view (respects anonymization).

Displayed columns:
- Shirt number
- Display name (linked to `/players/[id]`)
- Current rating

Sorted by shirt number ascending (nulls last), then name alphabetically.

Empty state shown when no players exist.

### `/players/[id]` — Player Profile

Server Component. Returns `notFound()` if player does not exist.

Three sections, conditionally rendered:

**Basic Info** (all authenticated users)
- Display name
- Shirt number
- Aliases list (from `player_aliases`)

**Stats Summary** (all authenticated users)
- Current rating (`players.current_rating`)
- Matches played: count of `game_players` rows where the joined game has `status = 'finished'` AND `counts_for_stats = true`

**Match History** (only when logged-in user's `profile_id` matches this player's `profile_id`)
- Chronological list of finished, stats-counting games the player appeared in
- Per row: date, location, team (A or B), final score (score_a – score_b), and their per-game rating
- Per-game rating sourced from `rating_submissions` where `rated_player_id = player.id`, `game_id = game.id`, and `status = 'approved'`; shown as `—` if no approved submission exists

## Navigation Updates

### Nav bar
Add "Jogadores" item between Jogos and Estatísticas.
- i18n key: `nav.players` → `"Jogadores"` (pt-PT), `"Players"` (en)

### Stats page
Player name cells become `<Link href="/players/{player.id}">` for approved users. Anonymized players (no real name visible) are not linked — there is no meaningful profile to navigate to for unauthenticated/pending viewers.

### Match lineup
Player names in match lineups become links to `/players/[id]` under the same condition (approved users only).

## Data Sources

| Data | Source |
|------|--------|
| Player list | `players_public` view |
| Player detail | `players` table (direct, for approved users; `players_public` for others) |
| Aliases | `player_aliases` table |
| Matches played count | `game_players` JOIN `games` |
| Match history rows | `game_players` JOIN `games` |
| Per-game rating | `rating_submissions` (status = 'approved') |

## Architecture

All pages are Server Components (Next.js App Router). No client components needed — data is static between game events. Auth check runs server-side via `createClient()` → `getUser()`.

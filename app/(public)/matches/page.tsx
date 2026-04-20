import { createClient } from '@/lib/supabase/server'
import { MatchCard, type LineupSummary } from '@/components/matches/MatchCard'
import { sortGames } from '@/lib/games/sort'
import type { Game } from '@/types'

export const metadata = { title: 'Jogos — FCDA' }

export default async function MatchesPage() {
  const supabase = await createClient()

  const { data: games } = (await supabase.from('games').select('*')) as {
    data: Game[] | null
    error: unknown
  }

  const gameList = sortGames(games ?? [])

  // Batch-fetch all game_players and player names for the listed games
  const lineupsByGame = new Map<string, LineupSummary>()

  if (gameList.length > 0) {
    const gameIds = gameList.map(g => g.id)

    const { data: allGamePlayers } = (await supabase
      .from('game_players')
      .select('game_id, player_id, team')
      .in('game_id', gameIds)) as {
      data: Array<{
        game_id: string
        player_id: string
        team: 'a' | 'b' | null
      }> | null
      error: unknown
    }

    const playerIds = [
      ...new Set((allGamePlayers ?? []).map(gp => gp.player_id)),
    ]

    const playerNames: Map<string, string> = new Map()
    if (playerIds.length > 0) {
      const { data: players } = (await supabase
        .from('players_public')
        .select('id, display_name')
        .in('id', playerIds)) as {
        data: Array<{ id: string; display_name: string }> | null
        error: unknown
      }
      for (const p of players ?? []) {
        playerNames.set(p.id, p.display_name)
      }
    }

    for (const gp of allGamePlayers ?? []) {
      if (!lineupsByGame.has(gp.game_id)) {
        lineupsByGame.set(gp.game_id, { teamA: [], teamB: [], unassigned: [] })
      }
      const name = playerNames.get(gp.player_id)
      if (!name) continue
      const entry = lineupsByGame.get(gp.game_id)!
      if (gp.team === 'a') entry.teamA.push(name)
      else if (gp.team === 'b') entry.teamB.push(name)
      else entry.unassigned.push(name)
    }
  }

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-fcda-navy mb-6">Jogos</h1>
      {!gameList.length ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há jogos registados.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {gameList.map(g => (
            <MatchCard key={g.id} game={g} lineup={lineupsByGame.get(g.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

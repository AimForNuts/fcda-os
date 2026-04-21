import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { MatchCard, type LineupSummary } from '@/components/matches/MatchCard'
import { MatchesDateFilter } from '@/components/matches/MatchesDateFilter'
import { filterGamesByDateRange } from '@/lib/games/filter-by-date-range'
import { sortGames } from '@/lib/games/sort'
import type { Game } from '@/types'

export const metadata = { title: 'Jogos — FCDA' }

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { from, to } = await searchParams
  const supabase = await createClient()
  const session = await fetchSessionContext()
  const isApproved = session?.profile.approved ?? false

  const { data: games } = await supabase
    .from('games')
    .select('*') as { data: Game[] | null; error: unknown }

  const sorted = sortGames(games ?? [])
  const gameList = filterGamesByDateRange(sorted, from, to)
  const hasDateFilter = Boolean(from || to)

  // Batch-fetch all game_players and player names for the listed games
  const lineupsByGame = new Map<string, LineupSummary>()

  if (gameList.length > 0) {
    const gameIds = gameList.map((g) => g.id)

    const { data: allGamePlayers } = await supabase
      .from('game_players')
      .select('game_id, player_id, team')
      .in('game_id', gameIds) as {
        data: Array<{ game_id: string; player_id: string; team: 'a' | 'b' | null }> | null
        error: unknown
      }

    const playerIds = [...new Set((allGamePlayers ?? []).map((gp) => gp.player_id))]

    const playersById = new Map<string, { id: string; display_name: string; avatar_url: string | null; shirt_number: number | null }>()
    if (playerIds.length > 0) {
      const { data: players } = await supabase
        .from('players_public')
        .select('id, display_name, avatar_path, shirt_number')
        .in('id', playerIds) as {
          data: Array<{ id: string; display_name: string; avatar_path: string | null; shirt_number: number | null }> | null
          error: unknown
        }
      for (const p of await signPlayerAvatarRecords(players ?? [], isApproved)) {
        playersById.set(p.id, p)
      }
    }

    for (const gp of allGamePlayers ?? []) {
      if (!lineupsByGame.has(gp.game_id)) {
        lineupsByGame.set(gp.game_id, { teamA: [], teamB: [], unassigned: [] })
      }
      const player = playersById.get(gp.player_id)
      if (!player) continue
      const entry = lineupsByGame.get(gp.game_id)!
      const identity = {
        id: player.id,
        name: player.display_name,
        avatar_url: player.avatar_url,
        shirt_number: player.shirt_number,
      }
      if (gp.team === 'a') entry.teamA.push(identity)
      else if (gp.team === 'b') entry.teamB.push(identity)
      else entry.unassigned.push(identity)
    }
  }

  const noGamesInDb = sorted.length === 0
  const emptyAfterFilter = !noGamesInDb && gameList.length === 0 && hasDateFilter

  return (
    <div className="container mx-auto max-w-screen-md px-4 py-8">
      <div className="mb-6 flex min-w-0 flex-nowrap items-center justify-between gap-3 sm:mb-8">
        <h1 className="min-w-0 shrink truncate text-2xl font-bold text-fcda-navy">Jogos</h1>
        <Suspense
          fallback={
            <div className="h-8 w-40 shrink-0 animate-pulse rounded-md bg-muted/50" aria-hidden />
          }
        >
          <MatchesDateFilter />
        </Suspense>
      </div>
      {noGamesInDb ? (
        <p className="text-sm text-muted-foreground">Ainda não há jogos registados.</p>
      ) : emptyAfterFilter ? (
        <p className="text-sm text-muted-foreground">
          Nenhum jogo neste intervalo de datas. Ajusta as datas ou limpa o filtro.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {gameList.map((g) => (
            <MatchCard
              key={g.id}
              game={g}
              lineup={lineupsByGame.get(g.id)}
              showAvatars={isApproved}
            />
          ))}
        </div>
      )}
    </div>
  )
}

import { Suspense } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { canAccessMod, fetchSessionContext } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { MatchCard, type LineupSummary } from '@/components/matches/MatchCard'
import { MatchesDateFilter } from '@/components/matches/MatchesDateFilter'
import { NewGameModal } from '@/components/matches/NewGameModal'
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
  const canCreateGame = Boolean(session?.profile.approved && canAccessMod(session.roles))

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
      .select('game_id, player_id, team, is_captain')
      .in('game_id', gameIds) as {
        data: Array<{
          game_id: string
          player_id: string
          team: 'a' | 'b' | null
          is_captain: boolean
        }> | null
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
        is_captain: gp.is_captain,
      }
      if (gp.team === 'a') entry.teamA.push(identity)
      else if (gp.team === 'b') entry.teamB.push(identity)
      else entry.unassigned.push(identity)
    }
  }

  const noGamesInDb = sorted.length === 0
  const emptyAfterFilter = !noGamesInDb && gameList.length === 0 && hasDateFilter

  return (
    <div className="bg-white">
      <section className="bg-fcda-navy text-white">
        <div className="container mx-auto grid max-w-screen-xl gap-8 px-4 py-10 md:grid-cols-[1fr_auto] md:items-end md:py-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fcda-gold">
              Futebol Clube Dragões da Areosa
            </p>
            <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">
              Jogos
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
              Consulta o calendário, acompanha resultados e revê os detalhes de cada partida.
            </p>
          </div>
          <Image
            src="/crest.png"
            alt=""
            width={160}
            height={160}
            className="hidden h-40 w-40 object-contain opacity-90 drop-shadow-lg md:block"
            aria-hidden
          />
        </div>
      </section>

      <main className="container mx-auto max-w-screen-md px-4 py-8 md:py-10">
        <div className="mb-6 flex min-w-0 flex-wrap items-center justify-end gap-3 sm:mb-8">
          <Suspense
            fallback={
              <div
                className="order-3 h-8 w-full animate-pulse rounded-md bg-muted/50 sm:order-none sm:w-40"
                aria-hidden
              />
            }
          >
            <MatchesDateFilter className="order-3 w-full sm:order-none sm:w-auto" />
          </Suspense>
          {canCreateGame && <NewGameModal />}
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
      </main>
    </div>
  )
}

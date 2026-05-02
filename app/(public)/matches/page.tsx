import { Suspense } from 'react'
import Image from 'next/image'
import { TriangleAlertIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { canAccessMod, fetchSessionContext } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { MatchCard, type LineupSummary } from '@/components/matches/MatchCard'
import { MatchesDateFilter } from '@/components/matches/MatchesDateFilter'
import { NewGameModal } from '@/components/matches/NewGameModal'
import { filterGamesByDateRange } from '@/lib/games/filter-by-date-range'
import { sortGames } from '@/lib/games/sort'
import { getTeamPresentation } from '@/lib/games/team-presentation'
import { fetchMatchCommentCounts } from '@/lib/matches/comment-counts'
import type { Game } from '@/types'

export const metadata = { title: 'Jogos — FCDA' }

const teamA = getTeamPresentation('a')
const teamB = getTeamPresentation('b')

function formatHeroDate(iso: string) {
  const d = new Date(iso)
  const gates = new Date(d.getTime() - 90 * 60 * 1000)
  const date = d.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const time = d.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const openingTime = gates.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return {
    headline: `${date.charAt(0).toUpperCase()}${date.slice(1)} às ${time}`,
    date: d.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long',
    }),
    time,
    openingTime,
  }
}

function MatchesHero({ game }: { game: Game | null }) {
  const formatted = game ? formatHeroDate(game.date) : null

  return (
    <section className="relative isolate min-h-[30rem] overflow-hidden bg-fcda-navy text-white">
      <Image
        src="/miguel_gomes.jpeg"
        alt=""
        fill
        preload
        sizes="100vw"
        className="absolute inset-0 -z-30 object-cover object-[right_24%]"
        aria-hidden
      />
      <div className="absolute inset-0 -z-20 bg-blue-950/76" aria-hidden />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(0,32,116,0.96)_0%,rgba(0,65,190,0.74)_48%,rgba(0,94,230,0.45)_100%)]"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-blue-950/88 to-transparent" aria-hidden />

      <div className="container mx-auto flex min-h-[30rem] max-w-screen-xl flex-col px-4 pb-12 pt-12 md:pb-16 md:pt-16">
        <div>
          <p className="text-lg font-semibold leading-tight">Futebol</p>
          <p className="text-sm font-medium text-white/55">FCDA · Jogos e resultados</p>
        </div>

        <div className="mt-auto">
          <h1 className="sr-only">Jogos FCDA</h1>
          <div className="inline-flex w-fit items-center gap-5">
            <Image
              src={teamA.imageSrc}
              alt={teamA.imageAlt}
              width={112}
              height={154}
              className="h-[6.875rem] w-auto object-contain drop-shadow-lg sm:h-[8.875rem] md:h-[9.875rem]"
            />
            <span className="h-[6.875rem] w-px bg-white/16 sm:h-[8.875rem] md:h-[9.875rem]" aria-hidden />
            <Image
              src={teamB.imageSrc}
              alt={teamB.imageAlt}
              width={112}
              height={154}
              className="h-[6.5rem] w-auto object-contain drop-shadow-lg sm:h-[7.5rem] md:h-[8.75rem]"
            />
          </div>

          <p className="mt-8 max-w-5xl text-3xl font-black tracking-tight text-white/68 sm:text-4xl md:text-5xl">
            {formatted?.headline ?? 'Calendário e resultados'}
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8 md:gap-10">
            <div className="grid w-fit grid-cols-3 gap-3 text-sm text-white/92 sm:gap-0">
              <div className="min-w-0 border-r border-white/14 pr-4 sm:pr-5">
                <p className="text-base font-medium text-white/38">Data e hora local</p>
                <p className="mt-1 font-semibold">{formatted ? `${formatted.date} às ${formatted.time}` : 'Por definir'}</p>
              </div>
              <div className="min-w-0 border-r border-white/14 px-4 sm:px-5">
                <p className="text-base font-medium text-white/38">Recinto</p>
                <p className="mt-1 font-semibold">{game?.location ?? 'Areosa'}</p>
              </div>
              <div className="min-w-0 pl-4 sm:pl-5">
                <p className="text-base font-medium text-white/38">Abertura de portas</p>
                <p className="mt-1 font-semibold">{formatted?.openingTime ?? 'Por definir'}</p>
              </div>
            </div>
            <div
              role="status"
              className="inline-flex max-w-full shrink-0 items-center gap-2.5 self-end rounded-lg border border-amber-400/45 bg-amber-500/[0.16] px-4 py-2.5 text-sm font-semibold tracking-tight text-amber-50 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-amber-500/[0.12] sm:text-base"
            >
              <TriangleAlertIcon className="size-5 shrink-0 text-amber-200 opacity-95" aria-hidden />
              Bilhetes esgotados
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

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
  const commentCounts = await fetchMatchCommentCounts(supabase, gameList.map((game) => game.id))

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
  const heroGame = sorted.find((game) => game.status === 'scheduled') ?? sorted[0] ?? null

  return (
    <div className="bg-white">
      <MatchesHero game={heroGame} />

      <main id="matches-list" className="container mx-auto max-w-screen-md px-4 py-8 md:py-10">
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
                commentCount={commentCounts.get(g.id) ?? 0}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

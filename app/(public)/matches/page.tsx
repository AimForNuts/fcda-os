import { Suspense } from 'react'
import Link from 'next/link'
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
import { cn } from '@/lib/utils'
import type { Game } from '@/types'

export const metadata = { title: 'Jogos — FCDA' }

const teamA = getTeamPresentation('a')
const teamB = getTeamPresentation('b')
type MatchesView = 'calendar' | 'results'

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

function buildMatchesHref(view: MatchesView, from?: string, to?: string) {
  const params = new URLSearchParams()
  params.set('view', view)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return `/matches?${params.toString()}`
}

function MatchesViewTabs({
  activeView,
  from,
  to,
  calendarCount,
  resultsCount,
}: {
  activeView: MatchesView
  from?: string
  to?: string
  calendarCount: number
  resultsCount: number
}) {
  const tabs: Array<{ view: MatchesView; label: string; count: number }> = [
    { view: 'calendar', label: 'Calendário', count: calendarCount },
    { view: 'results', label: 'Resultados', count: resultsCount },
  ]

  return (
    <nav className="flex min-w-0 items-center gap-1" aria-label="Tipo de jogos">
      {tabs.map((tab) => {
        const active = activeView === tab.view

        return (
          <Link
            key={tab.view}
            href={buildMatchesHref(tab.view, from, to)}
            scroll={false}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-11 min-w-0 items-center gap-2 border-b-2 px-3 text-sm font-black uppercase tracking-normal transition-colors sm:px-5',
              active
                ? 'border-fcda-blue text-fcda-blue'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                active ? 'bg-fcda-blue/10 text-fcda-blue' : 'bg-muted text-muted-foreground',
              )}
            >
              {tab.count}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; view?: string }>
}) {
  const { from, to, view } = await searchParams
  const activeView: MatchesView = view === 'results' ? 'results' : 'calendar'
  const supabase = await createClient()
  const session = await fetchSessionContext()
  const isApproved = session?.profile.approved ?? false
  const canCreateGame = Boolean(session?.profile.approved && canAccessMod(session.roles))

  const { data: games } = await supabase
    .from('games')
    .select('*') as { data: Game[] | null; error: unknown }

  const sorted = sortGames(games ?? [])
  const gameList = filterGamesByDateRange(sorted, from, to)
  const calendarGames = gameList.filter((game) => game.status === 'scheduled')
  const resultsGames = gameList.filter((game) => game.status !== 'scheduled')
  const visibleGames = activeView === 'calendar' ? calendarGames : resultsGames
  const hasDateFilter = Boolean(from || to)
  const commentCounts = await fetchMatchCommentCounts(supabase, visibleGames.map((game) => game.id))

  // Batch-fetch all game_players and player names for the listed games
  const lineupsByGame = new Map<string, LineupSummary>()

  if (visibleGames.length > 0) {
    const gameIds = visibleGames.map((g) => g.id)

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
  const emptyVisibleList = !noGamesInDb && gameList.length > 0 && visibleGames.length === 0
  const heroGame = sorted.find((game) => game.status === 'scheduled') ?? sorted[0] ?? null
  const emptyTabMessage = activeView === 'calendar'
    ? 'Não há jogos agendados neste intervalo.'
    : 'Ainda não há resultados neste intervalo.'

  return (
    <div className="bg-white">
      <MatchesHero game={heroGame} />

      <main id="matches-list" className="container mx-auto max-w-screen-xl px-4 py-8 md:py-10">
        <div className="mb-8 border-b border-border">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-fcda-blue">Jogos</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                Calendário e resultados
              </h2>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3 sm:justify-end">
              <Suspense
                fallback={
                  <div
                    className="h-8 w-full animate-pulse rounded-md bg-muted/50 sm:w-40"
                    aria-hidden
                  />
                }
              >
                <MatchesDateFilter className="w-full sm:w-auto" />
              </Suspense>
              {canCreateGame && <NewGameModal />}
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <MatchesViewTabs
              activeView={activeView}
              from={from}
              to={to}
              calendarCount={calendarGames.length}
              resultsCount={resultsGames.length}
            />
          </div>
        </div>

        <div className="mb-5 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              {activeView === 'calendar' ? 'Próximos jogos' : 'Últimos resultados'}
            </p>
            <p className="text-sm text-muted-foreground">
              {visibleGames.length} {visibleGames.length === 1 ? 'jogo' : 'jogos'}
            </p>
          </div>
        </div>

        <div className="hidden lg:grid lg:grid-cols-[minmax(8rem,14rem)_1fr_minmax(10rem,14rem)] lg:gap-6 lg:border-y lg:border-border lg:bg-muted/20 lg:px-5 lg:py-3 lg:text-xs lg:font-black lg:uppercase lg:text-muted-foreground">
          <span>Data</span>
          <span aria-hidden />
          <span className="text-right">Detalhes</span>
        </div>

        <div className="flex flex-col gap-3 pt-3 lg:gap-0 lg:pt-0">
          {noGamesInDb ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              Ainda não há jogos registados.
            </p>
          ) : emptyAfterFilter ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              Nenhum jogo neste intervalo de datas. Ajusta as datas ou limpa o filtro.
            </p>
          ) : emptyVisibleList ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              {emptyTabMessage}
            </p>
          ) : (
            visibleGames.map((g) => (
              <MatchCard
                key={g.id}
                game={g}
                lineup={lineupsByGame.get(g.id)}
                showAvatars={isApproved}
                commentCount={commentCounts.get(g.id) ?? 0}
              />
            ))
          )}
        </div>
      </main>
    </div>
  )
}

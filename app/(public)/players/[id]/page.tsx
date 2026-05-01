import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Fragment } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  CalendarDays,
  Medal,
  ShieldCheck,
  Star,
  Swords,
  Target,
  Trophy,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { getTeamPresentation, type MatchTeam } from '@/lib/games/team-presentation'
import type { Game, Player, PlayerPublic, PlayerStats } from '@/types'
import { cn } from '@/lib/utils'

type MatchRow = {
  game_id: string
  team: string | null
  date: string
  location: string
  score_a: number | null
  score_b: number | null
  rating: number | null
}

type UpcomingMatch = {
  id: string
  date: string
  location: string
}

type RankingRow = Pick<
  PlayerStats,
  'id' | 'display_name' | 'total_all' | 'wins_all' | 'draws_all' | 'losses_all'
>

type PublicPlayerStats = Pick<
  PlayerStats,
  | 'total_all'
  | 'total_comp'
  | 'wins_all'
  | 'draws_all'
  | 'losses_all'
  | 'wins_comp'
  | 'draws_comp'
  | 'losses_comp'
>

type PlayerProfileRecord = Pick<
  PlayerPublic,
  'id' | 'display_name' | 'shirt_number' | 'profile_id' | 'avatar_path'
> & {
  current_rating?: number | null
  preferred_positions: string[]
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()

  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

function matchTeam(team: string | null): MatchTeam | null {
  if (team === 'a' || team === 'b') return team
  return null
}

function percentage(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

function resultForPlayer(match: MatchRow) {
  if (match.score_a == null || match.score_b == null) return null
  if (match.score_a === match.score_b) return 'draw'
  if (match.team === 'a') return match.score_a > match.score_b ? 'win' : 'loss'
  if (match.team === 'b') return match.score_b > match.score_a ? 'win' : 'loss'
  return null
}

const POSITION_LABELS: Record<string, string> = {
  GK: 'Guarda-redes',
  CB: 'Defesa',
  CM: 'Médio',
  W: 'Extremo',
  ST: 'Avançado',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: player } = await supabase
    .from('players_public')
    .select('display_name')
    .eq('id', id)
    .single() as { data: { display_name: string } | null; error: unknown }

  return { title: player ? `${player.display_name} — FCDA` : 'Jogador — FCDA' }
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await fetchSessionContext()

  if (!session) {
    redirect(`/auth/login?redirectTo=/players/${id}`)
  }

  const supabase = await createClient()
  const isApproved = session.profile.approved
  const canViewRatings = canAccessMod(session.roles)

  let player: PlayerProfileRecord | null = null

  if (isApproved) {
    const { data } = await supabase
      .from('players')
      .select(
        canViewRatings
          ? 'id, sheet_name, shirt_number, current_rating, preferred_positions, profile_id, avatar_path'
          : 'id, sheet_name, shirt_number, preferred_positions, profile_id, avatar_path'
      )
      .eq('id', id)
      .single() as {
        data:
          | (Pick<
              Player,
              | 'id'
              | 'sheet_name'
              | 'shirt_number'
              | 'preferred_positions'
              | 'profile_id'
              | 'avatar_path'
            > & { current_rating?: number | null })
          | null
        error: unknown
      }

    player = data
      ? {
          id: data.id,
          display_name: data.sheet_name,
          shirt_number: data.shirt_number,
          current_rating: canViewRatings ? data.current_rating ?? null : null,
          preferred_positions: data.preferred_positions ?? [],
          profile_id: data.profile_id,
          avatar_path: data.avatar_path,
        }
      : null
  } else {
    const { data } = await supabase
      .from('players_public')
      .select(
        canViewRatings
          ? 'id, display_name, shirt_number, current_rating, profile_id, avatar_path'
          : 'id, display_name, shirt_number, profile_id, avatar_path'
      )
      .eq('id', id)
      .single() as {
        data: (Omit<PlayerPublic, 'current_rating'> & { current_rating?: number | null }) | null
        error: unknown
      }

    player = data ? { ...data, preferred_positions: [] } : null
  }

  if (!player) notFound()
  const [resolvedPlayer] = await signPlayerAvatarRecords([player], isApproved)

  const { data: gps } = await supabase
    .from('game_players')
    .select('game_id, team')
    .eq('player_id', id) as {
      data: { game_id: string; team: string | null }[] | null
      error: unknown
    }

  const { data: stats } = await supabase
    .from('player_stats')
    .select('total_all, total_comp, wins_all, draws_all, losses_all, wins_comp, draws_comp, losses_comp')
    .eq('id', id)
    .maybeSingle() as { data: PublicPlayerStats | null; error: unknown }

  const statsSummary = stats ?? {
    total_all: 0,
    total_comp: 0,
    wins_all: 0,
    draws_all: 0,
    losses_all: 0,
    wins_comp: 0,
    draws_comp: 0,
    losses_comp: 0,
  }

  const matchesPlayed = statsSummary.total_all
  const totalPoints = statsSummary.wins_all * 3 + statsSummary.draws_all
  const winRate = percentage(statsSummary.wins_all, matchesPlayed)
  const competitiveWinRate = percentage(statsSummary.wins_comp, statsSummary.total_comp)
  const gameIds = (gps ?? []).map((gp) => gp.game_id)
  const isOwnProfile = !!resolvedPlayer.profile_id && resolvedPlayer.profile_id === session.userId

  let matchHistory: MatchRow[] = []
  let upcomingMatch: UpcomingMatch | null = null

  if (gameIds.length > 0) {
    const teamByGame = new Map((gps ?? []).map((gp) => [gp.game_id, gp.team]))

    const { data: games } = await supabase
      .from('games')
      .select('id, date, location, score_a, score_b')
      .in('id', gameIds)
      .eq('status', 'finished')
      .eq('counts_for_stats', true)
      .order('date', { ascending: false }) as {
        data: Pick<Game, 'id' | 'date' | 'location' | 'score_a' | 'score_b'>[] | null
        error: unknown
      }

    let ratingByGame = new Map<string, number>()
    if (canViewRatings) {
      const { data: ratings } = await supabase
        .from('rating_submissions')
        .select('game_id, rating')
        .eq('rated_player_id', id)
        .eq('status', 'approved')
        .in('game_id', gameIds) as {
          data: { game_id: string; rating: number }[] | null
          error: unknown
        }

      const ratingsByGame = new Map<string, number[]>()
      for (const rating of ratings ?? []) {
        const bucket = ratingsByGame.get(rating.game_id) ?? []
        bucket.push(rating.rating)
        ratingsByGame.set(rating.game_id, bucket)
      }

      ratingByGame = new Map(
        [...ratingsByGame.entries()].map(([gameId, values]) => [
          gameId,
          values.reduce((sum, value) => sum + value, 0) / values.length,
        ])
      )
    }

    matchHistory = (games ?? []).map((game) => ({
      game_id: game.id,
      team: teamByGame.get(game.id) ?? null,
      date: game.date,
      location: game.location,
      score_a: game.score_a,
      score_b: game.score_b,
      rating: ratingByGame.get(game.id) ?? null,
    }))

    const { data: upcomingGames } = await supabase
      .from('games')
      .select('id, date, location')
      .in('id', gameIds)
      .eq('status', 'scheduled')
      .order('date', { ascending: true })
      .limit(1) as {
        data: UpcomingMatch[] | null
        error: unknown
      }

    upcomingMatch = upcomingGames?.[0] ?? null
  }

  const { data: rankingRows } = await supabase
    .from('player_stats')
    .select('id, display_name, total_all, wins_all, draws_all, losses_all') as {
      data: RankingRow[] | null
      error: unknown
    }

  const ranking = (rankingRows ?? [])
    .map((row) => ({
      ...row,
      points: row.wins_all * 3 + row.draws_all,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.wins_all !== a.wins_all) return b.wins_all - a.wins_all
      return b.total_all - a.total_all
    })

  const playerRankIndex = ranking.findIndex((row) => row.id === id)
  const playerRank = playerRankIndex >= 0 ? playerRankIndex + 1 : null
  const rankingPreview = ranking.slice(0, 4)
  const latestMatch = matchHistory[0] ?? null

  const dateStr = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  const heroStats = [
    ...(canViewRatings
      ? [
          {
            label: 'Nota',
            value: resolvedPlayer.current_rating != null ? resolvedPlayer.current_rating.toFixed(1) : '—',
            icon: Star,
          },
        ]
      : []),
    { label: 'Jogos', value: matchesPlayed, icon: Swords },
    { label: 'Pontos', value: totalPoints, icon: Trophy },
    { label: 'Vitórias', value: `${winRate}%`, icon: Target },
  ]

  const shirtNumber =
    resolvedPlayer.shirt_number != null
      ? String(resolvedPlayer.shirt_number).padStart(2, '0')
      : 'FC'
  const positionLabels =
    resolvedPlayer.preferred_positions.length > 0
      ? resolvedPlayer.preferred_positions.map((position) => POSITION_LABELS[position] ?? position)
      : ['Jogador']

  return (
    <div className="bg-[#f6f8fb] text-fcda-navy">
      <section className="overflow-hidden border-b border-fcda-navy/10 bg-white">
        <div className="mx-auto max-w-screen-2xl">
          <div className="relative lg:min-h-[520px]">
            <div className="relative z-10 flex min-h-[500px] flex-col justify-between bg-white px-6 py-8 md:px-10 lg:min-h-[520px] lg:w-[60%] lg:py-9 lg:pl-14 lg:pr-36 lg:[clip-path:polygon(0_0,100%_0,84%_68%,84%_100%,0_100%)]">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/players"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-fcda-navy/45 transition-colors hover:text-fcda-navy"
              >
                <ArrowLeft className="size-4" />
                Plantel
              </Link>
              {isOwnProfile && (
                <span className="inline-flex min-h-8 items-center bg-fcda-gold px-3 text-xs font-semibold uppercase tracking-[0.14em] text-fcda-navy">
                  Perfil pessoal
                </span>
              )}
            </div>

            <div className="space-y-8">
              <div className="flex items-end gap-6">
                <p className="text-[7.5rem] font-black leading-none text-fcda-gold tabular-nums md:text-[10rem]">
                  {shirtNumber}
                </p>
                <div className="pb-6">
                  <h1 className="text-5xl font-light uppercase leading-[0.95] tracking-normal text-fcda-navy md:text-6xl">
                    {resolvedPlayer.display_name}
                  </h1>
                  <div className="mt-3 flex max-w-full flex-row flex-nowrap items-center gap-x-3 overflow-x-auto">
                    {positionLabels.map((position, index) => (
                      <Fragment key={`${position}-${index}`}>
                        {index > 0 ? (
                          <span
                            className="select-none text-2xl font-light text-fcda-gold/50"
                            aria-hidden
                          >
                            ·
                          </span>
                        ) : null}
                        <span className="text-2xl font-light uppercase tracking-wide text-fcda-gold">
                          {position}
                        </span>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`grid max-w-xl gap-6 ${canViewRatings ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                {heroStats.map((item) => {
                  const Icon = item.icon

                  return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex size-20 items-center justify-center rounded-full border-[7px] border-fcda-navy/10 bg-white text-2xl font-light tabular-nums text-fcda-navy sm:size-24 sm:text-3xl">
                        {item.value}
                      </div>
                      <div className="flex items-center gap-1.5 text-fcda-navy/55">
                        <Icon className="size-4" />
                        <span className="text-xs font-light uppercase tracking-wide">
                          {item.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            </div>

            <div className="relative flex min-h-[400px] items-center justify-center overflow-hidden bg-white p-8 lg:absolute lg:inset-y-0 lg:right-0 lg:z-0 lg:min-h-0 lg:w-[54%] lg:p-12">
              {resolvedPlayer.avatar_url ? (
                <>
                  <Image
                    src="/crest.png"
                    alt=""
                    width={720}
                    height={720}
                    className="absolute right-0 top-1/2 h-[92%] w-auto -translate-y-1/2 object-contain opacity-[0.26] grayscale mix-blend-multiply"
                    aria-hidden
                  />
                  <div className="relative z-10 flex h-[20rem] w-[14rem] items-center justify-center overflow-hidden border border-fcda-navy/[0.08] bg-white md:h-[24rem] md:w-[17rem] lg:h-[28rem] lg:w-[20rem]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedPlayer.avatar_url}
                      alt=""
                      className="h-full w-full object-cover object-center"
                      aria-hidden
                    />
                  </div>
                  <div className="absolute inset-0 z-20 bg-gradient-to-r from-white/18 via-transparent to-fcda-gold/18 pointer-events-none" />
                </>
              ) : (
                <div className="relative z-10 flex h-[20rem] w-[14rem] items-center justify-center border border-fcda-navy/[0.08] bg-white text-7xl font-black text-fcda-navy/30 md:h-[24rem] md:w-[17rem] lg:h-[28rem] lg:w-[20rem]">
                  {getInitials(resolvedPlayer.display_name)}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/35 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <nav className="sticky top-0 z-20 border-b border-fcda-navy/10 bg-white/95 backdrop-blur">
        <div className="container mx-auto flex max-w-screen-xl gap-8 overflow-x-auto px-4">
          {[
            ['Biografia', '#biografia'],
            ['Estatísticas', '#estatisticas'],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="inline-flex h-14 shrink-0 items-center border-b-2 border-transparent text-sm font-black uppercase tracking-[0.16em] text-fcda-navy/45 transition-colors first:border-fcda-gold first:text-fcda-navy hover:border-fcda-gold hover:text-fcda-navy"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <main className="container mx-auto max-w-screen-xl space-y-12 px-4 py-10 md:py-14">
        <section id="biografia" className="scroll-mt-24">
          <article className="bg-white p-6 shadow-sm shadow-fcda-navy/5 md:p-8">
            <h2 className="text-3xl font-black tracking-normal text-fcda-navy md:text-4xl">
              Biografia
            </h2>
            <div className="mt-6 max-w-4xl space-y-4 text-base leading-7 text-fcda-navy/65">
              <p>
                {resolvedPlayer.display_name} faz parte do plantel FCDA como {positionLabels.join(' / ').toLowerCase()}.
                O perfil reúne o registo competitivo do jogador, incluindo jogos, pontos, resultados e histórico recente.
              </p>
              <p>
                Nesta época, soma {matchesPlayed} jogos oficiais, {totalPoints} pontos e uma taxa de vitória de {winRate}%.
                Os dados são atualizados a partir dos jogos concluídos registados na plataforma.
              </p>
            </div>
          </article>
        </section>

        <section id="estatisticas" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-normal text-fcda-navy md:text-4xl">
                Estatísticas
              </h2>
              <p className="mt-2 text-sm text-fcda-navy/55">Atualizado por jogos concluídos.</p>
            </div>
            <p className="text-sm font-semibold text-fcda-navy/55">
              {playerRank ? `${playerRank}.º no ranking por pontos` : 'Sem posição no ranking'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Jogos totais', value: statsSummary.total_all, icon: Swords },
              { label: 'Competitivos', value: statsSummary.total_comp, icon: ShieldCheck },
              { label: 'Vitórias', value: statsSummary.wins_all, icon: Trophy },
              { label: 'Taxa comp.', value: `${competitiveWinRate}%`, icon: Target },
            ].map((item) => {
              const Icon = item.icon

              return (
                <div key={item.label} className="bg-white p-5 shadow-sm shadow-fcda-navy/5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fcda-navy/45">
                      {item.label}
                    </p>
                    <Icon className="size-5 text-fcda-gold" />
                  </div>
                  <p className="mt-5 text-4xl font-black tabular-nums text-fcda-navy">{item.value}</p>
                </div>
              )
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="bg-white p-6 shadow-sm shadow-fcda-navy/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-fcda-navy">Ranking</h3>
                  <p className="mt-1 text-sm text-fcda-navy/55">Classificação por pontos totais.</p>
                </div>
                <Medal className="size-6 text-fcda-gold" />
              </div>
              <div className="mt-6 space-y-2">
                {rankingPreview.map((row, index) => (
                  <div
                    key={row.id}
                    className={cn(
                      'grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3 text-sm',
                      row.id === id ? 'bg-fcda-gold text-fcda-navy' : 'bg-fcda-ice/45 text-fcda-navy'
                    )}
                  >
                    <span className="font-black tabular-nums">{index + 1}</span>
                    <span className="truncate font-semibold">{row.display_name}</span>
                    <span className="font-black tabular-nums">{row.points}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white p-6 shadow-sm shadow-fcda-navy/5">
              <h3 className="text-2xl font-black text-fcda-navy">Jogos</h3>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="border border-fcda-navy/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fcda-navy/45">
                    Último jogo
                  </p>
                  {latestMatch ? (
                    <>
                      <p className="mt-4 text-3xl font-black tabular-nums">
                        {latestMatch.score_a != null && latestMatch.score_b != null
                          ? `${latestMatch.score_a}-${latestMatch.score_b}`
                          : '—'}
                      </p>
                      <p className="mt-1 text-sm text-fcda-navy/55">{dateStr(latestMatch.date)}</p>
                      <Link href={`/matches/${latestMatch.game_id}`} className="mt-4 inline-flex text-sm font-bold text-fcda-navy underline underline-offset-4">
                        Ficha de jogo
                      </Link>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-fcda-navy/55">Sem jogos concluídos.</p>
                  )}
                </div>
                <div className="border border-fcda-navy/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fcda-navy/45">
                    Próximo jogo
                  </p>
                  {upcomingMatch ? (
                    <>
                      <p className="mt-4 text-3xl font-black tabular-nums">
                        {new Date(upcomingMatch.date).toLocaleTimeString('pt-PT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="mt-1 text-sm text-fcda-navy/55">{dateStr(upcomingMatch.date)}</p>
                      <Link href={`/matches/${upcomingMatch.id}`} className="mt-4 inline-flex text-sm font-bold text-fcda-navy underline underline-offset-4">
                        Ver jogo
                      </Link>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-fcda-navy/55">Sem próximo jogo associado.</p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {matchHistory.length > 0 && (
            <section className="bg-white p-6 shadow-sm shadow-fcda-navy/5">
              <h3 className="text-2xl font-black text-fcda-navy">Histórico recente</h3>
              <div className="mt-6 divide-y divide-fcda-navy/10 border border-fcda-navy/10">
                {matchHistory.map((match) => {
                  const team = matchTeam(match.team)
                  const teamPresentation = team ? getTeamPresentation(team) : null
                  const result = resultForPlayer(match)

                  return (
                    <Link
                      key={match.game_id}
                      href={`/matches/${match.game_id}`}
                      className="grid gap-4 p-4 transition-colors hover:bg-fcda-ice/30 md:grid-cols-[1fr_auto] md:items-center"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <CalendarDays className="size-5 shrink-0 text-fcda-gold" />
                        <div className="min-w-0">
                          <p className="font-bold text-fcda-navy">{dateStr(match.date)}</p>
                          <p className="truncate text-sm text-fcda-navy/55">{match.location}</p>
                        </div>
                      </div>
                      <div className={`grid gap-2 ${canViewRatings ? 'grid-cols-4' : 'grid-cols-3'}`}>
                        <div className="min-w-16 bg-fcda-ice/35 px-3 py-2 text-center">
                          {teamPresentation ? (
                            <Image
                              src={teamPresentation.imageSrc}
                              alt=""
                              width={28}
                              height={38}
                              className="mx-auto h-7 w-auto object-contain"
                              aria-hidden
                            />
                          ) : (
                            <span className="text-sm font-bold">—</span>
                          )}
                        </div>
                        <div className="min-w-16 bg-fcda-ice/35 px-3 py-2 text-center text-sm font-bold tabular-nums">
                          {match.score_a != null && match.score_b != null ? `${match.score_a}-${match.score_b}` : '—'}
                        </div>
                        <div
                          className={cn(
                            'min-w-16 bg-fcda-ice/35 px-3 py-2 text-center text-sm font-black uppercase',
                            result === 'win' && 'text-emerald-700',
                            result === 'draw' && 'text-amber-600',
                            result === 'loss' && 'text-rose-700'
                          )}
                        >
                          {result === 'win' ? 'V' : result === 'draw' ? 'E' : result === 'loss' ? 'D' : '—'}
                        </div>
                        {canViewRatings && (
                          <div className="min-w-16 bg-fcda-ice/35 px-3 py-2 text-center text-sm font-bold tabular-nums">
                            {match.rating != null ? match.rating.toFixed(1) : '—'}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </section>
      </main>
    </div>
  )
}

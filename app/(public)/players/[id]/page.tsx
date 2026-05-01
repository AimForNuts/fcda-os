import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldCheck, Star, Swords, Target, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { getTeamPresentation, type MatchTeam } from '@/lib/games/team-presentation'
import { PlayerPhotoZoom } from '@/components/player/PlayerPhotoZoom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Game, PlayerPublic, PlayerStats } from '@/types'
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

  const { data: player } = await supabase
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
  const winRate = matchesPlayed > 0 ? Math.round((statsSummary.wins_all / matchesPlayed) * 100) : 0
  const gameIds = (gps ?? []).map((gp) => gp.game_id)
  const isOwnProfile = !!resolvedPlayer.profile_id && resolvedPlayer.profile_id === session.userId

  let matchHistory: MatchRow[] = []

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
      ratingByGame = new Map((ratings ?? []).map((rating) => [rating.game_id, rating.rating]))
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
  }

  const dateStr = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="container mx-auto max-w-5xl space-y-4 px-3 py-4 sm:space-y-8 sm:px-4 sm:py-8">
      <section className="relative overflow-hidden rounded-3xl border border-fcda-navy/10 bg-gradient-to-br from-fcda-navy via-fcda-navy to-fcda-navy/90 text-white shadow-lg shadow-fcda-navy/10 sm:rounded-[2rem] sm:shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_28%)]" />
        <div className="relative flex flex-col gap-5 px-4 py-5 sm:gap-8 sm:px-8 sm:py-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:gap-6 sm:text-left">
            <PlayerPhotoZoom
              avatarUrl={resolvedPlayer.avatar_url}
              displayName={resolvedPlayer.display_name}
              fallback={getInitials(resolvedPlayer.display_name)}
            />

            <div className="min-w-0 space-y-2 sm:space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {isOwnProfile && (
                  <Badge className="border-white/15 bg-fcda-gold px-2 py-0.5 text-[10px] text-fcda-navy hover:bg-fcda-gold sm:text-xs">
                    Perfil pessoal
                  </Badge>
                )}
              </div>

              <div>
                <h1 className="flex min-w-0 flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 text-3xl font-black tracking-tight text-white sm:justify-start sm:gap-x-3 sm:text-4xl lg:text-5xl">
                  {resolvedPlayer.shirt_number != null && (
                    <span className="text-base font-semibold tracking-[0.08em] text-white/65 sm:text-2xl sm:tracking-[0.12em] lg:text-3xl">
                      #{resolvedPlayer.shirt_number}
                    </span>
                  )}
                  <span className="min-w-0 truncate">{resolvedPlayer.display_name}</span>
                </h1>
              </div>
            </div>
          </div>

          <div className={`grid gap-2 sm:gap-3 ${canViewRatings ? 'grid-cols-4 lg:grid-cols-2' : 'grid-cols-3'}`}>
            {canViewRatings && (
              <div className="rounded-xl border border-white/12 bg-white/10 p-2 backdrop-blur-sm sm:rounded-2xl sm:p-4">
                <div className="flex items-center gap-1 text-white/75 sm:gap-2">
                  <Star className="size-3 sm:size-4" />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.2em]">Nota</span>
                </div>
                <p className="mt-1 text-xl font-black sm:mt-3 sm:text-3xl">
                  {resolvedPlayer.current_rating != null ? resolvedPlayer.current_rating.toFixed(1) : '—'}
                </p>
              </div>
            )}
            <div className="rounded-xl border border-white/12 bg-white/10 p-2 backdrop-blur-sm sm:rounded-2xl sm:p-4">
              <div className="flex items-center gap-1 text-white/75 sm:gap-2">
                <Swords className="size-3 sm:size-4" />
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.2em]">Jogos</span>
              </div>
              <p className="mt-1 text-xl font-black sm:mt-3 sm:text-3xl">{matchesPlayed}</p>
            </div>
            <div className="rounded-xl border border-white/12 bg-white/10 p-2 backdrop-blur-sm sm:rounded-2xl sm:p-4">
              <div className="flex items-center gap-1 text-white/75 sm:gap-2">
                <Trophy className="size-3 sm:size-4" />
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.2em]">Pontos</span>
              </div>
              <p className="mt-1 text-xl font-black sm:mt-3 sm:text-3xl">{totalPoints}</p>
            </div>
            <div className="rounded-xl border border-white/12 bg-white/10 p-2 backdrop-blur-sm sm:rounded-2xl sm:p-4">
              <div className="flex items-center gap-1 text-white/75 sm:gap-2">
                <Target className="size-3 sm:size-4" />
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.2em]">Vitórias</span>
              </div>
              <p className="mt-1 text-xl font-black sm:mt-3 sm:text-3xl">{winRate}%</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          {
            label: 'Jogos totais',
            value: statsSummary.total_all,
            detail: `${statsSummary.wins_all}V · ${statsSummary.draws_all}E · ${statsSummary.losses_all}D`,
            icon: Swords,
          },
          {
            label: 'Jogos competitivos',
            value: statsSummary.total_comp,
            detail: `${statsSummary.wins_comp}V · ${statsSummary.draws_comp}E · ${statsSummary.losses_comp}D`,
            icon: ShieldCheck,
          },
          {
            label: 'Vitórias totais',
            value: statsSummary.wins_all,
            detail: matchesPlayed > 0 ? `${winRate}% de taxa de vitória` : 'Sem jogos concluídos',
            icon: Trophy,
          },
        ].map((item) => {
          const Icon = item.icon

          return (
            <Card
              key={item.label}
              className="gap-0 rounded-2xl border-fcda-navy/10 bg-white/90 shadow-sm shadow-fcda-navy/5 sm:rounded-3xl"
            >
              <CardContent className="p-2.5 sm:p-5">
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="min-w-0 space-y-1 sm:space-y-2">
                    <p className="text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] text-muted-foreground sm:text-xs sm:tracking-[0.2em]">
                      {item.label}
                    </p>
                    <p className="text-xl font-black tracking-tight text-fcda-navy sm:text-3xl">{item.value}</p>
                  </div>
                  <div className="hidden rounded-xl bg-fcda-ice p-2 text-fcda-navy min-[430px]:block sm:rounded-2xl sm:p-3">
                    <Icon className="size-3.5 sm:size-5" />
                  </div>
                </div>
                <p className="mt-4 hidden text-sm text-muted-foreground sm:block">{item.detail}</p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {[
          {
            title: 'Registo total',
            subtitle: 'Jogos que contam para o histórico geral',
            values: [
              { label: 'Vitórias', value: statsSummary.wins_all, className: 'text-emerald-700' },
              { label: 'Empates', value: statsSummary.draws_all, className: 'text-amber-600' },
              { label: 'Derrotas', value: statsSummary.losses_all, className: 'text-rose-700' },
            ],
          },
          {
            title: 'Registo competitivo',
            subtitle: 'Partidas competitivas registadas',
            values: [
              { label: 'Vitórias', value: statsSummary.wins_comp, className: 'text-emerald-700' },
              { label: 'Empates', value: statsSummary.draws_comp, className: 'text-amber-600' },
              { label: 'Derrotas', value: statsSummary.losses_comp, className: 'text-rose-700' },
            ],
          },
        ].map((section) => (
          <Card
            key={section.title}
            className="rounded-2xl border-fcda-navy/10 bg-gradient-to-br from-white to-fcda-ice/30 shadow-sm shadow-fcda-navy/5 sm:rounded-3xl"
          >
            <CardContent className="space-y-4 p-4 sm:space-y-5 sm:p-6">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-fcda-navy sm:text-lg">{section.title}</h2>
                <p className="text-xs text-muted-foreground sm:text-sm">{section.subtitle}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {section.values.map((value) => (
                  <div
                    key={value.label}
                    className="rounded-xl border border-border bg-background/90 p-3 text-center sm:rounded-2xl sm:p-4"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
                      {value.label}
                    </p>
                    <p className={cn('mt-1.5 text-2xl font-black tabular-nums sm:mt-2 sm:text-3xl', value.className)}>
                      {value.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Histórico recente
          </h2>
          <p className="text-sm text-muted-foreground">
            Resultados e notas aprovadas dos jogos concluídos.
          </p>
        </div>

        {matchHistory.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-fcda-navy/15 bg-muted/20">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Sem jogos registados.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {matchHistory.map((match) => {
              const team = matchTeam(match.team)
              const teamPresentation = team ? getTeamPresentation(team) : null

              return (
                <Link
                  key={match.game_id}
                  href={`/matches/${match.game_id}`}
                  className="block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-3xl"
                >
                  <Card className="rounded-3xl border-fcda-navy/10 bg-white/95 shadow-sm shadow-fcda-navy/5 transition-all hover:-translate-y-0.5 hover:border-fcda-navy/25 hover:shadow-md">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-fcda-navy">{dateStr(match.date)}</p>
                        <p className="text-xs text-muted-foreground sm:text-sm">{match.location}</p>
                      </div>

                      <div className={`grid gap-2 ${canViewRatings ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <div className="rounded-2xl bg-muted/40 px-2.5 py-2 text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Equipa
                          </p>
                          <div className="mt-1 flex min-h-7 items-center justify-center">
                            {teamPresentation ? (
                              <>
                                <Image
                                  src={teamPresentation.imageSrc}
                                  alt=""
                                  width={32}
                                  height={44}
                                  className="h-7 w-auto object-contain drop-shadow-sm"
                                  aria-hidden
                                />
                                <span className="sr-only">{teamPresentation.label}</span>
                              </>
                            ) : (
                              <span className="text-sm font-semibold text-fcda-navy">—</span>
                            )}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-muted/40 px-2.5 py-2 text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Resultado
                          </p>
                          <p className="mt-1 text-sm font-semibold text-fcda-navy">
                            {match.score_a != null && match.score_b != null
                              ? `${match.score_a}–${match.score_b}`
                              : '—'}
                          </p>
                        </div>
                        {canViewRatings && (
                          <div className="rounded-2xl bg-muted/40 px-2.5 py-2 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Nota
                            </p>
                            <p className="mt-1 text-sm font-semibold text-fcda-navy">
                              {match.rating != null ? match.rating.toFixed(1) : '—'}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Star, Swords, Target, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

function teamLabel(team: string | null) {
  if (team === 'a') return 'Branca'
  if (team === 'b') return 'Preta'
  return '—'
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
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-fcda-navy/10 bg-gradient-to-br from-fcda-navy via-fcda-navy to-fcda-navy/90 text-white shadow-xl shadow-fcda-navy/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_28%)]" />
        <div className="relative flex flex-col gap-8 px-6 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar className="size-28 border-4 border-white/25 shadow-2xl shadow-black/15 sm:size-36 lg:size-44">
              {resolvedPlayer.avatar_url ? (
                <AvatarImage src={resolvedPlayer.avatar_url} alt={resolvedPlayer.display_name} />
              ) : null}
              <AvatarFallback className="bg-fcda-gold text-3xl font-semibold text-fcda-navy sm:text-4xl">
                {getInitials(resolvedPlayer.display_name)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {isOwnProfile && (
                  <Badge className="border-white/15 bg-fcda-gold text-fcda-navy hover:bg-fcda-gold">
                    Perfil pessoal
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                  {resolvedPlayer.shirt_number != null && (
                    <span className="text-xl font-semibold tracking-[0.12em] text-white/65 sm:text-2xl lg:text-3xl">
                      #{resolvedPlayer.shirt_number}
                    </span>
                  )}
                  <span>{resolvedPlayer.display_name}</span>
                </h1>
              </div>
            </div>
          </div>

          <div className={`grid gap-3 sm:min-w-[18rem] ${canViewRatings ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {canViewRatings && (
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-white/75">
                  <Star className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">Nota</span>
                </div>
                <p className="mt-3 text-3xl font-black">
                  {resolvedPlayer.current_rating != null ? resolvedPlayer.current_rating.toFixed(1) : '—'}
                </p>
              </div>
            )}
            <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-white/75">
                <Swords className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Jogos</span>
              </div>
              <p className="mt-3 text-3xl font-black">{matchesPlayed}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-white/75">
                <Trophy className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Pontos</span>
              </div>
              <p className="mt-3 text-3xl font-black">{totalPoints}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-white/75">
                <Target className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Vitórias</span>
              </div>
              <p className="mt-3 text-3xl font-black">{winRate}%</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              className="gap-0 rounded-3xl border-fcda-navy/10 bg-white/90 shadow-sm shadow-fcda-navy/5"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="text-3xl font-black tracking-tight text-fcda-navy">{item.value}</p>
                  </div>
                  <div className="rounded-2xl bg-fcda-ice p-3 text-fcda-navy">
                    <Icon className="size-5" />
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{item.detail}</p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
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
            className="rounded-3xl border-fcda-navy/10 bg-gradient-to-br from-white to-fcda-ice/30 shadow-sm shadow-fcda-navy/5"
          >
            <CardContent className="space-y-5 p-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-fcda-navy">{section.title}</h2>
                <p className="text-sm text-muted-foreground">{section.subtitle}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {section.values.map((value) => (
                  <div
                    key={value.label}
                    className="rounded-2xl border border-border bg-background/90 p-4 text-center"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {value.label}
                    </p>
                    <p className={cn('mt-2 text-3xl font-black tabular-nums', value.className)}>
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
            {matchHistory.map((match) => (
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

                    <div className={`grid gap-2 ${canViewRatings ? 'grid-cols-3 sm:min-w-[18rem]' : 'grid-cols-2 sm:min-w-[12rem]'}`}>
                      <div className="rounded-2xl bg-muted/40 px-2.5 py-2 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Equipa
                        </p>
                        <p className="mt-1 text-sm font-semibold text-fcda-navy">{teamLabel(match.team)}</p>
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
            ))}
          </div>
        )}
<<<<<<< HEAD
      </section>
=======
      </div>

      {/* Stats */}
      <div className={`grid gap-4 ${canViewRatings ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'}`}>
        {canViewRatings && (
          <div className="rounded-lg border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Nota</p>
            <p className="text-2xl font-bold text-fcda-navy">
              {resolvedPlayer.current_rating != null ? resolvedPlayer.current_rating.toFixed(1) : '—'}
            </p>
          </div>
        )}
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Jogos</p>
          <p className="text-2xl font-bold text-fcda-navy">{matchesPlayed}</p>
        </div>
      </div>

      {/* Match history — own profile only */}
      {isOwnProfile && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Histórico
          </h2>
          {matchHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem jogos registados.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-fcda-navy text-white text-xs uppercase tracking-wide">
                    <th className="px-4 py-2.5 text-left font-semibold">Data</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Local</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Equipa</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Resultado</th>
                    {canViewRatings && <th className="px-4 py-2.5 text-right font-semibold">Nota</th>}
                  </tr>
                </thead>
                <tbody>
                  {matchHistory.map((m, i) => (
                    <tr
                      key={m.game_id}
                      className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap">{dateStr(m.date)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{m.location}</td>
                      <td className="px-4 py-2.5 text-center">
                        {m.team === 'a' ? 'Branca' : m.team === 'b' ? 'Preta' : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums font-medium">
                        {m.score_a != null && m.score_b != null
                          ? `${m.score_a}–${m.score_b}`
                          : '—'}
                      </td>
                      {canViewRatings && (
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                          {m.rating != null ? m.rating.toFixed(1) : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
>>>>>>> 691023d (fix: hide per-game ratings and fix grid layout for non-mod users in player profile)
    </div>
  )
}

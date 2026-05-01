import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Fragment } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Medal,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { canAccessAdmin, fetchSessionContext } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { getTeamPresentation, type MatchTeam } from '@/lib/games/team-presentation'
import { PlayerDescriptionEditor } from '@/components/player/PlayerDescriptionEditor'
import type { Game, Player, PlayerPublic, PlayerStats } from '@/types'
import { cn } from '@/lib/utils'

type MatchRow = {
  game_id: string
  team: string | null
  date: string
  location: string
  score_a: number | null
  score_b: number | null
}

type UpcomingMatch = {
  id: string
  date: string
  location: string
}

type RankingRow = Pick<
  PlayerStats,
  | 'id'
  | 'display_name'
  | 'total_all'
  | 'wins_all'
  | 'draws_all'
  | 'losses_all'
  | 'avatar_path'
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
  'id' | 'display_name' | 'shirt_number' | 'profile_id' | 'avatar_path' | 'description'
> & {
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

const RANKING_PREVIEW_ROWS = 4

type RankingWithPoints = RankingRow & { points: number }

function RankingPreviewAvatar({
  name,
  avatarUrl,
  isHighlighted = false,
}: {
  name: string
  avatarUrl: string | null
  isHighlighted?: boolean
}) {
  const initials = getInitials(name)

  return (
    <div
      className={cn(
        'flex size-7 shrink-0 overflow-hidden rounded-full border bg-white',
        isHighlighted ? 'border-fcda-navy/20' : 'border-fcda-navy/10'
      )}
      aria-hidden
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <span
          className={cn(
            'flex size-full items-center justify-center text-[0.65rem] font-black',
            isHighlighted ? 'bg-fcda-navy/15 text-fcda-navy' : 'bg-fcda-gold/90 text-fcda-navy'
          )}
        >
          {initials}
        </span>
      )}
    </div>
  )
}

/** Four consecutive rows around the player (e.g. 12–15 when they are 13th), clamped at list bounds. */
function rankingPreviewAroundPlayer(
  ranking: RankingWithPoints[],
  playerRankIndex: number,
): Array<{ row: RankingWithPoints; rank: number }> {
  if (ranking.length === 0) return []

  let start: number
  let end: number

  if (playerRankIndex < 0) {
    start = 0
    end = Math.min(RANKING_PREVIEW_ROWS, ranking.length)
  } else {
    start = playerRankIndex - 1
    end = start + RANKING_PREVIEW_ROWS
    if (end > ranking.length) {
      end = ranking.length
      start = Math.max(0, end - RANKING_PREVIEW_ROWS)
    }
    if (start < 0) {
      start = 0
      end = Math.min(RANKING_PREVIEW_ROWS, ranking.length)
    }
  }

  return ranking.slice(start, end).map((row, i) => ({
    row,
    rank: start + i + 1,
  }))
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

  let player: PlayerProfileRecord | null = null

  if (isApproved) {
    const { data } = await supabase
      .from('players')
      .select('id, sheet_name, shirt_number, preferred_positions, profile_id, avatar_path, description')
      .eq('id', id)
      .single() as {
        data:
          | Pick<
              Player,
              | 'id'
              | 'sheet_name'
              | 'shirt_number'
              | 'preferred_positions'
              | 'profile_id'
              | 'avatar_path'
              | 'description'
            >
          | null
        error: unknown
      }

    player = data
      ? {
          id: data.id,
          display_name: data.sheet_name,
          shirt_number: data.shirt_number,
          preferred_positions: data.preferred_positions ?? [],
          profile_id: data.profile_id,
          avatar_path: data.avatar_path,
          description: data.description,
        }
      : null
  } else {
    const { data } = await supabase
      .from('players_public')
      .select('id, display_name, shirt_number, profile_id, avatar_path, description')
      .eq('id', id)
      .single() as {
        data: Pick<
          PlayerPublic,
          'id' | 'display_name' | 'shirt_number' | 'profile_id' | 'avatar_path' | 'description'
        > | null
        error: unknown
      }

    player = data ? { ...data, preferred_positions: [] } : null
  }

  if (!player) notFound()
  const [resolvedPlayer] = await signPlayerAvatarRecords([player], isApproved)
  const canEditDescription =
    isApproved && (canAccessAdmin(session.roles) || resolvedPlayer.profile_id === session.userId)

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

    matchHistory = (games ?? []).map((game) => ({
      game_id: game.id,
      team: teamByGame.get(game.id) ?? null,
      date: game.date,
      location: game.location,
      score_a: game.score_a,
      score_b: game.score_b,
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
    .select('id, display_name, total_all, wins_all, draws_all, losses_all, avatar_path') as {
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
  const rankingPreview = rankingPreviewAroundPlayer(ranking, playerRankIndex)
  const rankingPreviewAvatars = await signPlayerAvatarRecords(
    rankingPreview.map(({ row }) => ({ id: row.id, avatar_path: row.avatar_path })),
    isApproved
  )
  const rankingPreviewAvatarUrlById = new Map(
    rankingPreviewAvatars.map((entry) => [entry.id, entry.avatar_url])
  )
  const latestMatch = matchHistory[0] ?? null

  const dateStr = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  const heroStats = [
    {
      label: 'Ranking',
      value: playerRank != null ? `${playerRank}.º` : '—',
      icon: Medal,
    },
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
  const fallbackBiography = `${resolvedPlayer.display_name} faz parte do plantel FCDA como ${positionLabels.join(' / ').toLowerCase()}. O perfil reúne o registo competitivo do jogador, incluindo jogos, pontos, resultados e histórico recente.

Nesta época, soma ${matchesPlayed} jogos oficiais, ${totalPoints} pontos e uma taxa de vitória de ${winRate}%. Os dados são atualizados a partir dos jogos concluídos registados na plataforma.`

  return (
    <div className="bg-[#f6f8fb] text-fcda-navy">
      <section className="overflow-hidden border-b border-fcda-navy/10 bg-white">
        <div className="mx-auto max-w-screen-2xl">
          <div className="relative lg:min-h-[520px]">
            <div className="relative z-10 flex min-h-[500px] flex-col justify-between bg-white px-6 py-8 md:px-10 lg:min-h-[520px] lg:w-[60%] lg:py-9 lg:pl-14 lg:pr-36 lg:[clip-path:polygon(0_0,100%_0,84%_68%,84%_100%,0_100%)]">
            <div className="flex items-center gap-4">
              <Link
                href="/players"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-fcda-navy/45 transition-colors hover:text-fcda-navy"
              >
                <ArrowLeft className="size-4" />
                Plantel
              </Link>
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

              <div className="grid max-w-xl grid-cols-2 gap-6 sm:grid-cols-4">
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
              <Image
                src="/crest.png"
                alt=""
                width={720}
                height={720}
                className="pointer-events-none absolute right-0 top-1/2 z-0 h-[92%] w-auto -translate-y-1/2 object-contain opacity-[0.26] grayscale mix-blend-multiply"
                aria-hidden
              />
              {resolvedPlayer.avatar_url ? (
                <div className="relative z-10 flex h-[20rem] w-[14rem] items-center justify-center overflow-hidden border border-fcda-navy/[0.08] bg-white md:h-[24rem] md:w-[17rem] lg:h-[28rem] lg:w-[20rem]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolvedPlayer.avatar_url}
                    alt=""
                    className="h-full w-full object-cover object-center"
                    aria-hidden
                  />
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-r from-white/18 via-transparent to-fcda-gold/18" />
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
            ['Jogos', '#jogos'],
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
            <div className="mt-6 max-w-4xl">
              <PlayerDescriptionEditor
                playerId={resolvedPlayer.id}
                initialDescription={resolvedPlayer.description}
                fallbackDescription={fallbackBiography}
                canEdit={canEditDescription}
              />
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

          <section className="bg-white p-4 shadow-sm shadow-fcda-navy/5 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex items-center gap-2">
                <Medal className="size-5 shrink-0 text-fcda-gold" aria-hidden />
                <h3 className="text-lg font-black leading-tight text-fcda-navy">Ranking</h3>
              </div>
              <Link
                href="/stats"
                className="shrink-0 text-xs font-semibold uppercase tracking-wide text-fcda-navy underline underline-offset-2 hover:text-fcda-navy/75"
              >
                Ver classificação completa
              </Link>
            </div>
            <table className="mt-3 w-full border-separate border-spacing-y-1 text-xs">
              <caption className="sr-only">
                Pré-visualização da classificação por pontos com vitórias, empates e derrotas.
              </caption>
              <thead>
                <tr className="text-left font-semibold uppercase tracking-wide text-fcda-navy/50">
                  <th scope="col" className="w-9 px-3 pb-1 align-bottom font-semibold">
                    #
                  </th>
                  <th scope="col" className="min-w-[7rem] px-1 pb-1 align-bottom font-semibold">
                    Jogador
                  </th>
                  <th scope="col" className="w-9 px-1 pb-1 text-right align-bottom font-semibold tabular-nums">
                    V
                  </th>
                  <th scope="col" className="w-9 px-1 pb-1 text-right align-bottom font-semibold tabular-nums">
                    E
                  </th>
                  <th scope="col" className="w-9 px-1 pb-1 text-right align-bottom font-semibold tabular-nums">
                    D
                  </th>
                  <th scope="col" className="w-11 px-3 pb-1 text-right align-bottom font-semibold tabular-nums">
                    Pts
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankingPreview.map(({ row, rank }) => {
                  const isSelf = row.id === id
                  const avatarUrl = rankingPreviewAvatarUrlById.get(row.id) ?? null

                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        isSelf ? 'bg-fcda-gold text-fcda-navy' : 'bg-fcda-ice/45 text-fcda-navy'
                      )}
                    >
                    <td className="rounded-l-md px-3 py-1.5 align-middle font-black tabular-nums">{rank}</td>
                    <td className="max-w-[min(100%,16rem)] px-1 py-1.5 align-middle sm:max-w-none">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <RankingPreviewAvatar
                          name={row.display_name}
                          avatarUrl={avatarUrl}
                          isHighlighted={isSelf}
                        />
                        {isApproved ? (
                          <Link
                            href={`/players/${row.id}`}
                            className={cn(
                              'min-w-0 truncate font-semibold hover:underline',
                              isSelf && 'text-fcda-navy'
                            )}
                          >
                            {row.display_name}
                          </Link>
                        ) : (
                          <span className="min-w-0 truncate font-semibold">{row.display_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-1.5 text-right align-middle tabular-nums font-medium">
                      {row.wins_all}
                    </td>
                    <td className="px-1 py-1.5 text-right align-middle tabular-nums font-medium">
                      {row.draws_all}
                    </td>
                    <td className="px-1 py-1.5 text-right align-middle tabular-nums font-medium">
                      {row.losses_all}
                    </td>
                    <td className="rounded-r-md px-3 py-1.5 text-right align-middle font-black tabular-nums">
                      {row.points}
                    </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        </section>

        <section id="jogos" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-normal text-fcda-navy md:text-4xl">
                Jogos
              </h2>
              <p className="mt-2 text-sm text-fcda-navy/55">
                Detalhes dos jogos associados ao jogador.
              </p>
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="bg-white p-4 shadow-sm shadow-fcda-navy/5 md:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fcda-navy/45">
                Último jogo
              </p>
              {latestMatch ? (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Image
                      src={getTeamPresentation('a').imageSrc}
                      alt=""
                      width={40}
                      height={55}
                      className="h-8 w-auto shrink-0 object-contain opacity-90"
                      aria-hidden
                    />
                    <p className="text-2xl font-black tabular-nums">
                      {latestMatch.score_a != null && latestMatch.score_b != null
                        ? `${latestMatch.score_a}-${latestMatch.score_b}`
                        : '—'}
                    </p>
                    <Image
                      src={getTeamPresentation('b').imageSrc}
                      alt=""
                      width={40}
                      height={55}
                      className="h-8 w-auto shrink-0 object-contain opacity-90"
                      aria-hidden
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="text-xs text-fcda-navy/55">
                      <span>{dateStr(latestMatch.date)}</span>
                      <span className="mx-1.5 text-fcda-navy/25" aria-hidden>
                        ·
                      </span>
                      <span>{latestMatch.location}</span>
                    </p>
                    <Link
                      href={`/matches/${latestMatch.game_id}`}
                      className="shrink-0 text-xs font-semibold text-fcda-navy underline underline-offset-2"
                    >
                      Ficha de jogo
                    </Link>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-fcda-navy/55">Sem jogos concluídos.</p>
              )}
            </div>
            <div className="bg-white p-4 shadow-sm shadow-fcda-navy/5 md:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fcda-navy/45">
                Próximo jogo
              </p>
              {upcomingMatch ? (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Image
                      src={getTeamPresentation('a').imageSrc}
                      alt=""
                      width={40}
                      height={55}
                      className="h-8 w-auto shrink-0 object-contain opacity-90"
                      aria-hidden
                    />
                    <p className="text-2xl font-black tabular-nums">
                      {new Date(upcomingMatch.date).toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <Image
                      src={getTeamPresentation('b').imageSrc}
                      alt=""
                      width={40}
                      height={55}
                      className="h-8 w-auto shrink-0 object-contain opacity-90"
                      aria-hidden
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="text-xs text-fcda-navy/55">
                      <span>{dateStr(upcomingMatch.date)}</span>
                      <span className="mx-1.5 text-fcda-navy/25" aria-hidden>
                        ·
                      </span>
                      <span>{upcomingMatch.location}</span>
                    </p>
                    <Link
                      href={`/matches/${upcomingMatch.id}`}
                      className="shrink-0 text-xs font-semibold text-fcda-navy underline underline-offset-2"
                    >
                      Ficha de jogo
                    </Link>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-fcda-navy/55">Sem próximo jogo associado.</p>
              )}
            </div>
          </section>

          {matchHistory.length > 0 ? (
            <section className="bg-white p-4 shadow-sm shadow-fcda-navy/5 md:p-5">
              <h3 className="text-xl font-black text-fcda-navy md:text-2xl">
                Histórico de jogos
              </h3>
              <div className="mt-4 overflow-hidden rounded-md border border-fcda-navy/10">
                {matchHistory.map((match, index) => {
                  const team = matchTeam(match.team)
                  const teamPresentation = team ? getTeamPresentation(team) : null
                  const result = resultForPlayer(match)

                  return (
                    <Link
                      key={match.game_id}
                      href={`/matches/${match.game_id}`}
                      title="Ver ficha de jogo"
                      className={cn(
                        'flex min-h-11 items-center gap-2 border-b border-fcda-navy/10 px-2 py-1.5 text-left transition-colors last:border-b-0 hover:bg-fcda-ice/35 sm:min-h-0 sm:gap-3 sm:px-3 sm:py-2',
                        index % 2 === 1 && 'bg-fcda-ice/20'
                      )}
                    >
                      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                        <Image
                          src={getTeamPresentation('a').imageSrc}
                          alt=""
                          width={40}
                          height={55}
                          className="h-6 w-auto shrink-0 object-contain opacity-90 sm:h-7"
                          aria-hidden
                        />
                        <span className="text-base font-black tabular-nums sm:text-lg">
                          {match.score_a != null && match.score_b != null
                            ? `${match.score_a}-${match.score_b}`
                            : '—'}
                        </span>
                        <Image
                          src={getTeamPresentation('b').imageSrc}
                          alt=""
                          width={40}
                          height={55}
                          className="h-6 w-auto shrink-0 object-contain opacity-90 sm:h-7"
                          aria-hidden
                        />
                      </div>
                      <span className="block min-w-0 flex-1 truncate text-[11px] text-fcda-navy/55 sm:text-xs">
                        <span>{dateStr(match.date)}</span>
                        <span className="mx-1 text-fcda-navy/25 sm:mx-1.5" aria-hidden>
                          ·
                        </span>
                        <span>{match.location}</span>
                      </span>
                      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        {teamPresentation ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-fcda-navy/45 sm:gap-1.5 sm:text-[11px] sm:tracking-[0.14em]">
                            <span className="hidden sm:inline">Equipa</span>
                            <Image
                              src={teamPresentation.imageSrc}
                              alt=""
                              width={28}
                              height={38}
                              className="h-5 w-auto object-contain opacity-90 sm:h-6"
                              aria-hidden
                            />
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-fcda-navy/45">
                            <span className="hidden sm:inline">Equipa</span>
                            <span
                              aria-hidden
                              className="text-sm font-black leading-none text-fcda-navy/25 sm:text-base"
                            >
                              —
                            </span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 border-l border-fcda-navy/15 pl-2 sm:gap-1.5 sm:pl-3">
                          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-[0.14em] text-fcda-navy/45">
                            Estado
                          </span>
                          <span
                            className={cn(
                              'text-[11px] font-black uppercase tracking-wide sm:text-xs',
                              result === 'win' && 'text-emerald-700',
                              result === 'draw' && 'text-amber-600',
                              result === 'loss' && 'text-rose-700',
                              result == null && 'text-fcda-navy/35'
                            )}
                          >
                            {result === 'win'
                              ? 'VITORIA'
                              : result === 'draw'
                                ? 'EMPATE'
                                : result === 'loss'
                                  ? 'DERROTA'
                                  : '—'}
                          </span>
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          ) : (
            <section className="bg-white p-6 shadow-sm shadow-fcda-navy/5">
              <p className="text-sm text-fcda-navy/55">Sem jogos registados.</p>
            </section>
          )}
        </section>
      </main>
    </div>
  )
}

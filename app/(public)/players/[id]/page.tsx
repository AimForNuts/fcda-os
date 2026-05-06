import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Fragment } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { canAccessAdmin, fetchSessionContext } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { getTeamPresentation } from '@/lib/games/team-presentation'
import { GameTypeBadge } from '@/components/matches/GameTypeBadge'
import { CompetitiveGameIcon } from '@/components/matches/game-type-icons'
import { PlayerMatchHistory } from '@/components/player/PlayerMatchHistory'
import { PlayerDescriptionEditor } from '@/components/player/PlayerDescriptionEditor'
import { NationalityFlag } from '@/components/player/NationalityFlag'
import { TranslatedText } from '@/components/i18n/TranslatedText'
import {
  buildLeaderboardRows,
  compareLeaderboardRows,
  type LeaderboardPlayer,
  type LeaderboardRow,
} from '@/lib/stats/leaderboard'
import type { Game, Player, PlayerPublic, PlayerStats } from '@/types'
import {
  resultClassName,
  resultForPlayer,
  resultLabel,
  type PlayerMatchHistoryRow,
} from '@/lib/players/player-match-history'
import { cn } from '@/lib/utils'

type UpcomingMatch = {
  id: string
  date: string
  location: string
  counts_for_stats: boolean
}

type PublicPlayerStats = Pick<
  PlayerStats,
  'total_comp' | 'wins_comp' | 'draws_comp'
>

type PlayerProfileRecord = Pick<
  PlayerPublic,
  'id' | 'display_name' | 'shirt_number' | 'nationality' | 'profile_id' | 'avatar_path' | 'description'
> & {
  preferred_positions: string[]
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()

  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

function percentage(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

const RANKING_PREVIEW_ROWS = 4

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
        'flex size-7 shrink-0 overflow-hidden rounded-full border bg-card',
        isHighlighted ? 'border-primary/35' : 'border-border',
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
            isHighlighted ? 'bg-muted text-foreground' : 'bg-fcda-gold/90 text-fcda-navy',
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
  ranking: LeaderboardRow[],
  playerRankIndex: number,
): Array<{ row: LeaderboardRow; rank: number }> {
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
    rank: row.standing || start + i + 1,
  }))
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
      .select('id, sheet_name, shirt_number, nationality, preferred_positions, profile_id, avatar_path, description')
      .eq('id', id)
      .single() as {
        data:
          | Pick<
              Player,
              | 'id'
              | 'sheet_name'
              | 'shirt_number'
              | 'nationality'
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
          nationality: data.nationality,
          preferred_positions: data.preferred_positions ?? [],
          profile_id: data.profile_id,
          avatar_path: data.avatar_path,
          description: data.description,
        }
      : null
  } else {
    const { data } = await supabase
      .from('players_public')
      .select('id, display_name, shirt_number, nationality, profile_id, avatar_path, description')
      .eq('id', id)
      .single() as {
        data: Pick<
          PlayerPublic,
          'id' | 'display_name' | 'shirt_number' | 'nationality' | 'profile_id' | 'avatar_path' | 'description'
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
    .select('total_comp, wins_comp, draws_comp')
    .eq('id', id)
    .maybeSingle() as { data: PublicPlayerStats | null; error: unknown }

  const statsSummary = stats ?? {
    total_comp: 0,
    wins_comp: 0,
    draws_comp: 0,
  }

  const matchesPlayed = statsSummary.total_comp
  const totalPoints = statsSummary.wins_comp * 3 + statsSummary.draws_comp
  const winRate = percentage(statsSummary.wins_comp, matchesPlayed)
  const gameIds = (gps ?? []).map((gp) => gp.game_id)

  let matchHistory: PlayerMatchHistoryRow[] = []
  let upcomingMatch: UpcomingMatch | null = null

  if (gameIds.length > 0) {
    const teamByGame = new Map((gps ?? []).map((gp) => [gp.game_id, gp.team]))

    const { data: games } = await supabase
      .from('games')
      .select('id, date, location, score_a, score_b, counts_for_stats')
      .in('id', gameIds)
      .eq('status', 'finished')
      .order('date', { ascending: false }) as {
        data: Pick<Game, 'id' | 'date' | 'location' | 'score_a' | 'score_b' | 'counts_for_stats'>[] | null
        error: unknown
      }

    matchHistory = (games ?? []).map((game) => ({
      game_id: game.id,
      team: teamByGame.get(game.id) ?? null,
      date: game.date,
      location: game.location,
      score_a: game.score_a,
      score_b: game.score_b,
      counts_for_stats: game.counts_for_stats,
    }))

    const { data: upcomingGames } = await supabase
      .from('games')
      .select('id, date, location, counts_for_stats')
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
    .select('id, display_name, shirt_number, nationality, profile_id, avatar_path, total_all, total_comp, wins_all, draws_all, losses_all, wins_comp, draws_comp, losses_comp') as {
      data: LeaderboardPlayer[] | null
      error: unknown
    }

  const ranking = buildLeaderboardRows(rankingRows ?? [], 'competitive')
    .sort(compareLeaderboardRows)

  const playerRankIndex = ranking.findIndex((row) => row.id === id)
  const playerRank = playerRankIndex >= 0 ? ranking[playerRankIndex].standing : null
  const rankingPreview = rankingPreviewAroundPlayer(ranking, playerRankIndex)
  const rankingPreviewAvatars = await signPlayerAvatarRecords(
    rankingPreview.map(({ row }) => ({ id: row.id, avatar_path: row.avatar_path })),
    isApproved
  )
  const rankingPreviewAvatarUrlById = new Map(
    rankingPreviewAvatars.map((entry) => [entry.id, entry.avatar_url])
  )
  const latestMatch = matchHistory[0] ?? null
  const latestResult = latestMatch ? resultForPlayer(latestMatch) : null

  const dateStr = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  const shirtNumber =
    resolvedPlayer.shirt_number != null
      ? String(resolvedPlayer.shirt_number).padStart(2, '0')
      : 'FC'
  const positionItems =
    resolvedPlayer.preferred_positions.length > 0
      ? resolvedPlayer.preferred_positions.map((position) => ({
          key: `profile.positions.${position}`,
          fallback: POSITION_LABELS[position] ?? position,
        }))
      : [{ key: 'players.genericPlayer', fallback: 'Jogador' }]
  const positionLabels = positionItems.map((position) => position.fallback)
  const fallbackBiography = `${resolvedPlayer.display_name} faz parte do plantel FCDA como ${positionLabels.join(' / ').toLowerCase()}. O perfil reúne o registo competitivo do jogador, incluindo jogos, pontos, resultados e histórico recente.

Nesta época, soma ${matchesPlayed} jogos competitivos, ${totalPoints} pontos e uma taxa de vitória competitiva de ${winRate}%. Os dados são atualizados a partir dos jogos concluídos registados na plataforma.`

  return (
    <div className="bg-background text-foreground">
      <section className="overflow-hidden border-b border-border bg-card">
        <div className="mx-auto max-w-screen-2xl">
          <div className="relative lg:min-h-[520px]">
            <div className="relative z-10 flex flex-col gap-8 bg-card px-4 py-6 sm:px-6 md:px-10 lg:min-h-[520px] lg:w-[60%] lg:justify-center lg:py-9 lg:pl-14 lg:pr-36 lg:[clip-path:polygon(0_0,100%_0,84%_68%,84%_100%,0_100%)]">
            <div className="flex items-center gap-4">
              <Link
                href="/players"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                <TranslatedText i18nKey="players.detail.squad" />
              </Link>
            </div>

            <div className="space-y-6 lg:space-y-8">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:gap-5 lg:gap-6">
                <p className="text-[4.5rem] font-black leading-none text-fcda-gold tabular-nums sm:text-[6rem] md:text-[8rem] lg:text-[10rem]">
                  {shirtNumber}
                </p>
                <div className="sm:pb-4 lg:pb-6">
                  <h1 className="max-w-full break-words text-4xl font-light uppercase leading-[0.95] tracking-normal text-foreground sm:text-5xl md:text-6xl">
                    {resolvedPlayer.display_name}
                  </h1>
                  <div className="mt-3 flex max-w-full flex-row flex-nowrap items-center gap-x-3 overflow-x-auto">
                    <NationalityFlag
                      nationality={resolvedPlayer.nationality}
                      className="h-5 w-8 sm:h-6 sm:w-9"
                    />
                    {positionItems.map((position, index) => (
                      <Fragment key={`${position.key}-${index}`}>
                        {index > 0 ? (
                          <span
                            className="select-none text-lg font-light text-fcda-gold/50 sm:text-2xl"
                            aria-hidden
                          >
                            ·
                          </span>
                        ) : null}
                        <span className="text-lg font-light uppercase tracking-wide text-fcda-gold sm:text-2xl">
                          <TranslatedText i18nKey={position.key} />
                        </span>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </div>

            <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden bg-card p-6 sm:min-h-[360px] lg:absolute lg:inset-y-0 lg:right-0 lg:z-0 lg:min-h-0 lg:w-[54%] lg:p-12">
              <Image
                src="/crest.png"
                alt=""
                width={720}
                height={720}
                className="pointer-events-none absolute right-0 top-1/2 z-0 h-[82%] w-auto -translate-y-1/2 object-contain opacity-[0.22] grayscale mix-blend-multiply lg:h-[92%] lg:opacity-[0.26]"
                aria-hidden
              />
              {resolvedPlayer.avatar_url ? (
                <div className="relative z-10 flex h-[17rem] w-[12rem] items-center justify-center overflow-hidden border border-border bg-card sm:h-[20rem] sm:w-[14rem] md:h-[24rem] md:w-[17rem] lg:h-[28rem] lg:w-[20rem]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolvedPlayer.avatar_url}
                    alt=""
                    className="h-full w-full object-cover object-center"
                    aria-hidden
                  />
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-r from-card/40 via-transparent to-fcda-gold/18" />
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card/50 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <nav className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex max-w-screen-xl gap-6 overflow-x-auto px-4 sm:gap-8">
          {[
            ['players.detail.games', '#jogos'],
            ['players.detail.statistics', '#estatisticas'],
            ['players.detail.biography', '#biografia'],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="inline-flex h-12 shrink-0 items-center border-b-2 border-transparent text-xs font-black uppercase tracking-[0.14em] text-muted-foreground transition-colors first:border-fcda-gold first:text-foreground hover:border-fcda-gold hover:text-foreground sm:h-14 sm:text-sm sm:tracking-[0.16em]"
            >
              <TranslatedText i18nKey={label} />
            </a>
          ))}
        </div>
      </nav>

      <main className="container mx-auto max-w-screen-xl space-y-10 px-4 py-8 md:space-y-12 md:py-14">
        <section id="jogos" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-normal text-foreground md:text-4xl">
                <TranslatedText i18nKey="players.detail.games" />
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                <TranslatedText i18nKey="players.detail.gamesDescription" />
              </p>
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-2 md:items-stretch">
            <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4 shadow-sm md:p-5">
              {latestMatch ? (
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <TranslatedText i18nKey="players.detail.lastGame" />
                  </p>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <TranslatedText i18nKey="players.detail.result" />
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 text-xs font-black uppercase tracking-wide',
                        latestMatch.score_a != null && latestMatch.score_b != null
                          ? resultClassName(latestResult)
                          : 'text-muted-foreground',
                      )}
                    >
                      {latestMatch.score_a != null && latestMatch.score_b != null
                        ? resultLabel(latestResult)
                        : '—'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <TranslatedText i18nKey="players.detail.lastGame" />
                </p>
              )}
              {latestMatch ? (
                <>
                  <div className="mt-3 flex min-h-0 flex-1 flex-col">
                    <div className="flex items-center justify-center gap-3">
                      <Image
                        src={getTeamPresentation('a').imageSrc}
                        alt=""
                        width={40}
                        height={55}
                        className="h-8 w-auto shrink-0 object-contain opacity-90"
                        aria-hidden
                      />
                      <p className="min-w-[4.5rem] text-center text-2xl font-black tabular-nums">
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
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span>{dateStr(latestMatch.date)}</span>
                      <span className="mx-1.5 text-muted-foreground/50" aria-hidden>
                        ·
                      </span>
                      <span>{latestMatch.location}</span>
                    </p>
                    <div className="mt-auto pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <GameTypeBadge competitive={latestMatch.counts_for_stats} />
                        <Link
                          href={`/matches/${latestMatch.game_id}`}
                          className="shrink-0 text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                          <TranslatedText i18nKey="matches.matchSheet" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground"><TranslatedText i18nKey="players.detail.noCompletedGames" /></p>
              )}
            </div>
            <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4 shadow-sm md:p-5">
              {upcomingMatch ? (
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <TranslatedText i18nKey="players.detail.nextGame" />
                  </p>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <TranslatedText i18nKey="players.detail.status" />
                    </p>
                    <p className="mt-0.5 text-xs font-black uppercase tracking-wide text-muted-foreground">
                      <TranslatedText i18nKey="players.detail.scheduled" />
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <TranslatedText i18nKey="players.detail.nextGame" />
                </p>
              )}
              {upcomingMatch ? (
                <>
                  <div className="mt-3 flex min-h-0 flex-1 flex-col">
                    <div className="flex items-center justify-center gap-3">
                      <Image
                        src={getTeamPresentation('a').imageSrc}
                        alt=""
                        width={40}
                        height={55}
                        className="h-8 w-auto shrink-0 object-contain opacity-90"
                        aria-hidden
                      />
                      <p className="min-w-[4.5rem] text-center text-2xl font-black tabular-nums">
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
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span>{dateStr(upcomingMatch.date)}</span>
                      <span className="mx-1.5 text-muted-foreground/50" aria-hidden>
                        ·
                      </span>
                      <span>{upcomingMatch.location}</span>
                    </p>
                    <div className="mt-auto pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <GameTypeBadge competitive={upcomingMatch.counts_for_stats} />
                        <Link
                          href={`/matches/${upcomingMatch.id}`}
                          className="shrink-0 text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                          <TranslatedText i18nKey="matches.matchSheet" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground"><TranslatedText i18nKey="players.detail.noUpcomingGame" /></p>
              )}
            </div>
          </section>

          {matchHistory.length > 0 ? (
            <PlayerMatchHistory matches={matchHistory} />
          ) : (
            <section className="bg-card p-6 shadow-sm shadow-sm">
              <p className="text-sm text-muted-foreground"><TranslatedText i18nKey="players.detail.noGames" /></p>
            </section>
          )}
        </section>

        <section id="estatisticas" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-normal text-foreground md:text-4xl">
                <TranslatedText i18nKey="players.detail.statistics" />
              </h2>
              <p className="mt-2 text-sm text-muted-foreground"><TranslatedText i18nKey="players.detail.updatedByCompletedGames" /></p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              {playerRank ? (
                <TranslatedText i18nKey="players.detail.competitiveRank" values={{ rank: playerRank }} />
              ) : (
                <TranslatedText i18nKey="players.detail.noCompetitiveRank" />
              )}
            </p>
          </div>

          <section className="bg-card p-4 shadow-sm shadow-sm md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex items-center gap-2">
                <CompetitiveGameIcon className="size-5 shrink-0 text-fcda-gold" aria-hidden />
                <h3 className="text-lg font-black leading-tight text-foreground"><TranslatedText i18nKey="players.detail.ranking" /></h3>
              </div>
              <Link
                href="/stats"
                className="shrink-0 text-xs font-semibold uppercase tracking-wide text-primary underline underline-offset-2 hover:text-primary/80"
              >
                <TranslatedText i18nKey="players.detail.viewFullRanking" />
              </Link>
            </div>
            <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-separate border-spacing-y-1 text-xs">
                <caption className="sr-only">
                  <TranslatedText i18nKey="players.detail.rankingCaption" />
                </caption>
                <thead>
                <tr className="text-left font-semibold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="w-9 px-3 pb-1 align-bottom font-semibold">
                    #
                  </th>
                  <th scope="col" className="min-w-[7rem] px-1 pb-1 align-bottom font-semibold">
                    <TranslatedText i18nKey="stats.player" />
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
                        isSelf ? 'bg-fcda-gold text-fcda-navy' : 'bg-muted/55 text-foreground'
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
                      {row.wins_comp}
                    </td>
                    <td className="px-1 py-1.5 text-right align-middle tabular-nums font-medium">
                      {row.draws_comp}
                    </td>
                    <td className="px-1 py-1.5 text-right align-middle tabular-nums font-medium">
                      {row.losses_comp}
                    </td>
                    <td className="rounded-r-md px-3 py-1.5 text-right align-middle font-black tabular-nums">
                      {row.points}
                    </td>
                    </tr>
                  )
                })}
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <section id="biografia" className="scroll-mt-24">
          <article className="bg-card p-5 shadow-sm shadow-sm md:p-8">
            <h2 className="text-2xl font-black tracking-normal text-foreground md:text-4xl">
              <TranslatedText i18nKey="players.detail.biography" />
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
      </main>
    </div>
  )
}

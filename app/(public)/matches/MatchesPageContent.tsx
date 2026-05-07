import { createClient } from '@/lib/supabase/server'
import { canAccessMod, fetchSessionContext } from '@/lib/auth/permissions'
import { resolveLinkedPlayerIdentity, signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { MatchCard, type LineupSummary } from '@/components/matches/MatchCard'
import {
  MatchesListingChrome,
  type PersonalEmptyKind,
} from '@/components/matches/MatchesListingChrome'
import { sortGames } from '@/lib/games/sort'
import { getFeedbackEligibilityStartIso } from '@/lib/matches/pending-feedback'
import { fetchMatchCommentCounts } from '@/lib/matches/comment-counts'
import { fetchMatchWeather } from '@/lib/weather/open-meteo'
import type { MatchesView } from '@/lib/matches/matches-view'
import type { Game, Recinto } from '@/types'

export type { MatchesView } from '@/lib/matches/matches-view'
export type MatchesSearchParams = Promise<{ from?: string; to?: string }>

export async function MatchesPageContent({
  activeView,
  searchParams,
}: {
  activeView: MatchesView
  searchParams: MatchesSearchParams
}) {
  const { from, to } = await searchParams
  const supabase = await createClient()
  const session = await fetchSessionContext()
  const isApproved = session?.profile.approved ?? false
  const canCreateGame = Boolean(session?.profile.approved && canAccessMod(session.roles))
  const linkedPlayerPromise = session?.profile.approved
    ? resolveLinkedPlayerIdentity(session.userId, false)
    : Promise.resolve(null)

  let visibleGamesQuery = supabase.from('games').select('*')
  if (activeView === 'calendar') {
    visibleGamesQuery = visibleGamesQuery
      .eq('status', 'scheduled')
      .order('date', { ascending: true })
  } else if (activeView === 'results') {
    visibleGamesQuery = visibleGamesQuery
      .neq('status', 'scheduled')
      .order('date', { ascending: false })
  } else {
    visibleGamesQuery = visibleGamesQuery.order('date', { ascending: false })
  }

  if (from) visibleGamesQuery = visibleGamesQuery.gte('date', from)
  if (to) visibleGamesQuery = visibleGamesQuery.lte('date', to)

  let calendarCountQuery = supabase
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'scheduled')
  let resultsCountQuery = supabase
    .from('games')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'scheduled')

  if (from) {
    calendarCountQuery = calendarCountQuery.gte('date', from)
    resultsCountQuery = resultsCountQuery.gte('date', from)
  }
  if (to) {
    calendarCountQuery = calendarCountQuery.lte('date', to)
    resultsCountQuery = resultsCountQuery.lte('date', to)
  }

  const [
    visibleGamesResult,
    heroGameResult,
    calendarCountResult,
    resultsCountResult,
    totalGamesCountResult,
    linkedPlayer,
  ] = await Promise.all([
    visibleGamesQuery as unknown as PromiseLike<{ data: Game[] | null; error: unknown }>,
    supabase
      .from('games')
      .select('*')
      .eq('status', 'scheduled')
      .gte('date', 'now')
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle() as unknown as PromiseLike<{ data: Game | null; error: unknown }>,
    calendarCountQuery,
    resultsCountQuery,
    supabase.from('games').select('id', { count: 'exact', head: true }),
    linkedPlayerPromise,
  ])

  const visibleGames = sortGames(visibleGamesResult.data ?? [])
  const heroGame = heroGameResult.data
  const hasDateFilter = Boolean(from || to)
  const noGamesInDb = (totalGamesCountResult.count ?? 0) === 0

  let playerGameIds = new Set<string>()
  let mineCount = 0

  if (linkedPlayer) {
    const { data: playerGames } = await supabase
      .from('game_players')
      .select('game_id')
      .eq('player_id', linkedPlayer.id) as {
        data: Array<{ game_id: string }> | null
        error: unknown
      }

    playerGameIds = new Set((playerGames ?? []).map((game) => game.game_id))

    if (playerGameIds.size > 0) {
      let mineCountQuery = supabase
        .from('games')
        .select('id', { count: 'exact', head: true })
        .in('id', [...playerGameIds])

      if (from) mineCountQuery = mineCountQuery.gte('date', from)
      if (to) mineCountQuery = mineCountQuery.lte('date', to)

      const { count } = await mineCountQuery
      mineCount = count ?? 0
    }
  }

  const listedGames = activeView === 'mine'
    ? visibleGames.filter((game) => playerGameIds.has(game.id))
    : visibleGames
  const pendingFeedbackGameIds = new Set<string>()

  if (session && linkedPlayer && isApproved && activeView !== 'calendar') {
    const feedbackEligibilityStart = getFeedbackEligibilityStartIso()
    const eligibleMineGameIds = listedGames
      .filter((game) =>
        playerGameIds.has(game.id) &&
        game.status === 'finished' &&
        game.counts_for_stats === true &&
        game.date >= feedbackEligibilityStart
      )
      .map((game) => game.id)

    if (eligibleMineGameIds.length > 0) {
      const { data: submissions } = await supabase
        .from('rating_submissions')
        .select('game_id')
        .eq('submitted_by', session.userId)
        .in('game_id', eligibleMineGameIds) as {
          data: Array<{ game_id: string }> | null
          error: unknown
        }

      const submittedGameIds = new Set((submissions ?? []).map((submission) => submission.game_id))
      for (const gameId of eligibleMineGameIds) {
        if (!submittedGameIds.has(gameId)) pendingFeedbackGameIds.add(gameId)
      }
    }
  }

  const commentCountsPromise = fetchMatchCommentCounts(supabase, listedGames.map((game) => game.id))
  const lineupsByGame = new Map<string, LineupSummary>()

  if (listedGames.length > 0 && activeView !== 'results') {
    const gameIds = listedGames.map((g) => g.id)
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
    const playersById = new Map<string, { id: string; display_name: string; avatar_url: string | null; shirt_number: number | null; nationality: string }>()

    if (playerIds.length > 0) {
      const { data: players } = await supabase
        .from('players_public')
        .select('id, display_name, avatar_path, shirt_number, nationality')
        .in('id', playerIds) as {
          data: Array<{ id: string; display_name: string; avatar_path: string | null; shirt_number: number | null; nationality: string }> | null
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
        nationality: player.nationality,
        is_captain: gp.is_captain,
      }
      if (gp.team === 'a') entry.teamA.push(identity)
      else if (gp.team === 'b') entry.teamB.push(identity)
      else entry.unassigned.push(identity)
    }
  }

  const emptyAfterFilter = !noGamesInDb && listedGames.length === 0 && hasDateFilter
  let personalEmptyKind: PersonalEmptyKind = 'none'

  if (activeView === 'mine') {
    if (!session) personalEmptyKind = 'login'
    else if (!session.profile.approved) personalEmptyKind = 'pending'
    else if (!linkedPlayer) personalEmptyKind = 'no_player'
  }

  const emptyVisibleList = !noGamesInDb
    && listedGames.length === 0
    && personalEmptyKind === 'none'

  const recintoIds = [
    ...new Set(
      [heroGame, ...listedGames]
        .map((game) => game?.recinto_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const recintosById = new Map<string, Recinto>()

  if (recintoIds.length > 0) {
    const { data: recintos } = await supabase
      .from('recintos')
      .select('*')
      .in('id', recintoIds) as { data: Recinto[] | null; error: unknown }

    for (const recinto of recintos ?? []) {
      recintosById.set(recinto.id, recinto)
    }
  }

  const weatherByGameId = new Map<string, Awaited<ReturnType<typeof fetchMatchWeather>>>()
  if (heroGame?.status === 'scheduled') {
    const recinto = heroGame.recinto_id ? recintosById.get(heroGame.recinto_id) : null
    weatherByGameId.set(heroGame.id, await fetchMatchWeather(recinto, heroGame.date))
  }

  const commentCounts = await commentCountsPromise

  return (
    <MatchesListingChrome
      heroGame={heroGame}
      heroRecinto={heroGame?.recinto_id ? recintosById.get(heroGame.recinto_id) : null}
      heroWeather={heroGame ? weatherByGameId.get(heroGame.id) : null}
      activeView={activeView}
      from={from}
      to={to}
      calendarCount={calendarCountResult.count ?? 0}
      resultsCount={resultsCountResult.count ?? 0}
      mineCount={mineCount}
      noGamesInDb={noGamesInDb}
      emptyAfterFilter={emptyAfterFilter}
      emptyVisibleList={emptyVisibleList}
      personalEmptyKind={personalEmptyKind}
      canCreateGame={canCreateGame}
      listedGameCount={listedGames.length}
    >
      {listedGames.map((g) => (
        <MatchCard
          key={g.id}
          game={g}
          lineup={lineupsByGame.get(g.id)}
          showAvatars={isApproved}
          commentCount={commentCounts.get(g.id) ?? 0}
          recinto={g.recinto_id ? recintosById.get(g.recinto_id) : null}
          weather={weatherByGameId.get(g.id)}
          feedbackPending={pendingFeedbackGameIds.has(g.id)}
        />
      ))}
    </MatchesListingChrome>
  )
}

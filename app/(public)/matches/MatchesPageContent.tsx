import { createClient } from '@/lib/supabase/server'
import { canAccessMod, fetchSessionContext } from '@/lib/auth/permissions'
import { resolveLinkedPlayerIdentity, signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { MatchCard, type LineupSummary } from '@/components/matches/MatchCard'
import {
  MatchesListingChrome,
  type PersonalEmptyKind,
} from '@/components/matches/MatchesListingChrome'
import { filterGamesByDateRange } from '@/lib/games/filter-by-date-range'
import { sortGames } from '@/lib/games/sort'
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
  const linkedPlayer = session?.profile.approved
    ? await resolveLinkedPlayerIdentity(session.userId, false)
    : null

  const [{ data: games }, { data: heroGame }] = await Promise.all([
    supabase
      .from('games')
      .select('*'),
    supabase
      .from('games')
      .select('*')
      .eq('status', 'scheduled')
      .gte('date', 'now')
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]) as [
    { data: Game[] | null; error: unknown },
    { data: Game | null; error: unknown },
  ]

  const sorted = sortGames(games ?? [])
  const gameList = filterGamesByDateRange(sorted, from, to)
  const calendarGames = gameList.filter((game) => game.status === 'scheduled')
  const resultsGames = gameList.filter((game) => game.status !== 'scheduled')
  let playerGameIds = new Set<string>()

  if (linkedPlayer) {
    const { data: playerGames } = await supabase
      .from('game_players')
      .select('game_id')
      .eq('player_id', linkedPlayer.id) as {
        data: Array<{ game_id: string }> | null
        error: unknown
      }

    playerGameIds = new Set((playerGames ?? []).map((game) => game.game_id))
  }

  const mineGames = linkedPlayer
    ? gameList.filter((game) => playerGameIds.has(game.id))
    : []
  const visibleGames = activeView === 'calendar'
    ? calendarGames
    : activeView === 'results'
      ? resultsGames
      : mineGames
  const hasDateFilter = Boolean(from || to)
  const commentCounts = await fetchMatchCommentCounts(supabase, visibleGames.map((game) => game.id))

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

  const noGamesInDb = sorted.length === 0
  const emptyAfterFilter = !noGamesInDb && gameList.length === 0 && hasDateFilter

  let personalEmptyKind: PersonalEmptyKind = 'none'
  if (activeView === 'mine') {
    if (!session) personalEmptyKind = 'login'
    else if (!session.profile.approved) personalEmptyKind = 'pending'
    else if (!linkedPlayer) personalEmptyKind = 'no_player'
  }

  const emptyVisibleList = !noGamesInDb
    && gameList.length > 0
    && visibleGames.length === 0
    && personalEmptyKind === 'none'

  const recintoIds = [
    ...new Set(
      [heroGame, ...visibleGames]
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
  const weatherGamesById = new Map<string, Game>()
  for (const game of [heroGame, ...visibleGames]) {
    if (game?.status === 'scheduled') {
      weatherGamesById.set(game.id, game)
    }
  }

  if (weatherGamesById.size > 0) {
    const weatherEntries = await Promise.all(
      [...weatherGamesById.values()].map(async (game) => {
        const recinto = game.recinto_id ? recintosById.get(game.recinto_id) : null
        return [game.id, await fetchMatchWeather(recinto, game.date)] as const
      }),
    )

    for (const [gameId, weather] of weatherEntries) {
      weatherByGameId.set(gameId, weather)
    }
  }

  return (
      <MatchesListingChrome
        heroGame={heroGame}
        heroRecinto={heroGame?.recinto_id ? recintosById.get(heroGame.recinto_id) : null}
        heroWeather={heroGame ? weatherByGameId.get(heroGame.id) : null}
        activeView={activeView}
      from={from}
      to={to}
      calendarCount={calendarGames.length}
      resultsCount={resultsGames.length}
      mineCount={mineGames.length}
      noGamesInDb={noGamesInDb}
      emptyAfterFilter={emptyAfterFilter}
      emptyVisibleList={emptyVisibleList}
      personalEmptyKind={personalEmptyKind}
      canCreateGame={canCreateGame}
      listedGameCount={visibleGames.length}
    >
      {visibleGames.map((g) => (
        <MatchCard
          key={g.id}
          game={g}
          lineup={lineupsByGame.get(g.id)}
          showAvatars={isApproved}
          commentCount={commentCounts.get(g.id) ?? 0}
          recinto={g.recinto_id ? recintosById.get(g.recinto_id) : null}
          weather={weatherByGameId.get(g.id)}
        />
      ))}
    </MatchesListingChrome>
  )
}

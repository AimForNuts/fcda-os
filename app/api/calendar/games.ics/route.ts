import { createServiceClient } from '@/lib/supabase/server'
import { buildAllGamesCalendarIcs, buildPlayerCalendarIcs } from '@/lib/calendar/ics'
import { readPlayerCalendarToken } from '@/lib/calendar/token'
import { getRecintoMapsUrl } from '@/lib/recintos/google-maps'
import type { Game, Recinto } from '@/types'

export const dynamic = 'force-dynamic'

function getOrigin(request: Request) {
  return new URL(request.url).origin
}

type CalendarGame = Pick<Game, 'id' | 'date' | 'location' | 'recinto_id'> & {
  mapLocation?: string | null
  mapsUrl?: string | null
  latitude?: number | null
  longitude?: number | null
}
type PlayerTeam = 'a' | 'b'

const TEAM_LABELS: Record<PlayerTeam, string> = {
  a: 'Team White',
  b: 'Team Blue',
}

async function fetchGames(gameIds?: string[]) {
  if (gameIds && gameIds.length === 0) return []

  const admin = createServiceClient()
  let query = admin
    .from('games')
    .select('id, date, location, recinto_id')
    .neq('status', 'cancelled')
    .order('date', { ascending: true })

  if (gameIds) {
    query = query.in('id', gameIds)
  }

  const { data, error } = await query as {
    data: CalendarGame[] | null
    error: unknown
  }

  if (error) throw error
  const games = data ?? []
  const recintoIds = [...new Set(games.map((game) => game.recinto_id).filter((id): id is string => Boolean(id)))]

  if (recintoIds.length === 0) return games

  const { data: recintos, error: recintosError } = await admin
    .from('recintos')
    .select('id, name, google_place_id, formatted_address, latitude, longitude, maps_url')
    .in('id', recintoIds) as {
      data: Array<Pick<Recinto, 'id' | 'name' | 'google_place_id' | 'formatted_address' | 'latitude' | 'longitude' | 'maps_url'>> | null
      error: unknown
    }

  if (recintosError) throw recintosError

  const recintosById = new Map((recintos ?? []).map((recinto) => [recinto.id, recinto]))

  return games.map((game) => {
    const recinto = game.recinto_id ? recintosById.get(game.recinto_id) : null

    return {
      ...game,
      mapLocation: recinto?.formatted_address ?? recinto?.name ?? game.location,
      mapsUrl: getRecintoMapsUrl(recinto),
      latitude: recinto?.latitude ?? null,
      longitude: recinto?.longitude ?? null,
    }
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const playerToken = searchParams.get('player_id')
  const admin = createServiceClient()

  if (!playerToken) {
    const games = await fetchGames()
    const body = buildAllGamesCalendarIcs({
      games,
      origin: getOrigin(request),
    })

    return new Response(body, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="fcda-games.ics"',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  }

  const playerId = readPlayerCalendarToken(playerToken)
  if (!playerId) {
    return Response.json({ error: 'Invalid calendar player token' }, { status: 400 })
  }

  const { data: player, error: playerError } = await admin
    .from('players')
    .select('id, sheet_name')
    .eq('id', playerId)
    .maybeSingle() as {
      data: { id: string; sheet_name: string } | null
      error: unknown
    }

  if (playerError) {
    console.error('calendar player query failed', playerError)
    return Response.json({ error: 'Failed to build calendar' }, { status: 500 })
  }

  if (!player) {
    return Response.json({ error: 'Player not found' }, { status: 404 })
  }

  const { data: gamePlayers, error: gamePlayersError } = await admin
    .from('game_players')
    .select('game_id, team')
    .eq('player_id', player.id) as {
      data: Array<{ game_id: string; team: PlayerTeam | null }> | null
      error: unknown
    }

  if (gamePlayersError) {
    console.error('calendar game_players query failed', gamePlayersError)
    return Response.json({ error: 'Failed to build calendar' }, { status: 500 })
  }

  const gameIds = [...new Set((gamePlayers ?? []).map((row) => row.game_id))]
  const teamByGameId = new Map((gamePlayers ?? []).map((row) => [row.game_id, row.team]))
  const games = (await fetchGames(gameIds)).map((game) => {
    const team = teamByGameId.get(game.id)

    return {
      ...game,
      playerTeamLabel: team ? TEAM_LABELS[team] : null,
    }
  })
  const body = buildPlayerCalendarIcs({
    playerName: player.sheet_name,
    games,
    origin: getOrigin(request),
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="fcda-player-games.ics"',
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

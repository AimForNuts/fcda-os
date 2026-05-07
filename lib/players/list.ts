import { createClient } from '@/lib/supabase/server'
import {
  resolveLinkedPlayerIdentity,
  signPlayerAvatarRecords,
} from '@/lib/players/avatar.server'
import type { Player, PlayerPublic, PlayerStats, SessionContext } from '@/types'

export const PLAYERS_PAGE_SIZE = 12

export type PlayersListRow = Omit<PlayerPublic, 'current_rating' | 'description'> & {
  avatar_url?: string | null
  preferred_positions: string[]
  total_all: number
}

export type PlayersListResult = {
  players: PlayersListRow[]
  hasMore: boolean
  highlightedPlayerId: string | null
  isApproved: boolean
}

export async function fetchPlayersList({
  session,
  offset = 0,
  limit = PLAYERS_PAGE_SIZE,
  search = '',
  includeHighlight = false,
}: {
  session: SessionContext
  offset?: number
  limit?: number
  search?: string
  includeHighlight?: boolean
}): Promise<PlayersListResult> {
  const supabase = await createClient()
  const isApproved = session.profile.approved
  const trimmedSearch = search.trim()
  const rangeEnd = offset + limit

  const playersQuery = isApproved
    ? (() => {
        let query = supabase
          .from('players')
          .select('id, sheet_name, shirt_number, nationality, preferred_positions, profile_id, avatar_path')
          .not('profile_id', 'is', null)

        if (trimmedSearch) {
          query = query.ilike('sheet_name', `%${trimmedSearch}%`)
        }

        return query
          .order('shirt_number', { ascending: true, nullsFirst: false })
          .order('sheet_name', { ascending: true })
          .range(offset, rangeEnd)
          .overrideTypes<
            Array<
              Pick<
                Player,
                | 'id'
                | 'sheet_name'
                | 'shirt_number'
                | 'nationality'
                | 'preferred_positions'
                | 'profile_id'
                | 'avatar_path'
              >
            >,
            { merge: false }
          >()
      })()
    : (() => {
        let query = supabase
          .from('players_public')
          .select('id, display_name, shirt_number, nationality, profile_id, avatar_path')
          .not('profile_id', 'is', null)

        if (trimmedSearch) {
          query = query.ilike('display_name', `%${trimmedSearch}%`)
        }

        return query
          .order('shirt_number', { ascending: true, nullsFirst: false })
          .order('display_name', { ascending: true })
          .range(offset, rangeEnd)
          .overrideTypes<
            Array<
              Pick<
                PlayerPublic,
                | 'id'
                | 'display_name'
                | 'shirt_number'
                | 'nationality'
                | 'profile_id'
                | 'avatar_path'
              >
            >,
            { merge: false }
          >()
      })()

  const [playersRes, linkedPlayer] = await Promise.all([
    playersQuery,
    includeHighlight
      ? resolveLinkedPlayerIdentity(session.userId, isApproved)
      : Promise.resolve(null),
  ])

  const pageRows = playersRes.data ?? []
  const hasMore = pageRows.length > limit
  const visibleRows = pageRows.slice(0, limit)

  const playerRows = visibleRows.map((player) =>
    'sheet_name' in player
      ? {
          id: player.id,
          display_name: player.sheet_name,
          shirt_number: player.shirt_number,
          nationality: player.nationality,
          profile_id: player.profile_id,
          avatar_path: player.avatar_path,
          preferred_positions: player.preferred_positions ?? [],
        }
      : {
          ...player,
          preferred_positions: [],
        }
  )

  const playerIds = playerRows.map((player) => player.id)
  const { data: stats } = playerIds.length
    ? await supabase
        .from('player_stats')
        .select('id, total_all')
        .in('id', playerIds)
        .overrideTypes<Array<Pick<PlayerStats, 'id' | 'total_all'>>, { merge: false }>()
    : { data: [] }

  const totalsByPlayerId = new Map((stats ?? []).map((row) => [row.id, row.total_all]))
  const signedPlayers = await signPlayerAvatarRecords(playerRows, isApproved)

  return {
    players: signedPlayers.map((player) => ({
      ...player,
      total_all: totalsByPlayerId.get(player.id) ?? 0,
    })),
    hasMore,
    highlightedPlayerId: linkedPlayer?.id ?? null,
    isApproved,
  }
}

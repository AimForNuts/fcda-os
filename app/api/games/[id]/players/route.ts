import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'

type PlayerRow = {
  id: string
  sheet_name: string
  current_rating: number | null
  preferred_positions: string[]
  avatar_path: string | null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!canAccessMod(session.roles)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: gamePlayers, error: gamePlayersError } = await supabase
    .from('game_players')
    .select('player_id')
    .eq('game_id', id) as {
      data: Array<{ player_id: string }> | null
      error: unknown
    }

  if (gamePlayersError) {
    return Response.json({ error: 'Failed to fetch game players' }, { status: 500 })
  }

  const playerIds = [...new Set((gamePlayers ?? []).map((row) => row.player_id))]
  if (playerIds.length === 0) {
    return Response.json([])
  }

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, sheet_name, current_rating, preferred_positions, avatar_path')
    .in('id', playerIds)
    .order('sheet_name') as {
      data: PlayerRow[] | null
      error: unknown
    }

  if (playersError) {
    return Response.json({ error: 'Failed to fetch players' }, { status: 500 })
  }

  return Response.json(await signPlayerAvatarRecords(players ?? [], session.profile.approved))
}

import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'

type PlayerRow = {
  id: string
  sheet_name: string
  nationality: string
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
    .select('id, sheet_name, nationality, current_rating, preferred_positions, avatar_path')
    .in('id', playerIds)
    .order('sheet_name') as {
      data: PlayerRow[] | null
      error: unknown
    }

  if (playersError) {
    return Response.json({ error: 'Failed to fetch players' }, { status: 500 })
  }

  const baseList = await signPlayerAvatarRecords(players ?? [], session.profile.approved)

  // Fetch last 3 approved/processed ratings per player (ordered by game date)
  const { data: recentRatings } = await supabase
    .from('rating_submissions')
    .select('rated_player_id, rating, games(date)')
    .in('rated_player_id', playerIds)
    .in('status', ['approved', 'processed'])
    .order('created_at', { ascending: false }) as {
      data: Array<{ rated_player_id: string; rating: number; games: { date: string } | null }> | null
      error: unknown
    }

  // Group ratings by player, sorted by game date desc, keep last 3
  const ratingsByPlayer = new Map<string, number[]>()
  const sortedRatings = (recentRatings ?? [])
    .filter((r) => r.games?.date)
    .sort((a, b) => new Date(b.games!.date).getTime() - new Date(a.games!.date).getTime())
  for (const r of sortedRatings) {
    const existing = ratingsByPlayer.get(r.rated_player_id) ?? []
    if (existing.length < 3) {
      existing.push(r.rating)
      ratingsByPlayer.set(r.rated_player_id, existing)
    }
  }

  // Fetch player stats (total games + wins)
  const { data: statsRows } = await supabase
    .from('player_stats')
    .select('id, total_all, wins_all')
    .in('id', playerIds) as {
      data: Array<{ id: string; total_all: number; wins_all: number }> | null
      error: unknown
    }
  const statsMap = new Map((statsRows ?? []).map((s) => [s.id, s]))

  // Fetch recent feedback (non-null, approved/processed)
  const { data: feedbackRows } = await supabase
    .from('rating_submissions')
    .select('rated_player_id, feedback, created_at')
    .in('rated_player_id', playerIds)
    .in('status', ['approved', 'processed'])
    .not('feedback', 'is', null)
    .order('created_at', { ascending: false }) as {
      data: Array<{ rated_player_id: string; feedback: string; created_at: string }> | null
      error: unknown
    }

  const feedbackByPlayer = new Map<string, string[]>()
  for (const f of feedbackRows ?? []) {
    const existing = feedbackByPlayer.get(f.rated_player_id) ?? []
    if (existing.length < 3) {
      existing.push(f.feedback)
      feedbackByPlayer.set(f.rated_player_id, existing)
    }
  }

  const result = baseList.map((p) => {
    const stats = statsMap.get(p.id)
    const totalGames = stats?.total_all ?? 0
    const winPct = totalGames > 0 ? Math.round((stats!.wins_all / totalGames) * 100) : null
    return {
      ...p,
      last3Ratings: ratingsByPlayer.get(p.id) ?? [],
      totalGames,
      winPct,
      recentFeedback: feedbackByPlayer.get(p.id) ?? [],
    }
  })

  return Response.json(result)
}

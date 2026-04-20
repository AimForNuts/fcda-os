import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'

type SubmissionRow = {
  id: string
  gameDate: string
  gameLocation: string
  submitterName: string
  rating: number
  feedback: string | null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = createServiceClient()

  const { data: rows } = await admin
    .from('rating_submissions')
    .select('id, game_id, submitted_by, rating, feedback')
    .eq('rated_player_id', id)
    .eq('status', 'approved') as {
      data: Array<{
        id: string
        game_id: string
        submitted_by: string
        rating: number
        feedback: string | null
      }> | null
      error: unknown
    }

  if (!rows || rows.length === 0) {
    return Response.json({ submissions: [] })
  }

  const gameIds = [...new Set(rows.map((r) => r.game_id))]
  const submitterIds = [...new Set(rows.map((r) => r.submitted_by))]

  const [gamesRes, profilesRes] = await Promise.all([
    admin.from('games').select('id, date, location').in('id', gameIds),
    admin.from('profiles').select('id, display_name').in('id', submitterIds),
  ])

  const games = gamesRes.data as Array<{ id: string; date: string; location: string }> | null
  const profiles = profilesRes.data as Array<{ id: string; display_name: string }> | null

  const gameMap = new Map((games ?? []).map((g) => [g.id, g]))
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]))

  const sorted = [...rows].sort((a, b) => {
    const dateA = gameMap.get(a.game_id)?.date ?? ''
    const dateB = gameMap.get(b.game_id)?.date ?? ''
    return dateB.localeCompare(dateA)
  })

  const submissions: SubmissionRow[] = sorted.map((row) => {
    const game = gameMap.get(row.game_id)
    return {
      id: row.id,
      gameDate: game?.date ?? '',
      gameLocation: game?.location ?? '',
      submitterName: profileMap.get(row.submitted_by) ?? row.submitted_by,
      rating: row.rating,
      feedback: row.feedback,
    }
  })

  return Response.json({ submissions })
}

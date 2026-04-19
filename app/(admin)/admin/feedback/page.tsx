import { createServiceClient } from '@/lib/supabase/server'
import { FeedbackInbox } from './FeedbackInbox'

export type PlayerComment = {
  playerName: string
  content: string
}

export type FeedbackItem = {
  gameDate: string
  gameLocation: string
  submitterName: string
  comments: PlayerComment[]
}

export default async function AdminFeedbackPage() {
  const admin = createServiceClient()

  const { data: rows } = await admin
    .from('rating_submissions')
    .select('game_id, submitted_by, rated_player_id, feedback, created_at')
    .not('feedback', 'is', null)
    .order('created_at', { ascending: false }) as {
      data: Array<{
        game_id: string
        submitted_by: string
        rated_player_id: string
        feedback: string
        created_at: string
      }> | null
      error: unknown
    }

  if (!rows || rows.length === 0) {
    return (
      <div className="space-y-6">
        <FeedbackInbox items={[]} />
      </div>
    )
  }

  const groups = new Map<string, Array<{ game_id: string; submitted_by: string; rated_player_id: string; feedback: string; created_at: string }>>()
  for (const row of rows) {
    const key = `${row.game_id}:${row.submitted_by}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  const gameIds = [...new Set(rows.map((r) => r.game_id))]
  const submitterIds = [...new Set(rows.map((r) => r.submitted_by))]
  const playerIds = [...new Set(rows.map((r) => r.rated_player_id))]

  const [gamesRes, profilesRes, playersRes] = await Promise.all([
    admin.from('games').select('id, date, location').in('id', gameIds),
    admin.from('profiles').select('id, display_name').in('id', submitterIds),
    admin.from('players').select('id, sheet_name').in('id', playerIds),
  ])

  const games = gamesRes.data as Array<{ id: string; date: string; location: string }> | null
  const profiles = profilesRes.data as Array<{ id: string; display_name: string }> | null
  const players = playersRes.data as Array<{ id: string; sheet_name: string }> | null

  const gameMap = new Map((games ?? []).map((g) => [g.id, { date: g.date, location: g.location }]))
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]))
  const playerMap = new Map((players ?? []).map((p) => [p.id, p.sheet_name]))

  const items: FeedbackItem[] = [...groups.values()].map((group) => {
    const first = group[0]
    const game = gameMap.get(first.game_id)
    return {
      gameDate: game?.date ?? '',
      gameLocation: game?.location ?? '',
      submitterName: profileMap.get(first.submitted_by) ?? first.submitted_by,
      comments: group.map((r) => ({
        playerName: playerMap.get(r.rated_player_id) ?? r.rated_player_id,
        content: r.feedback,
      })),
    }
  })

  return (
    <div className="space-y-6">
      <FeedbackInbox items={items} />
    </div>
  )
}

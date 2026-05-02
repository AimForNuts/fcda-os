import { createServiceClient } from '@/lib/supabase/server'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { FeedbackInbox } from './FeedbackInbox'

export type PlayerComment = {
  id: string
  playerName: string
  playerNationality: string
  playerAvatarUrl: string | null
  content: string
}

export type FeedbackItem = {
  groupId: string
  gameId: string
  gameDate: string
  gameLocation: string
  submitterName: string
  submitterAvatarUrl: string | null
  comments: PlayerComment[]
}

type FeedbackRow = {
  id: string
  game_id: string
  submitted_by: string
  rated_player_id: string
  feedback: string
  created_at: string
}

export default async function AdminFeedbackPage() {
  const admin = createServiceClient()

  const { data: rows } = await admin
    .from('rating_submissions')
    .select('id, game_id, submitted_by, rated_player_id, feedback, created_at')
    .not('feedback', 'is', null)
    .order('created_at', { ascending: false }) as {
      data: FeedbackRow[] | null
      error: unknown
    }

  if (!rows || rows.length === 0) {
    return (
      <div className="space-y-6">
        <FeedbackInbox items={[]} />
      </div>
    )
  }

  const groups = new Map<string, FeedbackRow[]>()
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
    admin.from('players').select('id, sheet_name, nationality, profile_id, avatar_path').or(
      `id.in.(${playerIds.join(',')}),profile_id.in.(${submitterIds.join(',')})`
    ),
  ])

  const games = gamesRes.data as Array<{ id: string; date: string; location: string }> | null
  const profiles = profilesRes.data as Array<{ id: string; display_name: string }> | null
  const players = await signPlayerAvatarRecords(
    (playersRes.data as Array<{ id: string; sheet_name: string; nationality: string; profile_id: string | null; avatar_path: string | null }> | null) ?? [],
    true
  )

  const gameMap = new Map((games ?? []).map((g) => [g.id, { date: g.date, location: g.location }]))
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]))
  const playerMap = new Map(players.map((p) => [p.id, p]))
  const submitterPlayerMap = new Map(players.flatMap((p) => p.profile_id ? [[p.profile_id, p]] : []))

  const items: FeedbackItem[] = [...groups.values()].map((group) => {
    const first = group[0]
    const game = gameMap.get(first.game_id)
    return {
      groupId: `${first.game_id}:${first.submitted_by}`,
      gameId: first.game_id,
      gameDate: game?.date ?? '',
      gameLocation: game?.location ?? '',
      submitterName: profileMap.get(first.submitted_by) ?? first.submitted_by,
      submitterAvatarUrl: submitterPlayerMap.get(first.submitted_by)?.avatar_url ?? null,
      comments: group.map((r) => ({
        id: r.id,
        playerName: playerMap.get(r.rated_player_id)?.sheet_name ?? r.rated_player_id,
        playerNationality: playerMap.get(r.rated_player_id)?.nationality ?? 'PT',
        playerAvatarUrl: playerMap.get(r.rated_player_id)?.avatar_url ?? null,
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

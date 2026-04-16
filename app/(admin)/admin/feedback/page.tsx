import { createServiceClient } from '@/lib/supabase/server'
import { FeedbackInbox, type FeedbackItem } from './FeedbackInbox'

type FeedbackRow = {
  id: string
  content: string
  status: 'open' | 'closed'
  submitted_by: string
  game_id: string
  created_at: string
}

export default async function AdminFeedbackPage() {
  const admin = createServiceClient()

  const { data: rows } = await admin
    .from('feedback')
    .select('id, content, status, submitted_by, game_id, created_at')
    .order('created_at', { ascending: false }) as {
      data: FeedbackRow[] | null
      error: unknown
    }

  const feedback = rows ?? []

  if (feedback.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Sem feedback em aberto.</p>
      </div>
    )
  }

  const gameIds = [...new Set(feedback.map((f) => f.game_id))]
  const submitterIds = [...new Set(feedback.map((f) => f.submitted_by))]

  const [gamesRes, profilesRes] = await Promise.all([
    admin.from('games').select('id, date, location').in('id', gameIds),
    admin.from('profiles').select('id, display_name').in('id', submitterIds),
  ])

  const games = gamesRes.data as Array<{ id: string; date: string; location: string }> | null
  const profiles = profilesRes.data as Array<{ id: string; display_name: string }> | null

  const gameMap = new Map((games ?? []).map((g) => [g.id, g]))
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]))

  function toItem(row: FeedbackRow): FeedbackItem {
    const game = gameMap.get(row.game_id)
    return {
      id: row.id,
      gameDate: game?.date ?? '',
      gameLocation: game?.location ?? '',
      submitterName: profileMap.get(row.submitted_by) ?? row.submitted_by,
      content: row.content,
    }
  }

  const open = feedback.filter((f) => f.status === 'open').map(toItem)
  const closed = feedback.filter((f) => f.status === 'closed').map(toItem)

  return (
    <div className="space-y-6">
      <FeedbackInbox open={open} closed={closed} />
    </div>
  )
}

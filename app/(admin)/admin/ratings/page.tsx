import { createServiceClient } from '@/lib/supabase/server'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { TranslatedText } from '@/components/i18n/TranslatedText'
import { RatingBatches, type Batch } from './RatingBatches'

type PendingRow = {
  id: string
  game_id: string
  submitted_by: string
  rated_player_id: string
  rating: number
  feedback: string | null
}

export default async function AdminRatingsPage() {
  const admin = createServiceClient()

  const { data: submissions } = await admin
    .from('rating_submissions')
    .select('id, game_id, submitted_by, rated_player_id, rating, feedback')
    .eq('status', 'pending') as { data: PendingRow[] | null; error: unknown }

  const rows = submissions ?? []

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground"><TranslatedText i18nKey="admin.noRatings" /></p>
    )
  }

  const gameIds = [...new Set(rows.map((r) => r.game_id))]
  const submitterIds = [...new Set(rows.map((r) => r.submitted_by))]
  const playerIds = [...new Set(rows.map((r) => r.rated_player_id))]

  const [gamesRes, submittersRes, playersRes] = await Promise.all([
    admin.from('games').select('id, date, location').in('id', gameIds),
    admin.from('profiles').select('id, display_name').in('id', submitterIds),
    admin.from('players').select('id, sheet_name, nationality, avatar_path').in('id', playerIds),
  ])

  const games = gamesRes.data as Array<{ id: string; date: string; location: string }> | null
  const submitters = submittersRes.data as Array<{ id: string; display_name: string }> | null
  const players = await signPlayerAvatarRecords(
    (playersRes.data as Array<{ id: string; sheet_name: string; nationality: string; avatar_path: string | null }> | null) ?? [],
    true
  )

  const gameMap = new Map((games ?? []).map((g) => [g.id, g]))
  const submitterMap = new Map((submitters ?? []).map((p) => [p.id, p.display_name]))
  const playerMap = new Map(players.map((p) => [p.id, p]))

  const batchMap = new Map<string, Batch>()
  for (const row of rows) {
    const key = `${row.game_id}::${row.submitted_by}`
    if (!batchMap.has(key)) {
      const game = gameMap.get(row.game_id)
      batchMap.set(key, {
        gameId: row.game_id,
        submittedBy: row.submitted_by,
        gameDate: game?.date ?? '',
        gameLocation: game?.location ?? '',
        submitterName: submitterMap.get(row.submitted_by) ?? row.submitted_by,
        items: [],
      })
    }
    batchMap.get(key)!.items.push({
      playerId: row.rated_player_id,
      playerName: playerMap.get(row.rated_player_id)?.sheet_name ?? row.rated_player_id,
      playerNationality: playerMap.get(row.rated_player_id)?.nationality ?? 'PT',
      playerAvatarUrl: playerMap.get(row.rated_player_id)?.avatar_url ?? null,
      rating: row.rating,
      feedback: row.feedback,
    })
  }

  // Sort: newest game first, then submitter name alphabetically
  const batches = Array.from(batchMap.values()).sort((a, b) => {
    const dateDiff = new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime()
    if (dateDiff !== 0) return dateDiff
    return a.submitterName.localeCompare(b.submitterName)
  })

  return (
    <div className="space-y-6">
      <RatingBatches batches={batches} />
    </div>
  )
}

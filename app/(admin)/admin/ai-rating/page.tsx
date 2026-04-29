import { createServiceClient } from '@/lib/supabase/server'
import { AiRatingClient } from './AiRatingClient'

export type PlayerRow = {
  player_id: string
  player_name: string
  current_rating: number | null
  pending_count: number
}

export default async function AiRatingPage() {
  const admin = createServiceClient()

  const { data: players } = await admin
    .from('players')
    .select('id, sheet_name, current_rating')
    .order('sheet_name') as {
      data: Array<{ id: string; sheet_name: string; current_rating: number | null }> | null
      error: unknown
    }

  const playerList = players ?? []
  const playerIds = playerList.map((p) => p.id)

  const pendingCounts = new Map<string, number>()
  if (playerIds.length > 0) {
    const { data: submissions } = await admin
      .from('rating_submissions')
      .select('rated_player_id')
      .in('rated_player_id', playerIds)
      .eq('status', 'approved') as {
        data: Array<{ rated_player_id: string }> | null
        error: unknown
      }
    for (const s of submissions ?? []) {
      pendingCounts.set(s.rated_player_id, (pendingCounts.get(s.rated_player_id) ?? 0) + 1)
    }
  }

  const rows: PlayerRow[] = playerList.map((p) => ({
    player_id: p.id,
    player_name: p.sheet_name,
    current_rating: p.current_rating,
    pending_count: pendingCounts.get(p.id) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fcda-navy">AI Rating</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Actualizar avaliações dos jogadores com IA
        </p>
      </div>
      <AiRatingClient players={rows} />
    </div>
  )
}

import { createServiceClient } from '@/lib/supabase/server'

export function getFeedbackEligibilityStartIso(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export async function countPendingFeedbackGames({
  userId,
  linkedPlayerId,
}: {
  userId: string
  linkedPlayerId: string | null | undefined
}) {
  if (!linkedPlayerId) return 0

  const supabase = createServiceClient()

  const { data: playerGames } = await supabase
    .from('game_players')
    .select('game_id')
    .eq('player_id', linkedPlayerId) as {
      data: Array<{ game_id: string }> | null
      error: unknown
    }

  const playerGameIds = [...new Set((playerGames ?? []).map((game) => game.game_id))]
  if (playerGameIds.length === 0) return 0

  const [{ data: eligibleGames }, { data: submissions }] = await Promise.all([
    supabase
      .from('games')
      .select('id')
      .in('id', playerGameIds)
      .eq('status', 'finished')
      .eq('counts_for_stats', true)
      .gte('date', getFeedbackEligibilityStartIso()) as unknown as PromiseLike<{
        data: Array<{ id: string }> | null
        error: unknown
      }>,
    supabase
      .from('rating_submissions')
      .select('game_id')
      .eq('submitted_by', userId)
      .in('game_id', playerGameIds) as unknown as PromiseLike<{
        data: Array<{ game_id: string }> | null
        error: unknown
      }>,
  ])

  const submittedGameIds = new Set((submissions ?? []).map((submission) => submission.game_id))

  return (eligibleGames ?? []).filter((game) => !submittedGameIds.has(game.id)).length
}

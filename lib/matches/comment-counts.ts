import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export async function fetchMatchCommentCounts(
  supabase: SupabaseServerClient,
  gameIds: string[]
) {
  if (gameIds.length === 0) {
    return new Map<string, number>()
  }

  const { data, error } = await supabase.rpc('get_match_comment_counts', {
    p_game_ids: gameIds,
  }) as {
    data: Array<{ game_id: string; comment_count: number }> | null
    error: unknown
  }

  if (error) {
    console.error('match comment counts fetch failed', error)
    return new Map<string, number>()
  }

  return new Map((data ?? []).map((row) => [row.game_id, Number(row.comment_count)]))
}

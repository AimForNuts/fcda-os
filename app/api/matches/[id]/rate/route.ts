import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'

const schema = z.object({
  ratings: z.record(z.string().uuid(), z.number().min(0).max(10)),
  content: z.string().max(1000).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!session.profile.approved) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: gameId } = await params

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const supabase = await createClient()
  const admin = createServiceClient()

  // 1. Game must be finished and counts_for_stats
  const { data: game } = await supabase
    .from('games')
    .select('status, counts_for_stats')
    .eq('id', gameId)
    .single() as { data: { status: string; counts_for_stats: boolean } | null; error: unknown }

  if (!game) return Response.json({ error: 'Not found' }, { status: 404 })
  if (game.status !== 'finished' || !game.counts_for_stats) {
    return Response.json({ error: 'Game not eligible for ratings' }, { status: 422 })
  }

  // 2. Find submitter's linked player (use service client — players table is not in players_public)
  const { data: linkedPlayer } = await admin
    .from('players')
    .select('id')
    .eq('profile_id', session.userId)
    .single() as { data: { id: string } | null; error: unknown }

  if (!linkedPlayer) return Response.json({ error: 'No linked player' }, { status: 403 })

  // 3. Submitter's player must be in the game
  const { data: submitterInGame } = await supabase
    .from('game_players')
    .select('player_id')
    .eq('game_id', gameId)
    .eq('player_id', linkedPlayer.id)
    .single() as { data: { player_id: string } | null; error: unknown }

  if (!submitterInGame) return Response.json({ error: 'Not in lineup' }, { status: 403 })

  // 4. No self-rating
  const { ratings, content } = parsed.data
  if (Object.keys(ratings).length === 0) {
    return Response.json({ error: 'No ratings provided' }, { status: 422 })
  }
  if (ratings[linkedPlayer.id] !== undefined) {
    return Response.json({ error: 'Cannot rate yourself' }, { status: 422 })
  }

  // 5. All rated players must be in the lineup
  const ratedPlayerIds = Object.keys(ratings)
  if (ratedPlayerIds.length > 0) {
    const { data: lineupPlayers } = await supabase
      .from('game_players')
      .select('player_id')
      .eq('game_id', gameId)
      .in('player_id', ratedPlayerIds) as { data: Array<{ player_id: string }> | null; error: unknown }

    const lineupSet = new Set((lineupPlayers ?? []).map((gp) => gp.player_id))
    for (const pid of ratedPlayerIds) {
      if (!lineupSet.has(pid)) {
        return Response.json({ error: 'Rated player not in lineup' }, { status: 422 })
      }
    }
  }

  // 6. Check if batch is locked (any submission already approved)
  const { data: existingBatch } = await admin
    .from('rating_submissions')
    .select('status')
    .eq('game_id', gameId)
    .eq('submitted_by', session.userId) as { data: Array<{ status: string }> | null; error: unknown }

  const isLocked = (existingBatch ?? []).some((s) => s.status === 'approved')
  if (isLocked) return Response.json({ error: 'Locked' }, { status: 403 })

  // 7. Upsert — one row per rated player
  const rows = Object.entries(ratings).map(([rated_player_id, rating]) => ({
    game_id: gameId,
    submitted_by: session.userId,
    rated_player_id,
    rating: Math.round(rating * 100) / 100,
    status: 'pending' as const,
    reviewed_by: null,
    reviewed_at: null,
  }))

  const { error: upsertErr } = await (admin.from('rating_submissions') as any)
    .upsert(rows, { onConflict: 'game_id,submitted_by,rated_player_id' })

  if (upsertErr) return Response.json({ error: 'Failed to submit' }, { status: 500 })

  // Upsert feedback if content was provided
  if (content && content.trim()) {
    const { error: feedbackErr } = await (admin.from('feedback') as any)
      .upsert(
        [{ game_id: gameId, submitted_by: session.userId, content: content.trim(), status: 'open' }],
        { onConflict: 'game_id,submitted_by' }
      )
    if (feedbackErr) console.error(`feedback upsert failed for game ${gameId}`, feedbackErr)
  }

  return Response.json({ ok: true })
}

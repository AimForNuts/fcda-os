import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'

const schema = z.object({
  action: z.enum(['approve', 'reject']),
  gameId: z.string().uuid(),
  submittedBy: z.string().uuid(),
})

export async function PATCH(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles))
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { action, gameId, submittedBy } = parsed.data
  const admin = createServiceClient()
  const now = new Date().toISOString()

  // Fetch the pending batch
  const { data: batch } = (await admin
    .from('rating_submissions')
    .select('id, rated_player_id, rating')
    .eq('game_id', gameId)
    .eq('submitted_by', submittedBy)
    .eq('status', 'pending')) as {
    data: Array<{ id: string; rated_player_id: string; rating: number }> | null
    error: unknown
  }

  if (!batch || batch.length === 0) {
    return Response.json(
      { error: 'No pending submissions found' },
      { status: 404 },
    )
  }

  if (action === 'reject') {
    const { error } = await (admin.from('rating_submissions') as any)
      .update({
        status: 'rejected',
        reviewed_by: session.userId,
        reviewed_at: now,
      })
      .eq('game_id', gameId)
      .eq('submitted_by', submittedBy)
      .eq('status', 'pending')

    if (error)
      return Response.json({ error: 'Failed to reject' }, { status: 500 })

    const { error: auditErr } = await admin.from('audit_log').insert({
      action: 'rating.rejected',
      performed_by: session.userId,
      target_id: gameId,
      target_type: 'game',
      metadata: { submittedBy, playerCount: batch.length },
    } as any)
    if (auditErr) console.error('audit_log insert failed', auditErr)

    return Response.json({ ok: true })
  }

  // Approve: mark all as approved
  const { error: approveErr } = await (admin.from('rating_submissions') as any)
    .update({
      status: 'approved',
      reviewed_by: session.userId,
      reviewed_at: now,
    })
    .eq('game_id', gameId)
    .eq('submitted_by', submittedBy)
    .eq('status', 'pending')

  if (approveErr)
    return Response.json({ error: 'Failed to approve' }, { status: 500 })

  // Per submission: insert rating_history and recalculate current_rating
  for (const submission of batch) {
    // Fetch player's current rating for the history record
    const { data: player } = (await admin
      .from('players')
      .select('current_rating')
      .eq('id', submission.rated_player_id)
      .single()) as {
      data: { current_rating: number | null } | null
      error: unknown
    }

    const { error: historyErr } = await admin.from('rating_history').insert({
      player_id: submission.rated_player_id,
      rating: submission.rating,
      previous_rating: player?.current_rating ?? null,
      changed_by: session.userId,
    } as any)
    if (historyErr) console.error('rating_history insert failed', historyErr)

    // Recalculate: average of ALL approved submissions for this player across all games
    const { data: approvedRatings } = (await admin
      .from('rating_submissions')
      .select('rating')
      .eq('rated_player_id', submission.rated_player_id)
      .eq('status', 'approved')) as {
      data: Array<{ rating: number }> | null
      error: unknown
    }

    const allRatings = approvedRatings ?? []
    if (allRatings.length === 0) continue

    const avg =
      allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
    const newRating = Math.round(avg * 100) / 100

    const { error: updateErr } = await (admin.from('players') as any)
      .update({ current_rating: newRating, updated_at: now })
      .eq('id', submission.rated_player_id)
    if (updateErr)
      console.error('players current_rating update failed', updateErr)
  }

  const { error: auditErr } = await admin.from('audit_log').insert({
    action: 'rating.approved',
    performed_by: session.userId,
    target_id: gameId,
    target_type: 'game',
    metadata: { submittedBy, playerCount: batch.length },
  } as any)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ ok: true })
}

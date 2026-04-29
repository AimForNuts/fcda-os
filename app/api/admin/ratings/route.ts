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
  if (!canAccessAdmin(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { action, gameId, submittedBy } = parsed.data
  const admin = createServiceClient()
  const now = new Date().toISOString()

  // Fetch the pending batch
  const { data: batch } = await admin
    .from('rating_submissions')
    .select('id, rated_player_id, rating')
    .eq('game_id', gameId)
    .eq('submitted_by', submittedBy)
    .eq('status', 'pending') as {
      data: Array<{ id: string; rated_player_id: string; rating: number }> | null
      error: unknown
    }

  if (!batch || batch.length === 0) {
    return Response.json({ error: 'No pending submissions found' }, { status: 404 })
  }

  if (action === 'reject') {
    const { error } = await (admin.from('rating_submissions') as any)
      .update({ status: 'rejected', reviewed_by: session.userId, reviewed_at: now })
      .eq('game_id', gameId)
      .eq('submitted_by', submittedBy)
      .eq('status', 'pending')

    if (error) return Response.json({ error: 'Failed to reject' }, { status: 500 })

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

  // Approve: mark all as approved (current_rating is updated via AI Rating tab only)
  const { error: approveErr } = await (admin.from('rating_submissions') as any)
    .update({ status: 'approved', reviewed_by: session.userId, reviewed_at: now })
    .eq('game_id', gameId)
    .eq('submitted_by', submittedBy)
    .eq('status', 'pending')

  if (approveErr) return Response.json({ error: 'Failed to approve' }, { status: 500 })

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

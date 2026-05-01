import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'
import type { Database } from '@/types/database'

const schema = z.object({
  feedback: z.string().max(300).nullable(),
})

type RatingSubmissionUpdate = Pick<
  Database['public']['Tables']['rating_submissions']['Update'],
  'feedback'
>

type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert']

type UpdateOnly<TInput> = {
  update(values: TInput): {
    eq(column: string, value: string): PromiseLike<{ error: unknown }>
  }
}

type InsertOnly<TInput> = {
  insert(values: TInput): PromiseLike<{ error: unknown }>
}

async function requireAdminSession() {
  const session = await fetchSessionContext()
  if (!session) return { response: Response.json({ error: 'Unauthorised' }, { status: 401 }) }
  if (!canAccessAdmin(session.roles)) {
    return { response: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession()
  if ('response' in auth) return auth.response

  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const feedback = parsed.data.feedback?.trim() || null
  return updateFeedback(id, feedback, auth.session.userId, 'rating_feedback.updated')
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession()
  if ('response' in auth) return auth.response

  const { id } = await params
  return updateFeedback(id, null, auth.session.userId, 'rating_feedback.removed')
}

async function updateFeedback(
  id: string,
  feedback: string | null,
  userId: string,
  action: string
) {
  const admin = createServiceClient()

  const { data: existing } = await admin
    .from('rating_submissions')
    .select('id')
    .eq('id', id)
    .maybeSingle() as { data: { id: string } | null; error: unknown }

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const ratingSubmissions = admin
    .from('rating_submissions') as unknown as UpdateOnly<RatingSubmissionUpdate>

  const { error } = await ratingSubmissions
    .update({ feedback })
    .eq('id', id)

  if (error) return Response.json({ error: 'Failed to update feedback' }, { status: 500 })

  const auditLog = admin.from('audit_log') as unknown as InsertOnly<AuditLogInsert>
  const { error: auditErr } = await auditLog.insert({
    action,
    performed_by: userId,
    target_id: id,
    target_type: 'rating_submission',
  })
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ ok: true })
}

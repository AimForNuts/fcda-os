import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'

const schema = z.object({
  action: z.enum(['close']),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles))
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createServiceClient()
  const now = new Date().toISOString()

  // Verify the feedback exists and is currently open
  const { data: existing } = (await admin
    .from('feedback')
    .select('status')
    .eq('id', id)
    .single()) as { data: { status: string } | null; error: unknown }

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  if (existing.status === 'closed')
    return Response.json({ error: 'Already closed' }, { status: 400 })

  const { error: updateErr } = await (admin.from('feedback') as any)
    .update({ status: 'closed', closed_by: session.userId, closed_at: now })
    .eq('id', id)
    .eq('status', 'open')

  if (updateErr)
    return Response.json({ error: 'Failed to close feedback' }, { status: 500 })

  const { error: auditErr } = await admin.from('audit_log').insert({
    action: 'feedback.closed',
    performed_by: session.userId,
    target_id: id,
    target_type: 'feedback',
  } as any)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ ok: true })
}

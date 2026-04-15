import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'

const schema = z.union([
  z.object({ approved: z.literal(true) }),
  z.object({ approved: z.literal(false) }),
  z.object({ addRole: z.enum(['mod', 'admin']) }),
  z.object({ removeRole: z.enum(['mod', 'admin']) }),
])

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createServiceClient()

  if ('approved' in parsed.data) {
    if (!parsed.data.approved && id === session.userId) {
      return Response.json({ error: 'Cannot unapprove your own account' }, { status: 400 })
    }
    const { error } = await (admin.from('profiles') as any)
      .update({ approved: parsed.data.approved, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return Response.json({ error: 'Failed to update approval' }, { status: 500 })

    if (parsed.data.approved) {
      // Auto-assign player role on approval
      await (admin.from('user_roles') as any).upsert(
        { user_id: id, role: 'player', assigned_by: session.userId },
        { ignoreDuplicates: true }
      )
    } else {
      // Remove all roles on unapproval
      await admin.from('user_roles').delete().eq('user_id', id)
    }

    const { error: auditErr } = await admin.from('audit_log').insert({
      action: parsed.data.approved ? 'user.approved' : 'user.unapproved',
      performed_by: session.userId,
      target_id: id,
      target_type: 'user',
    } as any)
    if (auditErr) console.error('audit_log insert failed', auditErr)

    return Response.json({ ok: true })
  }

  if ('addRole' in parsed.data) {
    // Verify user is approved before granting extra roles
    const { data: profile } = await admin
      .from('profiles')
      .select('approved')
      .eq('id', id)
      .single() as { data: { approved: boolean } | null; error: unknown }

    if (!profile?.approved) {
      return Response.json({ error: 'User must be approved before assigning roles' }, { status: 400 })
    }

    await (admin.from('user_roles') as any).upsert(
      { user_id: id, role: parsed.data.addRole, assigned_by: session.userId },
      { ignoreDuplicates: true }
    )

    const { error: auditErr } = await admin.from('audit_log').insert({
      action: 'user.role.added',
      performed_by: session.userId,
      target_id: id,
      target_type: 'user',
      metadata: { role: parsed.data.addRole },
    } as any)
    if (auditErr) console.error('audit_log insert failed', auditErr)

    return Response.json({ ok: true })
  }

  if ('removeRole' in parsed.data) {
    const { error: deleteErr } = await admin.from('user_roles')
      .delete()
      .eq('user_id', id)
      .eq('role', parsed.data.removeRole)
    if (deleteErr) return Response.json({ error: 'Failed to remove role' }, { status: 500 })

    const { error: auditErr } = await admin.from('audit_log').insert({
      action: 'user.role.removed',
      performed_by: session.userId,
      target_id: id,
      target_type: 'user',
      metadata: { role: parsed.data.removeRole },
    } as any)
    if (auditErr) console.error('audit_log insert failed', auditErr)

    return Response.json({ ok: true })
  }

  return Response.json({ error: 'Invalid body' }, { status: 400 })
}

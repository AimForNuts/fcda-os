import { z } from 'zod'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type ProfileUpdate = Pick<
  Database['public']['Tables']['profiles']['Update'],
  'display_name' | 'updated_at'
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

const schema = z.object({
  display_name: z.string().trim().min(1).max(100),
})

export async function PATCH(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const admin = createServiceClient()
  const profiles = admin.from('profiles') as unknown as UpdateOnly<ProfileUpdate>
  const auditLog = admin.from('audit_log') as unknown as InsertOnly<AuditLogInsert>
  const displayName = parsed.data.display_name

  const { error } = await profiles
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq('id', session.userId)

  if (error) {
    return Response.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  await admin.auth.admin.updateUserById(session.userId, {
    user_metadata: { display_name: displayName },
  })

  const { error: auditErr } = await auditLog.insert({
    action: 'user.profile.updated',
    performed_by: session.userId,
    target_id: session.userId,
    target_type: 'user',
    metadata: { actor: 'self', display_name: displayName },
  })
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ ok: true, display_name: displayName })
}

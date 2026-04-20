import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; aliasId: string }> },
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles))
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id, aliasId } = await params

  const admin = createServiceClient()

  // Verify the alias belongs to this player
  const { data: existing } = (await admin
    .from('player_aliases')
    .select('id')
    .eq('id', aliasId)
    .eq('player_id', id)
    .maybeSingle()) as { data: { id: string } | null; error: unknown }

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const { error: deleteErr } = await admin
    .from('player_aliases')
    .delete()
    .eq('id', aliasId)
  if (deleteErr)
    return Response.json({ error: 'Failed to delete alias' }, { status: 500 })

  const { error: auditErr } = await admin.from('audit_log').insert({
    action: 'player.alias.removed',
    performed_by: session.userId,
    target_id: id,
    target_type: 'player',
    metadata: { aliasId },
  } as any)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return new Response(null, { status: 204 })
}

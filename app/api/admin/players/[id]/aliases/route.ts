import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'
import { normaliseAlias } from '@/lib/whatsapp/parser'

const schema = z.object({
  alias_display: z.string().min(1).max(100),
})

export async function POST(
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
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const admin = createServiceClient()

  const { data: alias, error } = (await (admin.from('player_aliases') as any)
    .insert({
      player_id: id,
      alias: normaliseAlias(parsed.data.alias_display),
      alias_display: parsed.data.alias_display,
    })
    .select('id, alias_display')
    .single()) as {
    data: { id: string; alias_display: string } | null
    error: unknown
  }

  if (error || !alias)
    return Response.json({ error: 'Failed to add alias' }, { status: 500 })

  const { error: auditErr } = await admin.from('audit_log').insert({
    action: 'player.alias.added',
    performed_by: session.userId,
    target_id: id,
    target_type: 'player',
    metadata: { alias_display: parsed.data.alias_display },
  } as any)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json(alias, { status: 201 })
}

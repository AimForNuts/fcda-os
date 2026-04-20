import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import { normaliseAlias } from '@/lib/whatsapp/parser'

const schema = z.object({
  player_id: z.string().uuid(),
  alias_display: z.string().min(1).max(100),
})

export async function POST(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles))
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const admin = createServiceClient()

  const { error } = await (admin.from('player_aliases') as any).insert({
    player_id: parsed.data.player_id,
    alias: normaliseAlias(parsed.data.alias_display),
    alias_display: parsed.data.alias_display,
  })

  if (error)
    return Response.json({ error: 'Failed to save alias' }, { status: 500 })

  return Response.json({ ok: true }, { status: 201 })
}

import { z } from 'zod'
import type { Database } from '@/types/database'
import { createServiceClient } from '@/lib/supabase/server'
import { canAccessAdmin, fetchSessionContext } from '@/lib/auth/permissions'

type PlayerUpdate = Database['public']['Tables']['players']['Update']

const schema = z.object({
  description: z.string().max(1600).nullable(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!session.profile.approved) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const admin = createServiceClient()
  const { data: player } = await admin
    .from('players')
    .select('id, profile_id')
    .eq('id', id)
    .maybeSingle()

  if (!player) return Response.json({ error: 'Player not found' }, { status: 404 })

  const canEdit = canAccessAdmin(session.roles) || player.profile_id === session.userId
  if (!canEdit) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const description = parsed.data.description?.trim() || null
  const updates: PlayerUpdate = {
    description,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin
    .from('players')
    .update(updates)
    .eq('id', id)

  if (error) return Response.json({ error: 'Failed to update description' }, { status: 500 })

  return Response.json({ ok: true, description })
}

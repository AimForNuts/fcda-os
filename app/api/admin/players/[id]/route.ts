import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'

const POSITIONS = ['GK', 'CB', 'CM', 'W', 'ST'] as const

const schema = z.object({
  sheet_name: z.string().min(1).max(100).optional(),
  shirt_number: z.number().int().min(1).max(99).nullable().optional(),
  profile_id: z.string().uuid().nullable().optional(),
  current_rating: z.number().min(0).max(10).optional(),
  preferred_positions: z.array(z.enum(POSITIONS)).optional(),
})

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
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  if (!Object.keys(parsed.data).length) {
    return Response.json({ error: 'No fields to update' }, { status: 400 })
  }

  const admin = createServiceClient()

  if (parsed.data.profile_id != null) {
    const { data: existing } = await admin
      .from('players')
      .select('id')
      .eq('profile_id', parsed.data.profile_id)
      .neq('id', id)
      .maybeSingle() as { data: { id: string } | null; error: unknown }

    if (existing) {
      return Response.json({ error: 'Profile already linked to another player' }, { status: 409 })
    }
  }

  let previousRating: number | null = null
  if ('current_rating' in parsed.data) {
    const { data: player } = await admin
      .from('players')
      .select('current_rating')
      .eq('id', id)
      .single() as { data: { current_rating: number | null } | null; error: unknown }
    previousRating = player?.current_rating ?? null
  }

  const { error } = await (admin.from('players') as any)
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Response.json({ error: 'Failed to update player' }, { status: 500 })

  if ('current_rating' in parsed.data) {
    await (admin.from('rating_history') as any).insert({
      player_id: id,
      rating: parsed.data.current_rating,
      previous_rating: previousRating,
      changed_by: session.userId,
      notes: 'admin override',
    })
  }

  const action =
    'current_rating' in parsed.data
      ? 'rating.override'
      : 'profile_id' in parsed.data
        ? parsed.data.profile_id != null ? 'player.linked' : 'player.unlinked'
        : 'player.updated'

  const { error: auditErr } = await admin.from('audit_log').insert({
    action,
    performed_by: session.userId,
    target_id: id,
    target_type: 'player',
    metadata: parsed.data,
  } as any)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ ok: true })
}

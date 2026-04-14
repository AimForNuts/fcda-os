import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'

const updateGameSchema = z.object({
  date: z.string().min(1).optional(),
  location: z.string().min(1).max(200).optional(),
  counts_for_stats: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = updateGameSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify game exists and is still scheduled
  const { data: existing } = await supabase
    .from('games')
    .select('id, status')
    .eq('id', id)
    .single() as { data: { id: string; status: string } | null; error: unknown }

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'scheduled') {
    return Response.json({ error: 'Only scheduled games can be edited' }, { status: 409 })
  }

  const { data: game, error } = await (supabase
    .from('games') as any)
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, date, location, counts_for_stats')
    .single() as { data: { id: string; date: string; location: string; counts_for_stats: boolean } | null; error: unknown }

  if (error || !game) {
    return Response.json({ error: 'Failed to update game' }, { status: 500 })
  }

  const admin = createServiceClient()
  const { error: auditErr } = await admin.from('audit_log').insert({
    action: 'game.updated',
    performed_by: session.userId,
    target_id: id,
    target_type: 'game',
    metadata: parsed.data,
  } as any)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json(game)
}

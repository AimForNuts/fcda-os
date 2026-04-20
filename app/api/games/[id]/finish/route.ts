import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'

const finishGameSchema = z.object({
  score_a: z.number().int().min(0),
  score_b: z.number().int().min(0),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles))
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = finishGameSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data: existing } = (await supabase
    .from('games')
    .select('id, status')
    .eq('id', id)
    .single()) as {
    data: { id: string; status: string } | null
    error: unknown
  }

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'scheduled') {
    return Response.json(
      { error: 'Only scheduled games can be finished' },
      { status: 409 },
    )
  }

  const now = new Date().toISOString()
  const { data: game, error } = (await (supabase.from('games') as any)
    .update({
      status: 'finished',
      score_a: parsed.data.score_a,
      score_b: parsed.data.score_b,
      finished_by: session.userId,
      finished_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select('id')
    .single()) as { data: { id: string } | null; error: unknown }

  if (error || !game) {
    return Response.json({ error: 'Failed to finish game' }, { status: 500 })
  }

  const admin = createServiceClient()
  const { error: auditErr } = await admin.from('audit_log').insert({
    action: 'game.finished',
    performed_by: session.userId,
    target_id: id,
    target_type: 'game',
    metadata: { score_a: parsed.data.score_a, score_b: parsed.data.score_b },
  } as any)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ id: game.id })
}

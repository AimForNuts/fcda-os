import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'

const createGameSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  location: z.string().min(1, 'Location is required').max(200),
  counts_for_stats: z.boolean().optional().default(true),
})

export async function POST(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles))
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = createGameSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data: game, error } = (await supabase
    .from('games')
    .insert({
      date: parsed.data.date,
      location: parsed.data.location,
      counts_for_stats: parsed.data.counts_for_stats,
      created_by: session.userId,
      status: 'scheduled',
    } as any)
    .select('id, date, location')
    .single()) as {
    data: { id: string; date: string; location: string } | null
    error: unknown
  }

  if (error || !game) {
    return Response.json({ error: 'Failed to create game' }, { status: 500 })
  }

  const admin = createServiceClient()
  const { error: auditErr } = await admin.from('audit_log').insert({
    action: 'game.created',
    performed_by: session.userId,
    target_id: game.id,
    target_type: 'game',
    metadata: { date: game.date, location: game.location },
  } as any)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ id: game.id }, { status: 201 })
}

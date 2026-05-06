import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import type { Database } from '@/types/database'

type GameInsert = Database['public']['Tables']['games']['Insert']
type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert']

const createGameSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  location: z.string().min(1, 'Location is required').max(200),
  recinto_id: z.string().uuid().nullable().optional(),
  counts_for_stats: z.boolean().optional().default(true),
})

export async function POST(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = createGameSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const supabase = await createClient()
  const insertPayload = {
    date: parsed.data.date,
    location: parsed.data.location,
    recinto_id: parsed.data.recinto_id ?? null,
    counts_for_stats: parsed.data.counts_for_stats,
    created_by: session.userId,
    status: 'scheduled',
  } satisfies GameInsert

  const { data: game, error } = await supabase
    .from('games')
    .insert(insertPayload)
    .select('id, date, location, recinto_id')
    .single() as { data: { id: string; date: string; location: string; recinto_id: string | null } | null; error: unknown }

  if (error || !game) {
    return Response.json({ error: 'Failed to create game' }, { status: 500 })
  }

  if (game.recinto_id) {
    const { error: recintoErr } = await supabase
      .from('recintos')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', game.recinto_id)
    if (recintoErr) console.error('recinto last_used_at update failed', recintoErr)
  }

  const admin = createServiceClient()
  const auditRow = {
    action: 'game.created',
    performed_by: session.userId,
    target_id: game.id,
    target_type: 'game',
    metadata: { date: game.date, location: game.location, recinto_id: game.recinto_id },
  } satisfies AuditLogInsert

  const { error: auditErr } = await admin.from('audit_log').insert(auditRow)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ id: game.id }, { status: 201 })
}

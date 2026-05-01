import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin, canAccessMod } from '@/lib/auth/permissions'
import type { Database } from '@/types/database'

const updateGameSchema = z.object({
  date: z.string().min(1).optional(),
  location: z.string().min(1).max(200).optional(),
  counts_for_stats: z.boolean().optional(),
})

type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert']
type GameUpdate = Database['public']['Tables']['games']['Update']
type GameUpdateResult = {
  id: string
  date: string
  location: string
  counts_for_stats: boolean
}
type UpdateGameQuery = {
  update(values: GameUpdate): {
    eq(column: string, value: string): {
      select(columns: string): {
        single(): PromiseLike<{ data: GameUpdateResult | null; error: unknown }>
      }
    }
  }
}
type InsertOnly<TInput> = {
  insert(values: TInput): PromiseLike<{ error: unknown }>
}

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

  const updatePayload = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  } satisfies GameUpdate

  const { data: game, error } = await (supabase
    .from('games') as unknown as UpdateGameQuery)
    .update(updatePayload)
    .eq('id', id)
    .select('id, date, location, counts_for_stats')
    .single()

  if (error || !game) {
    return Response.json({ error: 'Failed to update game' }, { status: 500 })
  }

  const admin = createServiceClient()
  const auditRow = {
    action: 'game.updated',
    performed_by: session.userId,
    target_id: id,
    target_type: 'game',
    metadata: parsed.data,
  } satisfies AuditLogInsert

  const auditLog = admin.from('audit_log') as unknown as InsertOnly<AuditLogInsert>
  const { error: auditErr } = await auditLog.insert(auditRow)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json(game)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('games')
    .select('id, date, location, status')
    .eq('id', id)
    .single() as {
      data: { id: string; date: string; location: string; status: string } | null
      error: unknown
    }

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'scheduled') {
    return Response.json({ error: 'Only games in Agendado state can be deleted' }, { status: 409 })
  }

  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('game delete failed', error)
    return Response.json({ error: 'Failed to delete game' }, { status: 500 })
  }

  const admin = createServiceClient()
  const auditRow = {
    action: 'game.deleted',
    performed_by: session.userId,
    target_id: id,
    target_type: 'game',
    metadata: {
      date: existing.date,
      location: existing.location,
      status: existing.status,
    },
  } satisfies AuditLogInsert

  const auditLog = admin.from('audit_log') as unknown as InsertOnly<AuditLogInsert>
  const { error: auditErr } = await auditLog.insert(auditRow)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ ok: true })
}

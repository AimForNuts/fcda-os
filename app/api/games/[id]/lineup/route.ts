import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'

const saveLineupSchema = z.object({
  players: z.array(
    z.object({
      player_id: z.string().uuid(),
      team: z.enum(['a', 'b']).nullable().optional(),
    })
  ),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: gameId } = await params

  const body = await request.json().catch(() => null)
  const parsed = saveLineupSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify game exists
  const { data: game } = await supabase
    .from('games')
    .select('id, status')
    .eq('id', gameId)
    .single() as { data: { id: string; status: string } | null; error: unknown }

  if (!game) return Response.json({ error: 'Not found' }, { status: 404 })

  if (game.status !== 'scheduled') {
    return Response.json({ error: 'Cannot edit lineup of a non-scheduled game' }, { status: 409 })
  }

  // Replace lineup: delete all existing, then insert new
  const { error: deleteErr } = await supabase
    .from('game_players')
    .delete()
    .eq('game_id', gameId)

  if (deleteErr) return Response.json({ error: 'Failed to clear lineup' }, { status: 500 })

  if (parsed.data.players.length > 0) {
    const rows = parsed.data.players.map((p) => ({
      game_id: gameId,
      player_id: p.player_id,
      team: p.team ?? null,
    }))

    const { error: insertErr } = await supabase.from('game_players').insert(rows as any)

    if (insertErr) return Response.json({ error: 'Failed to save lineup' }, { status: 500 })
  }

  const admin = createServiceClient()
  const { error: auditErr } = await admin.from('audit_log').insert({
    action: 'game.lineup_saved',
    performed_by: session.userId,
    target_id: gameId,
    target_type: 'game',
    metadata: { player_count: parsed.data.players.length },
  } as any)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ ok: true })
}

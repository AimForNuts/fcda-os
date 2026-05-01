import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import { validateLineupCaptains } from '@/lib/games/lineup'

const saveLineupSchema = z.object({
  players: z.array(
    z.object({
      player_id: z.string().uuid(),
      team: z.enum(['a', 'b']).nullable().optional(),
      is_captain: z.boolean().optional(),
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
  const captainValidation = validateLineupCaptains(parsed.data.players)
  if (!captainValidation.ok) {
    return Response.json({ error: captainValidation.error }, { status: 422 })
  }

  const supabase = await createClient()
  const admin = createServiceClient()

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

  if (parsed.data.players.length > 0) {
    const rows = parsed.data.players.map((p) => ({
      game_id: gameId,
      player_id: p.player_id,
      team: p.team ?? null,
      is_captain: p.is_captain ?? false,
    }))

    const { error: upsertErr } = await admin
      .from('game_players')
      .upsert(rows as unknown as never[], { onConflict: 'game_id,player_id' })

    if (upsertErr) {
      console.error('game_players upsert failed', upsertErr)
      return Response.json({ error: 'Failed to save lineup' }, { status: 500 })
    }

    const playerIds = parsed.data.players.map((p) => p.player_id)
    const { error: deleteOmittedErr } = await admin
      .from('game_players')
      .delete()
      .eq('game_id', gameId)
      .not('player_id', 'in', `(${playerIds.join(',')})`)

    if (deleteOmittedErr) {
      console.error('game_players delete omitted failed', deleteOmittedErr)
      return Response.json({ error: 'Lineup saved, but failed to remove omitted players' }, { status: 500 })
    }
  } else {
    const { error: deleteErr } = await admin
      .from('game_players')
      .delete()
      .eq('game_id', gameId)

    if (deleteErr) {
      console.error('game_players clear failed', deleteErr)
      return Response.json({ error: 'Failed to clear lineup' }, { status: 500 })
    }
  }

  const auditRow = {
    action: 'game.lineup_saved',
    performed_by: session.userId,
    target_id: gameId,
    target_type: 'game',
    metadata: { player_count: parsed.data.players.length, captain_counts: captainValidation.captainCounts },
  }
  const { error: auditErr } = await admin.from('audit_log').insert(auditRow as unknown as never)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ ok: true })
}

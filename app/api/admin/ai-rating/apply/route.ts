import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'

const schema = z.object({
  updates: z.array(
    z.object({
      player_id: z.string().uuid(),
      new_rating: z.number().min(0).max(10),
    })
  ).min(1),
})

export async function POST(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { updates } = parsed.data
  const admin = createServiceClient()
  const now = new Date().toISOString()

  for (const update of updates) {
    const { data: player } = await admin
      .from('players')
      .select('current_rating')
      .eq('id', update.player_id)
      .single() as { data: { current_rating: number | null } | null; error: unknown }

    const { error: playerErr } = await (admin.from('players') as any)
      .update({ current_rating: update.new_rating, updated_at: now })
      .eq('id', update.player_id)
    if (playerErr) return Response.json({ error: 'Failed to update player rating' }, { status: 500 })

    const { error: submissionsErr } = await (admin.from('rating_submissions') as any)
      .update({ status: 'processed' })
      .eq('rated_player_id', update.player_id)
      .eq('status', 'approved')
    if (submissionsErr) console.error('Failed to mark submissions processed', submissionsErr)

    const { error: historyErr } = await admin.from('rating_history').insert({
      player_id: update.player_id,
      rating: update.new_rating,
      previous_rating: player?.current_rating ?? null,
      changed_by: session.userId,
      notes: 'AI rating update',
    } as any)
    if (historyErr) console.error('Failed to insert rating_history', historyErr)
  }

  return Response.json({ ok: true })
}

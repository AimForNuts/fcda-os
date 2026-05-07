import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'

const schema = z.object({
  game_id: z.string().uuid(),
  rating: z.number().min(0).max(10),
  feedback: z.string().max(300).nullable().optional(),
})

type RatingSubmissionInsert = {
  game_id: string
  submitted_by: string
  rated_player_id: string
  rating: number
  status: 'pending'
  reviewed_by: null
  reviewed_at: null
  feedback: string | null
}

type AuditLogInsert = {
  action: string
  performed_by: string
  target_id: string | null
  target_type: string
  metadata: Record<string, unknown>
}

type InsertSelectSingle<TInput, TOutput> = {
  insert(values: TInput): {
    select(columns: string): {
      single(): Promise<{ data: TOutput | null; error: unknown }>
    }
  }
}

type InsertOnly<TInput> = {
  insert(values: TInput): PromiseLike<{ error: unknown }>
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: playerId } = await params
  const admin = createServiceClient()
  const { data: participation } = await admin
    .from('game_players')
    .select('game_id')
    .eq('player_id', playerId) as {
      data: Array<{ game_id: string }> | null
      error: unknown
    }

  const gameIds = [...new Set((participation ?? []).map((gp) => gp.game_id))]
  if (gameIds.length === 0) {
    return Response.json({ games: [] })
  }

  const { data: games } = await admin
    .from('games')
    .select('id, date, location')
    .in('id', gameIds)
    .eq('status', 'finished')
    .eq('counts_for_stats', true)
    .order('date', { ascending: false }) as {
      data: Array<{ id: string; date: string; location: string }> | null
      error: unknown
    }

  return Response.json({ games: games ?? [] })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: playerId } = await params
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const admin = createServiceClient()
  const { game_id: gameId, rating, feedback } = parsed.data

  const { data: player } = await admin
    .from('players')
    .select('id')
    .eq('id', playerId)
    .single() as { data: { id: string } | null; error: unknown }

  if (!player) return Response.json({ error: 'Player not found' }, { status: 404 })

  const { data: game } = await admin
    .from('games')
    .select('id, status, counts_for_stats')
    .eq('id', gameId)
    .single() as {
      data: { id: string; status: string; counts_for_stats: boolean } | null
      error: unknown
    }

  if (!game) return Response.json({ error: 'Game not found' }, { status: 404 })
  if (game.status !== 'finished' || !game.counts_for_stats) {
    return Response.json({ error: 'Game not eligible for ratings' }, { status: 422 })
  }

  const { data: lineupPlayer } = await admin
    .from('game_players')
    .select('player_id')
    .eq('game_id', gameId)
    .eq('player_id', playerId)
    .single() as { data: { player_id: string } | null; error: unknown }

  if (!lineupPlayer) return Response.json({ error: 'Rated player not in lineup' }, { status: 422 })

  const normalizedRating = Math.round(rating * 100) / 100
  const normalizedFeedback = feedback?.trim() || null

  const { data: existing } = await admin
    .from('rating_submissions')
    .select('id, status')
    .eq('game_id', gameId)
    .eq('submitted_by', session.userId)
    .eq('rated_player_id', playerId)
    .maybeSingle() as {
      data: { id: string; status: string } | null
      error: unknown
    }

  if (existing && existing.status !== 'pending') {
    return Response.json({ error: 'Existing submission has already been reviewed' }, { status: 409 })
  }

  if (existing) {
    const { error } = await admin
      .from('rating_submissions')
      .delete()
      .eq('id', existing.id)
      .eq('status', 'pending')

    if (error) return Response.json({ error: 'Failed to replace pending feedback' }, { status: 500 })
  }

  const ratingSubmissions = admin
    .from('rating_submissions') as unknown as InsertSelectSingle<RatingSubmissionInsert, { id: string }>

  const { data: inserted, error: insertError } = await ratingSubmissions
    .insert({
      game_id: gameId,
      submitted_by: session.userId,
      rated_player_id: playerId,
      rating: normalizedRating,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      feedback: normalizedFeedback,
    })
    .select('id')
    .single()

  if (insertError) return Response.json({ error: 'Failed to submit feedback' }, { status: 500 })

  const auditLog = admin.from('audit_log') as unknown as InsertOnly<AuditLogInsert>
  const { error: auditErr } = await auditLog.insert({
    action: existing ? 'rating.admin_feedback_updated' : 'rating.admin_feedback_created',
    performed_by: session.userId,
    target_id: inserted?.id ?? null,
    target_type: 'rating_submission',
    metadata: { gameId, playerId },
  })
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ ok: true })
}

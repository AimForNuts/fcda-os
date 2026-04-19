import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'

const POSITIONS = ['GK', 'CB', 'CM', 'W', 'ST'] as const

const schema = z.object({
  sheet_name: z.string().min(1).max(100),
  shirt_number: z.number().int().min(1).max(99).nullable().optional(),
  preferred_positions: z.array(z.enum(POSITIONS)).max(5).optional(),
})

export async function PATCH(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createServiceClient()

  const { data: player } = await admin
    .from('players')
    .select('id')
    .eq('profile_id', session.userId)
    .single() as { data: { id: string } | null; error: unknown }

  if (!player) return Response.json({ error: 'No linked player' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const updates: Record<string, unknown> = {
    sheet_name: parsed.data.sheet_name,
  }
  if ('shirt_number' in parsed.data) updates.shirt_number = parsed.data.shirt_number ?? null
  if ('preferred_positions' in parsed.data) updates.preferred_positions = parsed.data.preferred_positions

  const { error } = await (admin.from('players') as any)
    .update(updates)
    .eq('id', player.id)

  if (error) return Response.json({ error: 'Failed to update' }, { status: 500 })

  return Response.json({ ok: true })
}

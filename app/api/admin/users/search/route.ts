import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'

export async function GET(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (!q) return Response.json([])

  const admin = createServiceClient()

  // Find profiles matching the query
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name')
    .ilike('display_name', `%${q}%`)
    .order('display_name')
    .limit(20) as { data: Array<{ id: string; display_name: string }> | null; error: unknown }

  if (!profiles?.length) return Response.json([])

  // Filter out profiles already linked to a player
  const profileIds = profiles.map((p) => p.id)
  const { data: linked } = await admin
    .from('players')
    .select('profile_id')
    .in('profile_id', profileIds) as { data: Array<{ profile_id: string }> | null; error: unknown }

  const linkedIds = new Set((linked ?? []).map((p) => p.profile_id))
  return Response.json(profiles.filter((p) => !linkedIds.has(p.id)))
}

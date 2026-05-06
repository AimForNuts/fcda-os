import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import { createClient } from '@/lib/supabase/server'
import type { Recinto } from '@/types'

export async function GET() {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recintos')
    .select('*')
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(15) as { data: Recinto[] | null; error: unknown }

  if (error) return Response.json({ error: 'Failed to fetch recintos' }, { status: 500 })

  return Response.json({ recintos: data ?? [] })
}

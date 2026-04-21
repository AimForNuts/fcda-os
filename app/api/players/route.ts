import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { normaliseAlias } from '@/lib/whatsapp/parser'
import type { Database } from '@/types/database'

const createPlayerSchema = z.object({
  sheet_name: z.string().min(1, 'Name is required').max(100),
  // raw name used for alias creation (defaults to sheet_name if omitted)
  alias_display: z.string().optional(),
})

export async function GET(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (!q) return Response.json([])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('id, sheet_name, shirt_number, avatar_path')
    .ilike('sheet_name', `%${q}%`)
    .order('sheet_name')
    .limit(20) as {
      data: Array<{
        id: string
        sheet_name: string
        shirt_number: number | null
        avatar_path: string | null
      }> | null
      error: unknown
    }

  if (error) return Response.json({ error: 'Search failed' }, { status: 500 })

  return Response.json(await signPlayerAvatarRecords(data ?? [], session.profile.approved))
}

export async function POST(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = createPlayerSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const supabase = await createClient()

  const playerInsert: Database['public']['Tables']['players']['Insert'] = {
    sheet_name: parsed.data.sheet_name,
  }
  const { data: player, error: playerErr } = await supabase.from('players')
    .insert(playerInsert)
    .select('id, sheet_name')
    .single() as { data: { id: string; sheet_name: string } | null; error: unknown }

  if (playerErr || !player) {
    return Response.json({ error: 'Failed to create player' }, { status: 500 })
  }

  // Create an alias so future parses can auto-match this name
  const aliasDisplay = parsed.data.alias_display ?? parsed.data.sheet_name
  const aliasInsert: Database['public']['Tables']['player_aliases']['Insert'] = {
    player_id: player.id,
    alias: normaliseAlias(aliasDisplay),
    alias_display: aliasDisplay,
  }
  await supabase.from('player_aliases').insert(aliasInsert)

  const admin = createServiceClient()
  const auditEntry: Database['public']['Tables']['audit_log']['Insert'] = {
    action: 'player.created_guest',
    performed_by: session.userId,
    target_id: player.id,
    target_type: 'player',
    metadata: { sheet_name: player.sheet_name },
  }
  const { error: auditErr } = await admin.from('audit_log').insert(auditEntry)
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json({ id: player.id, sheet_name: player.sheet_name }, { status: 201 })
}
